import { _decorator, Component } from '@dao3fun/component';
import { EventBus } from '../../../core/events/EventBus';
import { CharacterManager } from '../../mgr/CharacterManager';
import type { SurvivorRoleBase } from '../../role/SurvivorRoleBase';
import { Logger } from '../../../core/utils/Logger';
import { PlayerController } from './PlayerController';
import { Faction } from '@shares/core/Enum';
import type { SebastianMoore, ThomasHawthorne } from '../../role';

const { apclass } = _decorator;

/**
 * RoleController - 角色控制器
 * 负责管理玩家的角色实例，处理角色相关的游戏逻辑
 *
 * 生命周期：
 * 1. start() - 组件初始化
 * 2. initialize() - 绑定角色实例和设置事件
 * 3. update() - 每帧更新
 * 4. onDestroy() - 清理资源
 */
@apclass('RoleController')
export class RoleController extends Component<GameEntity> {
  /** 角色实例 */
  private roleInstance: SurvivorRoleBase | null = null;

  /** 角色ID */
  private characterId: string | null = null;

  /** 玩家ID */
  private userId: string | null = null;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 事件总线 */
  private eventBus: EventBus = EventBus.instance;

  /** 角色管理器 */
  private charMgr: CharacterManager = CharacterManager.instance;

  /** 更新计时器（用于定时更新） */
  private updateTimer: number = 0;

  /** 药水自动检查计时器 */
  private potionCheckTimer: number = 0;

  /** 是否正在临时允许跳跃 */
  private isTemporaryJumpEnabled: boolean = false;

  /** 跳跃冷却时间（防止重复触发） */
  private jumpCooldown: number = 0;

  /** 玩家阵营 */
  private playerFaction: Faction | null = null;

  /** 玩家控制器 */
  private playerController: PlayerController | undefined;

  /**
   * 组件启动时调用
   */
  start() {
    Logger.log('[RoleController] Component started');

    // 获取 PlayerController 引用
    this.playerController = this.node.getComponent(PlayerController);

    // 设置地形碰撞监听
    this.setupVoxelContactListener();

    // 监听游戏开始事件
    this.setupGameStartListener();
  }

  /**
   * 监听游戏开始事件
   * 当收到初始化事件时，才进行角色绑定和初始化
   */
  private setupGameStartListener(): void {
    const { player } = this.node.entity;
    if (!player) {
      Logger.warn(
        '[RoleController] Player not found, cannot setup game start listener'
      );
      return;
    }

    const { userId } = player;

    // 监听针对当前玩家的角色初始化事件
    this.eventBus.on<{ userId: string; characterId: string }>(
      'ingame:role:initialize',
      (data) => {
        if (!data || data.userId !== userId) {
          return; // 只处理发给当前玩家的事件
        }

        if (this.initialized) {
          Logger.warn(
            `[RoleController] Already initialized for player ${userId}`
          );
          return;
        }

        Logger.log(
          `[RoleController] Received game start event for player ${userId}, initializing...`
        );
        this.initialize(data.userId, data.characterId);
      }
    );

    Logger.log(
      `[RoleController] Game start listener setup for player ${userId}`
    );
  }

  /**
   * 初始化角色控制器（内部方法）
   * @param userId 玩家ID
   * @param characterId 角色ID
   */
  private initialize(userId: string, characterId: string): void {
    const { player } = this.node.entity;
    if (!player) {
      Logger.warn('[RoleController] Player not found on entity');
      return;
    }

    this.userId = userId;
    this.characterId = characterId;

    // 从CharacterManager获取角色实例
    this.roleInstance = this.charMgr.getRoleInstance(characterId);
    if (!this.roleInstance) {
      Logger.error(
        `[RoleController] Failed to get role instance for ${characterId}`
      );
      return;
    }

    // 保存玩家阵营
    this.playerFaction = this.roleInstance.faction;

    Logger.log(
      `[RoleController] Initialized for player ${userId} with role ${this.roleInstance.displayName} (${this.playerFaction})`
    );

    // 注册事件监听
    this.setupEventListeners();

    // 同步角色状态到CharacterManager
    this.syncRoleStateToManager();

    this.initialized = true;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.userId) {
      return;
    }

    // 监听角色受伤事件
    this.eventBus.on(
      `role:${this.userId}:damage`,
      this.handleDamage.bind(this)
    );

    // 监听角色治疗事件
    this.eventBus.on(`role:${this.userId}:heal`, this.handleHeal.bind(this));

    // 监听搜索事件
    this.eventBus.on(
      `role:${this.userId}:search:start`,
      this.handleSearchStart.bind(this)
    );
    this.eventBus.on(
      `role:${this.userId}:search:complete`,
      this.handleSearchComplete.bind(this)
    );

    // 监听催生事件
    this.eventBus.on(
      `role:${this.userId}:incubate:start`,
      this.handleIncubateStart.bind(this)
    );
    this.eventBus.on(
      `role:${this.userId}:incubate:qte`,
      this.handleIncubateQTE.bind(this)
    );

    // 监听雕刻事件
    this.eventBus.on(`role:${this.userId}:carve`, this.handleCarve.bind(this));

    // 监听熬蜡装芯事件
    this.eventBus.on(
      `role:${this.userId}:wax`,
      this.handleWaxAndWick.bind(this)
    );

    // 监听点火事件
    this.eventBus.on(
      `role:${this.userId}:ignite`,
      this.handleIgnite.bind(this)
    );

    // 监听携带南瓜灯事件
    this.eventBus.on(
      `role:${this.userId}:carry:start`,
      this.handleCarryStart.bind(this)
    );
    this.eventBus.on(
      `role:${this.userId}:carry:stop`,
      this.handleCarryStop.bind(this)
    );

    // 监听祭坛充能事件
    this.eventBus.on(
      `role:${this.userId}:altar:charge`,
      this.handleAltarCharge.bind(this)
    );

    // 监听Buff/Debuff事件
    this.eventBus.on(
      `role:${this.userId}:buff:add`,
      this.handleAddBuff.bind(this)
    );
    this.eventBus.on(
      `role:${this.userId}:debuff:add`,
      this.handleAddDebuff.bind(this)
    );
    this.eventBus.on(
      `role:${this.userId}:debuff:clear`,
      this.handleClearDebuffs.bind(this)
    );

    // 监听药水使用事件（Sebastian专属）
    this.eventBus.on(
      `role:${this.userId}:potion:use`,
      this.handleUsePotion.bind(this)
    );

    // 监听追踪事件（Thomas专属）
    this.eventBus.on(
      `role:${this.userId}:tracking:start`,
      this.handleStartTracking.bind(this)
    );
    this.eventBus.on(
      `role:${this.userId}:tracking:stop`,
      this.handleStopTracking.bind(this)
    );

    // 监听祭坛位置更新（Lilian专属）
    this.eventBus.on(
      `role:${this.userId}:altar:position`,
      this.handleAltarPosition.bind(this)
    );

    Logger.log(
      `[RoleController] Event listeners setup for player ${this.userId}`
    );
  }

  /**
   * 同步角色状态到CharacterManager
   */
  private syncRoleStateToManager(): void {
    if (!this.roleInstance || !this.userId) {
      return;
    }

    const status = this.roleInstance.getStatus();

    // 更新CharacterManager中的状态
    this.charMgr.setMaxHP(this.userId, status.maxHP, true);

    Logger.log(
      `[RoleController] Synced role state to CharacterManager: HP ${status.maxHP}`
    );
  }

  /**
   * 每帧更新
   */
  update(deltaTime: number) {
    if (!this.initialized || !this.roleInstance || !this.userId) {
      return;
    }

    this.updateTimer += deltaTime;

    // 跳跃冷却倒计时
    if (this.jumpCooldown > 0) {
      this.jumpCooldown -= deltaTime;
    }

    // 每秒更新一次
    if (this.updateTimer >= 1.0) {
      this.updateTimer = 0;

      // 检查并应用移动速度
      this.updateMovementSpeed();

      // 检查Sebastian的药水冷却
      if (this.roleInstance.codename === 'char_survivor_04') {
        this.potionCheckTimer += 1;
        if (this.potionCheckTimer >= 10) {
          // 每10秒检查一次
          this.potionCheckTimer = 0;
          this.checkAutoPotion();
        }
      }
    }
  }

  /**
   * 更新移动速度
   */
  private updateMovementSpeed(): void {
    if (!this.roleInstance) {
      return;
    }

    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    // 获取角色计算的移动速度
    const speedMultiplier = this.roleInstance.getMoveSpeed();

    // 应用到玩家实体（基础速度 * 倍率）
    const baseWalkSpeed = this.playerController?.getBaseWalkSpeed() ?? 0; // 基础行走速度
    const baseRunSpeed = this.playerController?.getBaseRunSpeed() ?? 0; // 基础跑步速度

    player.walkSpeed = baseWalkSpeed * speedMultiplier;
    player.runSpeed = baseRunSpeed * speedMultiplier;
  }

  /**
   * 检查自动使用药水（Sebastian）
   */
  private checkAutoPotion(): void {
    if (
      !this.roleInstance ||
      this.roleInstance.codename !== 'char_survivor_04'
    ) {
      return;
    }

    const sebastian = this.roleInstance as SebastianMoore;
    if (typeof sebastian.usePotionMaster === 'function') {
      const used = sebastian.usePotionMaster();
      if (used) {
        // 通知客户端药水使用
        this.eventBus.emit(`client:${this.userId}:potion:used`, {
          remaining: sebastian.getPotionCooldownRemaining(),
        });
      }
    }
  }

  /* =========================
   * 事件处理方法
   * ========================= */

  /**
   * 处理受伤事件
   */
  private handleDamage(data?: { damage: number; damageType?: string }): void {
    if (!this.roleInstance || !this.userId || !data) {
      return;
    }

    const actualDamage = this.roleInstance.takeDamage(
      data.damage,
      data.damageType
    );

    // 同步到CharacterManager
    this.charMgr.modifyHP(this.userId, -actualDamage, data.damageType);

    Logger.log(
      `[RoleController] Player ${this.userId} took ${actualDamage} damage`
    );

    // 广播受伤事件给客户端
    this.eventBus.emit(`client:${this.userId}:damaged`, {
      damage: actualDamage,
      currentHP: this.roleInstance.getStatus().currentHP,
    });
  }

  /**
   * 处理治疗事件
   */
  private handleHeal(data?: { amount: number }): void {
    if (!this.roleInstance || !this.userId || !data) {
      return;
    }

    const actualHealed = this.roleInstance.heal(data.amount);

    // 同步到CharacterManager
    this.charMgr.modifyHP(this.userId, actualHealed, 'Heal');

    Logger.log(
      `[RoleController] Player ${this.userId} healed ${actualHealed} HP`
    );

    // 广播治疗事件给客户端
    this.eventBus.emit(`client:${this.userId}:healed`, {
      amount: actualHealed,
      currentHP: this.roleInstance.getStatus().currentHP,
    });
  }

  /**
   * 处理搜索开始
   */
  private handleSearchStart(data?: { targetNode: string }): void {
    if (!this.roleInstance || !this.userId || !data) {
      return;
    }

    const searchTime = this.roleInstance.startSearch(data.targetNode);

    Logger.log(
      `[RoleController] Player ${this.userId} started search, time: ${searchTime}s`
    );

    // 通知客户端搜索时间
    this.eventBus.emit(`client:${this.userId}:search:time`, {
      time: searchTime,
      targetNode: data.targetNode,
    });
  }

  /**
   * 处理搜索完成
   */
  private handleSearchComplete(data?: {
    itemType: 'PumpkinSeed' | 'Wax' | 'CottonThread';
  }): void {
    if (!this.roleInstance || !this.userId || !data) {
      return;
    }

    const success = this.roleInstance.completeSearch(data.itemType);

    Logger.log(
      `[RoleController] Player ${this.userId} search result: ${success ? 'Found' : 'Failed'} ${data.itemType}`
    );

    // 通知客户端搜索结果
    this.eventBus.emit(`client:${this.userId}:search:result`, {
      success,
      itemType: data.itemType,
    });
  }

  /**
   * 处理催生开始
   */
  private handleIncubateStart(data?: { coopPlayerCount?: number }): void {
    if (!this.roleInstance || !this.userId || !data) {
      return;
    }

    const incubateTime = this.roleInstance.startIncubate(
      data.coopPlayerCount || 1
    );

    Logger.log(
      `[RoleController] Player ${this.userId} started incubation, time: ${incubateTime}s`
    );

    // 通知客户端催生时间
    this.eventBus.emit(`client:${this.userId}:incubate:time`, {
      time: incubateTime,
      coopPlayerCount: data.coopPlayerCount,
    });
  }

  /**
   * 处理催生QTE
   */
  private handleIncubateQTE(): void {
    if (!this.roleInstance || !this.userId) {
      return;
    }

    const success = this.roleInstance.performQTE();

    Logger.log(
      `[RoleController] Player ${this.userId} QTE ${success ? 'SUCCESS' : 'FAILED'}`
    );

    // 通知客户端QTE结果
    this.eventBus.emit(`client:${this.userId}:incubate:qte:result`, {
      success,
    });
  }

  /**
   * 处理雕刻
   */
  private handleCarve(): void {
    if (!this.roleInstance || !this.userId) {
      return;
    }

    const success = this.roleInstance.carvePumpkin();
    const time = this.roleInstance.getCarveTime();

    Logger.log(
      `[RoleController] Player ${this.userId} carving ${success ? 'SUCCESS' : 'FAILED'}, time: ${time}s`
    );

    // 通知客户端雕刻结果
    this.eventBus.emit(`client:${this.userId}:carve:result`, {
      success,
      time,
    });
  }

  /**
   * 处理熬蜡装芯
   */
  private handleWaxAndWick(): void {
    if (!this.roleInstance || !this.userId) {
      return;
    }

    const time = this.roleInstance.waxAndWick();

    Logger.log(
      `[RoleController] Player ${this.userId} wax and wick, time: ${time}s`
    );

    // 通知客户端时间
    this.eventBus.emit(`client:${this.userId}:wax:time`, {
      time,
    });
  }

  /**
   * 处理点火
   */
  private handleIgnite(): void {
    if (!this.roleInstance || !this.userId) {
      return;
    }

    const time = this.roleInstance.igniteLantern();

    Logger.log(
      `[RoleController] Player ${this.userId} igniting lantern, time: ${time}s`
    );

    // 通知客户端点火时间
    this.eventBus.emit(`client:${this.userId}:ignite:time`, {
      time,
    });
  }

  /**
   * 处理开始携带南瓜灯
   */
  private handleCarryStart(): void {
    if (!this.roleInstance || !this.userId) {
      return;
    }

    this.roleInstance.startCarryLantern();
    const speedMult = this.roleInstance.getCarrySpeedMultiplier();

    Logger.log(
      `[RoleController] Player ${this.userId} started carrying lantern, speed: ${speedMult * 100}%`
    );

    // 更新移动速度
    this.updateMovementSpeed();

    // 通知客户端
    this.eventBus.emit(`client:${this.userId}:carry:started`, {
      speedMultiplier: speedMult,
    });
  }

  /**
   * 处理停止携带南瓜灯
   */
  private handleCarryStop(): void {
    if (!this.roleInstance || !this.userId) {
      return;
    }

    this.roleInstance.stopCarryLantern();

    Logger.log(
      `[RoleController] Player ${this.userId} stopped carrying lantern`
    );

    // 更新移动速度
    this.updateMovementSpeed();

    // 通知客户端
    this.eventBus.emit(`client:${this.userId}:carry:stopped`, {});
  }

  /**
   * 处理祭坛充能
   */
  private handleAltarCharge(): void {
    if (!this.roleInstance || !this.userId) {
      return;
    }

    const chargeValue = this.roleInstance.chargeAltar();
    const time = this.roleInstance.getAltarChargeTime();

    Logger.log(
      `[RoleController] Player ${this.userId} altar charge: ${chargeValue}%, time: ${time}s`
    );

    // 通知客户端祭坛充能结果
    this.eventBus.emit(`client:${this.userId}:altar:charged`, {
      chargeValue,
      time,
    });
  }

  /**
   * 处理添加Buff
   */
  private handleAddBuff(data?: { buffId: string; duration?: number }): void {
    if (!this.roleInstance || !this.userId || !data) {
      return;
    }

    this.roleInstance.addBuff(data.buffId, data.duration);

    Logger.log(
      `[RoleController] Player ${this.userId} buff added: ${data.buffId}`
    );
  }

  /**
   * 处理添加Debuff
   */
  private handleAddDebuff(data?: {
    debuffId: string;
    duration?: number;
  }): void {
    if (!this.roleInstance || !this.userId || !data) {
      return;
    }

    this.roleInstance.addDebuff(data.debuffId, data.duration);

    Logger.log(
      `[RoleController] Player ${this.userId} debuff added: ${data.debuffId}`
    );
  }

  /**
   * 处理清除Debuff
   */
  private handleClearDebuffs(): void {
    if (!this.roleInstance || !this.userId) {
      return;
    }

    this.roleInstance.clearAllDebuffs();

    Logger.log(`[RoleController] Player ${this.userId} all debuffs cleared`);

    // 通知客户端
    this.eventBus.emit(`client:${this.userId}:debuffs:cleared`, {});
  }

  /**
   * 处理使用药水（Sebastian）
   */
  private handleUsePotion(): void {
    if (
      !this.roleInstance ||
      this.roleInstance.codename !== 'char_survivor_04'
    ) {
      return;
    }

    const sebastian = this.roleInstance as SebastianMoore;
    if (typeof sebastian.usePotionMaster === 'function') {
      const used = sebastian.usePotionMaster();

      Logger.log(`[RoleController] Player ${this.userId} used potion: ${used}`);

      if (used) {
        // 通知客户端
        this.eventBus.emit(`client:${this.userId}:potion:used`, {
          remaining: sebastian.getPotionCooldownRemaining(),
        });
      }
    }
  }

  /**
   * 处理开始追踪（Thomas）
   */
  private handleStartTracking(): void {
    if (
      !this.roleInstance ||
      this.roleInstance.codename !== 'char_survivor_02'
    ) {
      return;
    }

    const thomas = this.roleInstance as ThomasHawthorne;
    if (typeof thomas.startTracking === 'function') {
      thomas.startTracking();

      Logger.log(`[RoleController] Player ${this.userId} started tracking`);

      // 更新移动速度
      this.updateMovementSpeed();
    }
  }

  /**
   * 处理停止追踪（Thomas）
   */
  private handleStopTracking(): void {
    if (
      !this.roleInstance ||
      this.roleInstance.codename !== 'char_survivor_02'
    ) {
      return;
    }

    const thomas = this.roleInstance as ThomasHawthorne;
    if (typeof thomas.stopTracking === 'function') {
      thomas.stopTracking();

      Logger.log(`[RoleController] Player ${this.userId} stopped tracking`);

      // 更新移动速度
      this.updateMovementSpeed();
    }
  }

  /**
   * 处理祭坛位置更新（Lilian）
   */
  private handleAltarPosition(data?: {
    playerPosition: { x: number; y: number; z: number };
    altarPosition: { x: number; y: number; z: number };
  }): void {
    if (
      !this.roleInstance ||
      this.roleInstance.codename !== 'char_survivor_03' ||
      !data
    ) {
      return;
    }

    const lilian = this.roleInstance as Record<string, unknown>;
    if (typeof lilian.setNearAltar === 'function') {
      (
        lilian.setNearAltar as (
          playerPos: GameVector3,
          altarPos: GameVector3
        ) => void
      )(data.playerPosition, data.altarPosition);

      Logger.log(
        `[RoleController] Player ${this.userId} altar position updated`
      );
    }
  }

  /**
   * 获取角色状态
   */
  public getRoleStatus() {
    if (!this.roleInstance) {
      return null;
    }
    return this.roleInstance.getStatus();
  }

  /**
   * 获取角色实例
   */
  public getRoleInstance(): SurvivorRoleBase | null {
    return this.roleInstance;
  }

  /**
   * 设置地形碰撞监听器
   */
  private setupVoxelContactListener(): void {
    const { entity } = this.node;
    if (!entity) {
      Logger.warn(
        '[RoleController] Cannot setup voxel contact listener: entity not found'
      );
      return;
    }

    // 监听实体与地形接触事件
    entity.onVoxelContact((event: GameVoxelContactEvent) => {
      this.handleVoxelContact(event);
    });

    Logger.log('[RoleController] Voxel contact listener setup complete');
  }

  /**
   * 处理地形碰撞事件
   */
  private handleVoxelContact(event: GameVoxelContactEvent): void {
    if (!this.initialized || !this.userId || this.jumpCooldown > 0) {
      return;
    }

    const { entity, voxel, x, y, z } = event;

    // 检查是否是当前玩家的实体
    if (entity !== this.node.entity) {
      return;
    }

    // 检查碰撞的方块是否为空气方块
    if (voxel === 0) {
      // 碰撞的是空气方块，忽略
      return;
    }

    // 检查方块高度：只有一格高的方块才能翻越
    // 通过检查上方方块是否为空气来判断
    const voxelAbove = voxels.getVoxel(x, y + 1, z);

    //判断如果voxel是脚底
    if (voxel === 127) {
      // 碰撞的是脚底草地，允许翻越
      return;
    }

    //如果该voxel下面不是地面grass
    const voxelBelow = voxels.getVoxel(x, y - 1, z);
    if (voxelBelow !== 127) {
      return;
    }

    if (voxelAbove !== 0) {
      // 上方不是空气，说明方块高度超过1格，不允许翻越
      Logger.log(
        `[RoleController] Player ${this.userId} contacted multi-height voxel at [${x}, ${y}, ${z}], skip jump`
      );
      return;
    }

    // 额外检查：确保再上方也是空气（确保玩家有足够空间跳跃）
    const voxelAbove2 = voxels.getVoxel(x, y + 2, z);
    if (voxelAbove2 !== 0) {
      Logger.log(
        `[RoleController] Player ${this.userId} not enough space above voxel at [${x}, ${y}, ${z}], skip jump`
      );
      return;
    }

    Logger.log(
      `[RoleController] Player ${this.userId} contacted single-height voxel at [${x}, ${y}, ${z}], enabling temporary jump`
    );

    // 临时启用跳跃
    this.enableTemporaryJump();

    // 设置跳跃冷却（防止连续触发）
    this.jumpCooldown = 1.0; // 1秒冷却
  }

  /**
   * 临时启用跳跃（翻墙）
   */
  private enableTemporaryJump(): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    // 启用跳跃
    player.enableJump = true;
    this.isTemporaryJumpEnabled = true;

    // 根据阵营设置不同的跳跃速度
    if (this.playerFaction === Faction.Overseer) {
      // Overseer 跳跃速度较慢（0.6倍），模拟翻墙
      player.jumpSpeedFactor = 0.6;
      Logger.log(
        `[RoleController] Overseer jump enabled with 0.6x speed (climbing)`
      );
    } else {
      // Survivor 正常跳跃速度
      player.jumpSpeedFactor = 1.0;
      Logger.log(`[RoleController] Survivor jump enabled with normal speed`);
    }

    // 监听跳跃完成（通过检测玩家落地）
    this.monitorJumpCompletion();
  }

  /**
   * 监听跳跃完成
   */
  private monitorJumpCompletion(): void {
    // 设置固定时间后自动禁用跳跃
    // 假设跳跃动画持续2秒
    const jumpDuration = 2000; // 2秒

    setTimeout(() => {
      if (this.isTemporaryJumpEnabled) {
        this.disableTemporaryJump();
      }
    }, jumpDuration);
  }

  /**
   * 禁用临时跳跃
   */
  private disableTemporaryJump(): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    player.enableJump = false;
    player.jumpSpeedFactor = 1.0; // 恢复默认速度因子
    this.isTemporaryJumpEnabled = false;

    Logger.log(
      `[RoleController] Temporary jump disabled for player ${this.userId}`
    );
  }

  /**
   * 组件销毁时清理
   */
  onDestroy() {
    if (!this.userId) {
      return;
    }

    // 如果还在临时跳跃状态，禁用它
    if (this.isTemporaryJumpEnabled) {
      this.disableTemporaryJump();
    }

    // 移除事件监听
    this.eventBus.off(`role:${this.userId}:damage`);
    this.eventBus.off(`role:${this.userId}:heal`);
    this.eventBus.off(`role:${this.userId}:search:start`);
    this.eventBus.off(`role:${this.userId}:search:complete`);
    this.eventBus.off(`role:${this.userId}:incubate:start`);
    this.eventBus.off(`role:${this.userId}:incubate:qte`);
    this.eventBus.off(`role:${this.userId}:carve`);
    this.eventBus.off(`role:${this.userId}:wax`);
    this.eventBus.off(`role:${this.userId}:ignite`);
    this.eventBus.off(`role:${this.userId}:carry:start`);
    this.eventBus.off(`role:${this.userId}:carry:stop`);
    this.eventBus.off(`role:${this.userId}:altar:charge`);
    this.eventBus.off(`role:${this.userId}:buff:add`);
    this.eventBus.off(`role:${this.userId}:debuff:add`);
    this.eventBus.off(`role:${this.userId}:debuff:clear`);
    this.eventBus.off(`role:${this.userId}:potion:use`);
    this.eventBus.off(`role:${this.userId}:tracking:start`);
    this.eventBus.off(`role:${this.userId}:tracking:stop`);
    this.eventBus.off(`role:${this.userId}:altar:position`);

    Logger.log(`[RoleController] Destroyed for player ${this.userId}`);
  }
}
