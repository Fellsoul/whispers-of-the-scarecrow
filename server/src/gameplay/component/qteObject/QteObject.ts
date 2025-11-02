import { _decorator, Component, EntityNode } from '@dao3fun/component';
import type { IQteObject, IQteObjectState } from '@shares/gameplay/qteObject/IQteObject';
import { DEFAULT_QTE_OBJECT_CONFIG, DEFAULT_QTE_OBJECT_STATE } from '@shares/data/qteObjects';
import { CCType, ObjectiveTag } from '@shares/core/Enum';
import type { EffectBundle } from '@shares/core/General';
import { CharacterManager } from '../../mgr/CharacterManager';
import { PlayerManager } from '../../mgr/PlayerManager';
import { DeathController } from '../player/DeathController';
import { ItemManager } from '../../mgr/ItemManager';
import { InventoryController } from '../player/InventoryController';
import { PlayerController } from '../player/PlayerController';
import { Logger } from '../../../core/utils/Logger';
import { EventBus } from '../../../core/events/EventBus';
import { CommunicationMgr } from '../../../presentation/CommunicationGateway';
import i18n from '../../../../../i18n';

const { apclass } = _decorator;

/**
 * QTE 互动对象组件
 * QTE Interactive Object Component
 * 
 * 处理玩家与 QTE 对象的互动逻辑，包括：
 * - 物品需求检查
 * - 互动进度管理
 * - QTE 判定
 * - 角色能力加成
 */
@apclass('QteObject')
export class QteObject extends Component<GameEntity> {
  /** QTE 对象配置 / QTE Object Configuration */
  private config: Partial<IQteObject> = DEFAULT_QTE_OBJECT_CONFIG;
  /** 当前状态 / Current State */
  private state: Partial<IQteObjectState> = DEFAULT_QTE_OBJECT_STATE;

  /** 已放入的物品列表 / Placed Items */
  private placedItems: Set<string> = new Set();

  /** 当前互动玩家的 EntityNode / Current Interacting Player EntityNode */
  private currentPlayer: EntityNode | null = null;

  /** 互动进度 (0-1) / Interaction Progress */
  private progress: number = 0;

  /** 缓存的进度 (0-1) - 用于断点续传 / Cached Progress for Resume */
  private cachedProgress: number = 0;

  /** QTE 计数器 / QTE Counter */
  private qteCounter: number = 0;

  /** 互动计时器 / Interaction Timer */
  private interactionTimer: number | null = null;

  /** 输入监听 Token / Input Listener Token */
  private inputListenerToken: GameEventHandlerToken | null = null;

  /** QTE 触发时机 / QTE Trigger Timing */
  private qteTriggerPoints: number[] = [];

  /** 事件总线 / Event Bus */
  private eventBus: EventBus = EventBus.instance;

  /** 通信管理器 / Communication Manager */
  private communicationMgr: CommunicationMgr = CommunicationMgr.instance;

  /**
   * 初始化 QTE 对象
   * @param config QTE 对象配置
   */
  public initialize(config: Partial<IQteObject>): void {
    this.config = { ...this.config, ...config };

    // 初始化状态
    this.state = {
      objectId: config.id,
      isInteracting: false,
      interactingPlayerId: null,
      startTime: null,
      completedQteCount: 0,
      isOnCooldown: false,
      cooldownEndTime: null,
      usedCount: 0,
    };

    // 生成 QTE 触发点
    this.generateQteTriggerPoints();

    // 设置实体互动
    this.setupInteraction();

    Logger.log(`[QteObject] Initialized: ${config.name} (${config.id})`);
  }

  start(): void {
    Logger.log(`[QteObject] Component started for ${this.config?.name || 'unknown'}`);
  }

  update(deltaTime: number): void {
    // 更新冷却状态
    if (this.state.isOnCooldown && this.state.cooldownEndTime) {
      if (Date.now() >= this.state.cooldownEndTime) {
        this.state.isOnCooldown = false;
        this.state.cooldownEndTime = null;
        Logger.log(`[QteObject] ${this.config.name} cooldown ended`);
      }
    }

    // 更新互动进度
    if (this.state.isInteracting && this.currentPlayer) {
      this.updateInteractionProgress(deltaTime);
    }
  }

  /**
   * 设置实体交互
   */
  private setupInteraction(): void {
    const entity = this.node.entity;
    
    // 启用交互
    entity.enableInteract = true;
    entity.interactRadius = this.config.interactionRadius || 3;

    // 设置交互提示
    this.updateInteractHint();

    // 监听交互事件
    entity.onInteract(({ entity: playerEntity }) => {
      this.handleInteract(playerEntity);
    });

    Logger.log(`[QteObject] Interaction setup complete for ${this.config.name}`);
  }

  /**
   * 更新交互提示
   */
  private updateInteractHint(): void {
    const entity = this.node.entity;
    
    // 检查是否在冷却中
    if (this.state.isOnCooldown) {
      entity.interactHint = i18n.t('qte:hint.cooldown' as any) as string;
      return;
    }

    // 检查是否已使用（一次性）
    if (!this.config.repeatable && this.state.usedCount && this.state.usedCount > 0) {
      entity.interactHint = i18n.t('qte:hint.used' as any) as string;
      return;
    }

    // 检查物品需求
    const remainingItems = this.config.requiredItems?.filter(
      (itemId) => !this.placedItems.has(itemId)
    );

    if (remainingItems && remainingItems.length > 0) {
      // 需要放入物品
      // 先翻译每个物品名称
      const translatedItemNames = remainingItems
        .map((itemId) => {
          const item = ItemManager.instance.getItemById(itemId);
          if (item && item.displayNameKey) {
            // 翻译物品名称
            return i18n.t(item.displayNameKey as any) as string;
          }
          return itemId;
        })
        .join(', ');
      
      // 使用翻译后的物品名称生成交互提示
      entity.interactHint = i18n.t('qte:hint.place_items' as any, { items: translatedItemNames }) as string;
      
      Logger.log(`[QteObject] Updated interact hint: ${entity.interactHint}`);
    } else {
      // 可以开始互动
      const hintKey = this.config.interactionHintKey || 'qte:hint.interact';
      entity.interactHint = i18n.t(hintKey as any) as string;
      
      Logger.log(`[QteObject] Updated interact hint: ${entity.interactHint}`);
    }
  }

  /**
   * 处理玩家互动
   */
  private handleInteract(playerEntity: GamePlayerEntity): void {
    if (!playerEntity.player) {
      return;
    }

    const userId = playerEntity.player.userId;
    Logger.log(`[QteObject] Player ${userId} interacting with ${this.config.name}`);

    // 检查玩家是否死亡或濒死
    if (DeathController.isPlayerDeadOrDying(userId)) {
      Logger.log(`[QteObject] ❌ Player ${userId} is dead/dying, cannot interact with QTE objects`);
      return;
    }

    // 检查玩家角色 - Overseer 不能交互 QTE 对象
    const characterState = CharacterManager.instance.getCharacterState(userId);
    if (characterState && characterState.character.faction === 'Overseer') {
      Logger.log(`[QteObject] ⛔ Overseer ${userId} cannot interact with QTE objects`);
      return;
    }

    // 检查冷却
    if (this.state.isOnCooldown) {
      this.notifyPlayer(playerEntity, 'qte:message.cooldown');
      return;
    }

    // 检查是否已使用
    if (!this.config.repeatable && this.state.usedCount && this.state.usedCount > 0) {
      this.notifyPlayer(playerEntity, 'qte:message.used');
      return;
    }

    // 检查物品需求
    const remainingItems = this.config.requiredItems?.filter(
      (itemId) => !this.placedItems.has(itemId)
    );

    if (remainingItems && remainingItems.length > 0) {
      // 尝试放入物品
      this.tryPlaceItem(playerEntity, remainingItems);
    } else {
      // 开始互动
      this.startInteraction(playerEntity);
    }
  }

  /**
   * 尝试放入物品
   */
  private tryPlaceItem(playerEntity: GamePlayerEntity, remainingItems: string[]): void {
    const userId = playerEntity.player.userId;
    
    // 获取玩家背包
    const playerInfo = this.getPlayerEntityNode(userId);
    if (!playerInfo) {
      Logger.warn(`[QteObject] Cannot find player ${userId}`);
      return;
    }

    const inventoryController = playerInfo.getComponent(InventoryController);
    if (!inventoryController) {
      Logger.warn(`[QteObject] Player ${userId} has no inventory`);
      return;
    }

    // 检查玩家背包中是否有需要的物品
    let placedItemId: string | null = null;
    for (const itemId of remainingItems) {
      // 【优质种子支持】温室QTE：如果需要普通种子，也接受优质种子
      let itemsToCheck: string[] = [itemId];
      if (this.config.objectiveTag === ObjectiveTag.Incubate && itemId === 'item_pumpkin_seed') {
        itemsToCheck.push('item_premium_pumpkin_seed');
        Logger.log(`[QteObject] Greenhouse: Accepting both normal and premium pumpkin seeds`);
      }

      for (const checkItemId of itemsToCheck) {
        if (inventoryController.hasItem(checkItemId)) {
          // 从背包中移除物品
          const removed = inventoryController.removeItemById(checkItemId, 1);
          if (removed) {
            placedItemId = checkItemId;
            // 标记原需求物品和实际放入的物品都为已满足
            this.placedItems.add(itemId); // 标记需求已满足
            if (checkItemId !== itemId) {
              this.placedItems.add(checkItemId); // 同时记录实际放入的物品（用于后续检测）
            }
            Logger.log(`[QteObject] Player ${userId} placed item ${checkItemId} (required: ${itemId})`);
            break;
          }
        }
      }

      if (placedItemId) {
        break;
      }
    }

    if (placedItemId) {
      // 通知玩家放入成功
      const item = ItemManager.instance.getItemById(placedItemId);
      const itemName = item ? item.displayNameKey : placedItemId;
      this.notifyPlayer(playerEntity, 'qte:message.item_placed', { item: itemName });

      // 更新交互提示
      this.updateInteractHint();

      // 检查是否所有物品都已放入
      const stillRemaining = this.config.requiredItems?.filter(
        (itemId) => !this.placedItems.has(itemId)
      );
      if (stillRemaining && stillRemaining.length === 0) {
        this.notifyPlayer(playerEntity, 'qte:message.ready_to_interact', { items: stillRemaining?.join(', ') || '' });
      }
    } else {
      // 玩家没有需要的物品
      const itemList = remainingItems
        .map((itemId) => {
          const item = ItemManager.instance.getItemById(itemId);
          return item ? `{${item.displayNameKey}}` : itemId;
        })
        .join(', ');
      this.notifyPlayer(playerEntity, 'qte:message.missing_items', { items: itemList });
    }
  }

  /**
   * 开始互动
   */
  private startInteraction(playerEntity: GamePlayerEntity): void {
    const userId = playerEntity.player.userId;

    // 检查是否已经有人在互动
    if (this.state.isInteracting) {
      this.notifyPlayer(playerEntity, 'qte:message.already_interacting');
      return;
    }

    // 获取玩家 EntityNode
    const playerNode = this.getPlayerEntityNode(userId);
    if (!playerNode) {
      return;
    }

    // 锁定玩家
    const playerController = playerNode.getComponent(PlayerController);
    if (playerController) {
      playerController.lockPlayer();
      Logger.log(`[QteObject] Player ${userId} locked for interaction`);
    }

    // 设置状态
    this.state.isInteracting = true;
    this.state.interactingPlayerId = userId;
    this.state.startTime = Date.now();
    this.currentPlayer = playerNode;
    
    // 从缓存的进度开始（如果有且允许）
    const allowCache = this.config.allowProgressCache !== false; // 默认为 true
    this.progress = allowCache ? this.cachedProgress : 0;
    
    // 计算应该从哪个 QTE 触发点开始
    this.qteCounter = 0;
    for (let i = 0; i < this.qteTriggerPoints.length; i++) {
      if (this.progress >= this.qteTriggerPoints[i]) {
        this.qteCounter = i + 1;
      } else {
        break;
      }
    }

    // 计算实际互动时长（考虑角色加成）- 单位：毫秒
    const actualDurationMs = this.calculateActualDuration(userId);
    
    // 计算填充速度（每毫秒填充的百分比）
    const fillRate = 1.0 / actualDurationMs;
    
    if (allowCache && this.cachedProgress > 0) {
      Logger.log(
        `[QteObject] Interaction resumed by ${userId} from ${(this.cachedProgress * 100).toFixed(1)}%, ` +
        `duration: ${actualDurationMs}ms, fillRate: ${fillRate.toFixed(8)}/ms, QTE counter: ${this.qteCounter}`
      );
    } else {
      Logger.log(
        `[QteObject] Interaction started by ${userId}, ` +
        `duration: ${actualDurationMs}ms, fillRate: ${fillRate.toFixed(8)}/ms`
      );
    }

    // 通知客户端开始 QTE
    this.communicationMgr.sendTo(
      playerEntity,
      'qte:start',
      {
        objectId: this.config.id,
        objectName: this.config.name,
        totalDuration: actualDurationMs, // 发送毫秒为单位的时长给客户端
        fillRate: fillRate, // 填充速度（每毫秒填充的百分比）
        qteCount: this.config.qteCount || 0,
        resumeProgress: this.cachedProgress, // 发送缓存进度给客户端
      }
    );

    // 通知客户端互动开始消息
    if (this.cachedProgress > 0) {
      this.notifyPlayer(playerEntity, 'qte:message.interaction_resume');
    } else {
      this.notifyPlayer(playerEntity, 'qte:message.interaction_start');
    }

    // 启动输入监听（检测玩家是否尝试移动）
    this.startInputListener(playerEntity);
  }

  /**
   * 启动输入监听，检测玩家移动输入
   */
  private startInputListener(playerEntity: GamePlayerEntity): void {
    if (this.inputListenerToken !== null) {
      Logger.log(`[QteObject] Input listener already active`);
      return; // 已经在监听
    }

    const userId = playerEntity.player.userId;
    const objectName = this.config.name || this.config.id;
    
    Logger.log(`[QteObject] ========================================`);
    Logger.log(`[QteObject] Starting KEYBOARD listener for player ${userId} on object ${objectName}`);
    Logger.log(`[QteObject] Monitoring WASD keys (87/65/83/68) even when player is locked`);
    Logger.log(`[QteObject] Current state.isInteracting: ${this.state.isInteracting}`);
    Logger.log(`[QteObject] ========================================`);

    // 使用 player.onKeyDown 监听特定玩家的键盘按键（即使玩家被锁定也能捕获）
    this.inputListenerToken = playerEntity.player.onKeyDown((event: GameKeyBoardEvent) => {
      // 添加详细的调试日志
      Logger.log(`[QteObject:${objectName}] 🎹 KeyDown event - KeyCode: ${event.keyCode}, Tick: ${event.tick}`);
      Logger.log(`[QteObject:${objectName}] Current state - isInteracting: ${this.state.isInteracting}, targetPlayerId: ${userId}`);

      if (!this.state.isInteracting) {
        Logger.log(`[QteObject:${objectName}] Not interacting anymore, ignoring key`);
        return;
      }

      // 检查是否是 WASD 键
      // W=87, A=65, S=83, D=68
      const isWASD = event.keyCode === 87 || 
                     event.keyCode === 65 || 
                     event.keyCode === 83 || 
                     event.keyCode === 68;
      
      Logger.log(`[QteObject:${objectName}] Is WASD key: ${isWASD} (keyCode: ${event.keyCode})`);
      
      if (isWASD) {
        const keyName = event.keyCode === 87 ? 'W' :
                       event.keyCode === 65 ? 'A' :
                       event.keyCode === 83 ? 'S' : 'D';
        Logger.log(`[QteObject:${objectName}] !!!! WASD key detected (${keyName}), CANCELING QTE !!!!`);
        this.cancelInteraction();
      }
    });

    Logger.log(`[QteObject:${objectName}] Keyboard listener registered for player ${userId}`);
  }

  /**
   * 停止输入监听
   */
  private stopInputListener(): void {
    if (this.inputListenerToken !== null) {
      this.inputListenerToken.cancel();
      this.inputListenerToken = null;
      Logger.log('[QteObject] Input listener stopped');
    }
  }

  /**
   * 更新互动进度
   */
  private updateInteractionProgress(deltaTime: number): void {
    if (!this.currentPlayer) {
      return;
    }

    const userId = this.state.interactingPlayerId;
    if (!userId) {
      return;
    }

    // 计算实际互动时长（毫秒）
    const actualDurationMs = this.calculateActualDuration(userId);

    // 更新进度（deltaTime 是毫秒，actualDurationMs 也是毫秒）
    this.progress += deltaTime / actualDurationMs;

    // 限制进度范围
    const clampedProgress = Math.min(1.0, Math.max(0, this.progress));

    // 不再每帧发送进度更新到客户端，客户端会根据 fillRate 自动更新

    // 检查 QTE 触发点
    for (let i = this.qteCounter; i < this.qteTriggerPoints.length; i++) {
      if (this.progress >= this.qteTriggerPoints[i]) {
        this.triggerQte(userId);
        this.qteCounter++;
        break;
      }
    }

    // 检查是否完成
    if (this.progress >= 1.0) {
      this.completeInteraction();
    }
  }

  /**
   * 触发 QTE
   */
  private triggerQte(userId: string): void {
    Logger.log(`[QteObject] QTE triggered for player ${userId} (${this.qteCounter + 1}/${this.config.qteCount})`);

    // TODO: 发送 QTE 事件到客户端
    // 客户端需要显示 QTE UI 并返回结果
    // 这里简化处理，假设 QTE 成功
    const qteSuccess = Math.random() > (this.config.qteDifficulty || 0.5);

    if (!qteSuccess) {
      this.handleQteFail(userId);
    }
  }

  /**
   * 处理 QTE 失败
   */
  private handleQteFail(userId: string): void {
    Logger.log(`[QteObject] QTE failed for player ${userId}`);

    // 应用惩罚
    this.applyPenalty(userId);

    // 中断互动
    this.cancelInteraction();
  }

  /**
   * 应用惩罚
   */
  private applyPenalty(userId: string): void {
    const penalty = this.config.penalty;
    if (!penalty) {
      return;
    }

    const playerNode = this.getPlayerEntityNode(userId);
    if (!playerNode) {
      return;
    }

    // 应用控制效果
    if (penalty.ccType) {
      this.applyCCEffect(userId, penalty.ccType, penalty.duration);
    }

    // 应用伤害
    if (penalty.damageType && penalty.damageAmount) {
      this.applyDamage(userId, penalty.damageAmount, penalty.damageType);
    }

    // 高亮玩家
    if (penalty.highlightPlayer) {
      this.highlightPlayer(userId, penalty.highlightDuration);
    }

    // 应用额外效果
    if (penalty.effects) {
      this.applyEffects(userId, penalty.effects);
    }

    Logger.log(`[QteObject] Penalty applied to player ${userId}`);
  }

  /**
   * 完成互动
   */
  private completeInteraction(): void {
    const userId = this.state.interactingPlayerId;
    if (!userId) {
      return;
    }

    Logger.log(`[QteObject] Interaction completed by player ${userId}`);

    // 获取玩家实体
    const playerEntity = this.getPlayerEntity(userId);

    // 通知客户端 QTE 完成
    if (playerEntity) {
      this.communicationMgr.sendTo(
        playerEntity,
        'qte:complete',
        {
          objectId: this.config.id,
          success: true,
        }
      );
    }

    // 显示玩家名字 3 秒
    // Show player name tag for 3 seconds
    if (playerEntity && playerEntity.player) {
      playerEntity.player.showName = true;
      Logger.log(`[QteObject] Showing name tag for player ${userId}`);
      
      // 3 秒后隐藏名字
      // Hide name tag after 3 seconds
      setTimeout(() => {
        if (playerEntity && playerEntity.player) {
          playerEntity.player.showName = false;
          Logger.log(`[QteObject] Hiding name tag for player ${userId}`);
        }
      }, 3000);
    }

    // 停止输入监听
    this.stopInputListener();

    // 解锁玩家
    if (this.currentPlayer) {
      const playerController = this.currentPlayer.getComponent(PlayerController);
      if (playerController) {
        playerController.unlockPlayer();
      }
    }

    // 产出物品
    if (this.config.outcomeItem) {
      this.spawnOutcomeItem(userId);
    } else if (this.config.objectiveTag === ObjectiveTag.Search) {
      // 干草堆特殊逻辑：随机掉落
      this.spawnRandomSearchItem(userId);
    }

    // 触发完成事件
    if (this.config.completeEvent) {
      this.triggerCompleteEvent(userId);
    }

    // 发出噪音
    this.emitNoise();

    // 更新状态
    this.state.isInteracting = false;
    this.state.interactingPlayerId = null;
    this.state.startTime = null;
    if (this.state.usedCount) {
      this.state.usedCount++;
    }
    this.currentPlayer = null;
    this.progress = 0;
    this.cachedProgress = 0; // 完成后清除缓存进度
    this.qteCounter = 0;

    // 清空已放入的物品
    this.placedItems.clear();

    // 设置冷却
    if (this.config.repeatable && this.config.cooldown) {
      this.state.isOnCooldown = true;
      this.state.cooldownEndTime = Date.now() + this.config.cooldown * 1000;
    }

    // 更新交互提示
    this.updateInteractHint();

    // 通知玩家完成消息
    if (playerEntity) {
      this.notifyPlayer(playerEntity, 'qte:message.interaction_complete');
    }
  }

  /**
   * 取消互动
   */
  private cancelInteraction(): void {
    const userId = this.state.interactingPlayerId;
    if (!userId) {
      return;
    }

    // 保存当前进度到缓存（用于断点续传，如果允许）
    const allowCache = this.config.allowProgressCache !== false; // 默认为 true
    if (allowCache) {
      this.cachedProgress = Math.min(1.0, Math.max(0, this.progress));
      Logger.log(
        `[QteObject] Interaction canceled for player ${userId}, progress saved: ${(this.cachedProgress * 100).toFixed(1)}%`
      );
    } else {
      this.cachedProgress = 0; // 不允许缓存，清除进度
      Logger.log(
        `[QteObject] Interaction canceled for player ${userId}, progress NOT saved (caching disabled)`
      );
    }

    // 获取玩家实体
    const playerEntity = this.getPlayerEntity(userId);

    // 停止输入监听
    this.stopInputListener();

    // 通知客户端 QTE 取消
    if (playerEntity) {
      this.communicationMgr.sendTo(
        playerEntity,
        'qte:cancel',
        {
          objectId: this.config.id,
          savedProgress: this.cachedProgress, // 告知客户端保存的进度
        }
      );
    }

    // 解锁玩家
    if (this.currentPlayer) {
      const playerController = this.currentPlayer.getComponent(PlayerController);
      if (playerController) {
        playerController.unlockPlayer();
      }
    }

    // 重置互动状态（但保留 cachedProgress）
    this.state.isInteracting = false;
    this.state.interactingPlayerId = null;
    this.state.startTime = null;
    this.currentPlayer = null;
    this.progress = 0; // 重置当前进度（但 cachedProgress 保留）
    this.qteCounter = 0;

    // 通知玩家取消消息
    if (playerEntity) {
      this.notifyPlayer(playerEntity, 'qte:message.interaction_canceled');
    }
  }

  /**
   * 计算实际互动时长（考虑角色加成）
   */
  private calculateActualDuration(userId: string): number {
    let duration = this.config.baseDuration || 0;

    // 【优质种子检测】温室QTE：如果使用优质种子，减少30%时间
    if (this.config.objectiveTag === ObjectiveTag.Incubate && this.placedItems.has('item_premium_pumpkin_seed')) {
      const reduction = 0.3; // 30% 时间减免
      duration *= (1 - reduction);
      Logger.log(`[QteObject] 🌟 Premium seed detected! QTE duration reduced by ${reduction * 100}%: ${this.config.baseDuration}ms → ${duration}ms`);
    }

    // 获取角色数据
    const characterData = CharacterManager.instance.getCharacterState(userId);
    if (!characterData) {
      return duration;
    }

    // 根据 ObjectiveTag 应用角色加成（使用 userId 获取）
    const roleInstance = CharacterManager.instance.getRoleInstanceByUserId(userId);
    if (!roleInstance || !roleInstance.objectiveHooks) {
      return duration;
    }

    const hooks = roleInstance.objectiveHooks;
    const tag = this.config.objectiveTag;

    // 应用时间缩放
    switch (tag) {
      case ObjectiveTag.Search:
        if (hooks.onSearch?.searchTimeMult !== undefined) {
          duration *= 1 + hooks.onSearch.searchTimeMult;
        }
        break;
      case ObjectiveTag.Incubate:
        if (hooks.onIncubate?.incubateTimeMult !== undefined) {
          duration *= 1 + hooks.onIncubate.incubateTimeMult;
        }
        break;
      case ObjectiveTag.Carve:
        if (hooks.onCarve?.carveTimeMult !== undefined) {
          duration *= 1 + hooks.onCarve.carveTimeMult;
        }
        break;
      case ObjectiveTag.WaxAndWick:
        if (hooks.onWaxAndWick?.waxTimeMult !== undefined) {
          duration *= 1 + hooks.onWaxAndWick.waxTimeMult;
        }
        break;
      case ObjectiveTag.Ignite:
        if (hooks.onIgnite?.igniteTimeMult !== undefined) {
          duration *= 1 + hooks.onIgnite.igniteTimeMult;
        }
        break;
      case ObjectiveTag.Altar:
        if (hooks.onAltar?.altarChargeRate !== undefined) {
          duration *= 1 / (1 + hooks.onAltar.altarChargeRate);
        }
        break;
      case ObjectiveTag.Rescue:
        // 可以添加救援相关的加成
        break;
    }

    // 注释掉频繁调用的日志，已在 startInteraction 中打印详细信息
    // Logger.log(`[QteObject] Duration adjusted from ${this.config.baseDuration}ms to ${duration}ms for player ${userId}`);
    return duration;
  }

  /**
   * 生成 QTE 触发点
   */
  private generateQteTriggerPoints(): void {
    this.qteTriggerPoints = [];
    const qteCount = this.config.qteCount || 0;
    if (qteCount === 0) {
      return;
    }

    // 均匀分布 QTE 触发点
    for (let i = 0; i < qteCount; i++) {
      const point = (i + 1) / (qteCount + 1);
      this.qteTriggerPoints.push(point);
    }

    Logger.log(`[QteObject] Generated ${this.qteTriggerPoints.length} QTE trigger points:`, this.qteTriggerPoints);
  }

  /**
   * 产出物品
   */
  private spawnOutcomeItem(userId: string): void {
    if (!this.config.outcomeItem) {
      return;
    }

    const playerNode = this.getPlayerEntityNode(userId);
    if (!playerNode) {
      return;
    }

    const inventoryController = playerNode.getComponent(InventoryController);
    if (!inventoryController) {
      Logger.warn(`[QteObject] Player ${userId} has no inventory to receive outcome item`);
      return;
    }

    // 添加物品到背包
    const success = inventoryController.addItem(this.config.outcomeItem);
    if (success) {
      Logger.log(`[QteObject] Outcome item ${this.config.outcomeItem} given to player ${userId}`);
    } else {
      Logger.warn(`[QteObject] Failed to give outcome item to player ${userId} (inventory full?)`);
    }
  }

  /**
   * 干草堆随机掉落物品
   * 50% 棉线，50% 南瓜种子（种子有概率为优质）
   */
  private spawnRandomSearchItem(userId: string): void {
    const playerNode = this.getPlayerEntityNode(userId);
    if (!playerNode) {
      return;
    }

    const inventoryController = playerNode.getComponent(InventoryController);
    if (!inventoryController) {
      Logger.warn(`[QteObject] Player ${userId} has no inventory to receive search item`);
      return;
    }

    // 50% 概率掉落棉线或种子
    const dropSeed = Math.random() < 0.5;
    
    if (!dropSeed) {
      // 掉落棉线
      const success = inventoryController.addItem('item_cotton_thread');
      if (success) {
        Logger.log(`[QteObject] 🧵 Random drop: Cotton Thread given to player ${userId}`);
      }
      return;
    }

    // 掉落种子 - 检查是否为优质种子
    let premiumChance = 0.15; // 基础 15% 概率

    // 检查玩家角色的植物学家加成
    const roleInstance = CharacterManager.instance.getRoleInstanceByUserId(userId);
    if (roleInstance?.objectiveHooks?.onSearch?.premiumSeedChance) {
      premiumChance += roleInstance.objectiveHooks.onSearch.premiumSeedChance;
      Logger.log(`[QteObject] 🌱 Botanist bonus applied: +${roleInstance.objectiveHooks.onSearch.premiumSeedChance * 100}% premium seed chance`);
    }

    const isPremium = Math.random() < premiumChance;
    const seedId = isPremium ? 'item_premium_pumpkin_seed' : 'item_pumpkin_seed';

    const success = inventoryController.addItem(seedId);
    if (success) {
      Logger.log(`[QteObject] 🎃 Random drop: ${isPremium ? 'Premium' : 'Normal'} Pumpkin Seed given to player ${userId} (${(premiumChance * 100).toFixed(1)}% chance)`);
    }
  }

  /**
   * 触发完成事件
   */
  private triggerCompleteEvent(userId: string): void {
    if (!this.config.completeEvent) {
      return;
    }

    const event = this.config.completeEvent;
    Logger.log(`[QteObject] Triggering complete event: ${event.eventName}`);

    // 发送事件
    this.eventBus.emit(event.eventName, {
      objectId: this.config.id,
      userId,
      ...event.eventData,
    });
  }

  /**
   * 发出噪音
   */
  private emitNoise(): void {
    const noiseLevel = this.config.baseNoiseLevel || 0;
    if (noiseLevel === 0) {
      return;
    }

    const noiseTags = this.config.noiseTags || [];
    Logger.log(`[QteObject] Emitting noise: level=${noiseLevel}, tags=${noiseTags.join(', ')}`);

    // TODO: 实现噪音系统
    // 这里可以触发噪音事件，通知监督者
    this.eventBus.emit('noise:emitted', {
      position: this.node.entity.position,
      level: noiseLevel,
      tags: noiseTags,
      objectId: this.config.id,
    });
  }

  /**
   * 应用控制效果
   */
  private applyCCEffect(userId: string, ccType: CCType, duration: number): void {
    Logger.log(`[QteObject] Applying CC effect ${ccType} to player ${userId} for ${duration}s`);
    
    // TODO: 实现控制效果系统
    this.eventBus.emit('player:cc:apply', {
      userId,
      ccType,
      duration,
    });
  }

  /**
   * 应用伤害
   */
  private applyDamage(userId: string, amount: number, damageType: string): void {
    Logger.log(`[QteObject] Applying ${amount} ${damageType} damage to player ${userId}`);
    
    // TODO: 实现伤害系统
    this.eventBus.emit('player:damage:take', {
      userId,
      amount,
      damageType,
    });
  }

  /**
   * 高亮玩家
   */
  private highlightPlayer(userId: string, duration: number): void {
    Logger.log(`[QteObject] Highlighting player ${userId} for ${duration}s`);
    
    // TODO: 实现高亮系统（Reveal 效果）
    this.eventBus.emit('player:reveal', {
      userId,
      duration,
    });
  }

  /**
   * 应用额外效果
   */
  private applyEffects(userId: string, effects: EffectBundle): void {
    Logger.log(`[QteObject] Applying effects to player ${userId}`);
    
    // TODO: 实现效果系统
    this.eventBus.emit('player:effects:apply', {
      userId,
      effects,
    });
  }

  /**
   * 通知玩家
   */
  private notifyPlayer(playerEntity: GamePlayerEntity, messageKey: string, params?: Record<string, string>): void {
    this.communicationMgr.sendTo(playerEntity, 'qte:message', {
      key: messageKey,
      params,
    });
  }

  /**
   * 获取玩家实体
   */
  private getPlayerEntity(userId: string): GamePlayerEntity | null {
    const playerNode = this.getPlayerEntityNode(userId);
    return playerNode ? (playerNode.entity as GamePlayerEntity) : null;
  }

  /**
   * 获取玩家 EntityNode
   */
  private getPlayerEntityNode(userId: string): EntityNode | null {
    const playerInfo = PlayerManager.instance.getOnlinePlayer(userId);
    if (!playerInfo) {
      Logger.warn(`[QteObject] Player ${userId} not found in PlayerManager`);
      return null;
    }

    return playerInfo.entityNode;
  }

  /**
   * 获取当前状态
   */
  public getState(): Partial<IQteObjectState> {
    return { ...this.state };
  }

  /**
   * 获取配置
   */
  public getConfig(): Partial<IQteObject> {
    return this.config;
  }
}

