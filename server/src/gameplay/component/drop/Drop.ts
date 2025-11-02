import { _decorator, Component } from '@dao3fun/component';
import { PlayerManager } from '../../mgr/PlayerManager';
import { CharacterManager } from '../../mgr/CharacterManager';
import { DeathController } from '../player/DeathController';
import type { IInventoryItem } from '@shares/item/IItem';
import { Logger } from '../../../core/utils/Logger';
import i18n from '@root/i18n';

const { apclass } = _decorator;

/**
 * Drop - 掉落物组件
 * 负责处理掉落物品的交互和拾取逻辑
 */
@apclass('Drop')
export class Drop extends Component<GameEntity> {
  /** 掉落的物品数据 */
  private droppedItem: IInventoryItem | null = null;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 交互监听器 */
  private interactListener: ((event: { entity: GameEntity; targetEntity: GameEntity; tick: number }) => void) | null = null;

  /**
   * 组件启动时调用
   */
  start() {
    Logger.log('[Drop] Component started');
  }

  /**
   * 初始化掉落物组件
   * @param itemData 掉落的物品数据
   */
  public initialize(itemData: IInventoryItem): void {
    if (this.initialized) {
      Logger.warn('[Drop] Already initialized');
      return;
    }

    this.droppedItem = itemData;

    // 设置交互提示
    this.setupInteraction();

    this.initialized = true;
    Logger.log(`[Drop] Initialized with item: ${itemData.name} (${itemData.instanceId})`);
  }

  /**
   * 设置交互逻辑
   */
  private setupInteraction(): void {
    if (!this.droppedItem || !this.node?.entity) {
      Logger.error('[Drop] Cannot setup interaction: missing data');
      return;
    }

    const entity = this.node.entity;

    // 启用交互
    entity.enableInteract = true;
    entity.interactRadius = 3;

    // 设置交互提示文本（使用 i18n）
    // @ts-ignore - i18n type signature is too strict
    const itemDisplayName = i18n.t(this.droppedItem.displayNameKey, { ns: 'item' }) as string;
    // @ts-ignore - i18n type signature is too strict
    entity.interactHint = i18n.t('item:pickup_hint', { itemName: itemDisplayName }) as string;

    // 设置交互颜色（绿色表示可拾取）
    entity.interactColor = new GameRGBColor(0, 1, 0);

    // 注册交互事件监听
    this.interactListener = this.handleInteract.bind(this);
    entity.onInteract(this.interactListener);

    Logger.log(`[Drop] Interaction setup complete for item: ${this.droppedItem.name}`);
  }

  /**
   * 处理玩家交互事件
   */
  private handleInteract(event: { entity: GameEntity; targetEntity: GameEntity; tick: number }): void {
    if (!this.droppedItem || !this.node?.entity) {
      Logger.error('[Drop] Cannot handle interact: missing data');
      return;
    }

    // 获取交互的玩家
    const interactingPlayer = event.entity;
    if (!interactingPlayer.player) {
      Logger.warn('[Drop] Interacting entity is not a player');
      return;
    }

    const userId = interactingPlayer.player.userId;

    // 检查玩家是否死亡或濒死
    if (DeathController.isPlayerDeadOrDying(userId)) {
      Logger.log(`[Drop] ❌ Player ${userId} is dead/dying, cannot pick up items`);
      return;
    }

    // 检查玩家是否是 Overseer
    const characterState = CharacterManager.instance.getCharacterState(userId);
    if (characterState && characterState.character.faction === 'Overseer') {
      Logger.log(`[Drop] 🎭 Overseer ${userId} interacted with dropped item, locking for 5 seconds and destroying item`);
      this.handleOverseerInteraction(userId);
      return;
    }

    Logger.log(`[Drop] Player ${userId} attempting to pick up item: ${this.droppedItem.name}`);

    // 尝试拾取物品
    this.attemptPickup(userId);
  }

  /**
   * 处理 Overseer 的特殊交互
   * @param userId Overseer 的用户ID
   */
  private handleOverseerInteraction(userId: string): void {
    // 获取玩家信息
    const playerInfo = PlayerManager.instance.getOnlinePlayer(userId);
    if (!playerInfo?.entityNode) {
      Logger.error(`[Drop] Cannot find player info for ${userId}`);
      return;
    }

    // 获取 PlayerController 组件
    const playerController = playerInfo.entityNode.getComponent('PlayerController');
    if (playerController) {
      // 锁住 Overseer 5 秒
      const typedController = playerController as unknown as {
        lockPlayer: (duration: number) => void;
      };
      
      typedController.lockPlayer(5000); // 5000ms = 5秒
      Logger.log(`[Drop] 🔒 Locked Overseer ${userId} for 5 seconds`);
    } else {
      Logger.warn(`[Drop] PlayerController not found for Overseer ${userId}`);
    }

    // 通知 Overseer
    const player = playerInfo.entity.player;
    if (player) {
      // @ts-ignore - i18n type signature is too strict
      player.directMessage((i18n as any).t('item:overseer_cannot_pickup', { ns: 'item' }) as string);
    }

    // 直接销毁掉落物
    this.destroyDroppedItem();
  }

  /**
   * 尝试拾取物品
   * @param userId 玩家ID
   */
  private attemptPickup(userId: string): void {
    if (!this.droppedItem) {
      Logger.error('[Drop] No dropped item data');
      return;
    }

    // 获取玩家信息和背包控制器
    const playerInfo = PlayerManager.instance.getOnlinePlayer(userId);
    if (!playerInfo?.entityNode) {
      Logger.error(`[Drop] Cannot find player info for ${userId}`);
      return;
    }

    const inventoryController = playerInfo.entityNode.getComponent('InventoryController');
    if (!inventoryController) {
      Logger.error(`[Drop] Player ${userId} does not have InventoryController`);
      return;
    }

    // 检查背包是否已满
    const typedController = inventoryController as unknown as {
      isFull: () => boolean;
      addItem: (itemId: string, slot?: number) => boolean;
      getInventory: () => (IInventoryItem | null)[];
    };

    if (typedController.isFull()) {
      Logger.warn(`[Drop] Player ${userId} inventory is full, cannot pick up item`);
      
      // 通知玩家背包已满
      const player = playerInfo.entity.player;
      if (player) {
        // @ts-ignore - i18n type signature is too strict
        player.directMessage(i18n.t('item:inventory_full') as string);
      }
      return;
    }

    // 检查是否可以堆叠到现有物品
    let pickedUp = false;
    const inventory = typedController.getInventory();
    
    for (let slot = 0; slot < inventory.length; slot++) {
      const existingItem = inventory[slot];
      
      // 如果找到相同物品且可堆叠
      if (existingItem && 
          existingItem.id === this.droppedItem.id && 
          existingItem.stackable && 
          existingItem.stackCount && 
          existingItem.maxStack &&
          existingItem.stackCount < existingItem.maxStack) {
        
        // 尝试添加到该槽位（会自动堆叠）
        pickedUp = typedController.addItem(this.droppedItem.id, slot);
        if (pickedUp) {
          Logger.log(`[Drop] Item stacked into slot ${slot} for player ${userId}`);
          break;
        }
      }
    }

    // 如果没有堆叠成功，尝试添加到空槽位
    if (!pickedUp) {
      pickedUp = typedController.addItem(this.droppedItem.id);
    }

    if (pickedUp) {
      Logger.log(`[Drop] Player ${userId} picked up item: ${this.droppedItem.name}`);
      
      // 通知玩家拾取成功
      const player = playerInfo.entity.player;
      if (player) {
        // @ts-ignore - i18n type signature is too strict
        const itemDisplayName = i18n.t(this.droppedItem.displayNameKey, { ns: 'item' }) as string;
        // @ts-ignore - i18n type signature is too strict
        player.directMessage(i18n.t('item:picked_up', { itemName: itemDisplayName }) as string);
      }

      // 销毁掉落物实体
      this.destroyDroppedItem();
    } else {
      Logger.error(`[Drop] Failed to add item to player ${userId} inventory`);
    }
  }

  /**
   * 销毁掉落物实体
   */
  private destroyDroppedItem(): void {
    if (!this.node?.entity) {
      Logger.error('[Drop] Cannot destroy: entity not found');
      return;
    }

    const entity = this.node.entity;

    // 移除交互监听
    if (this.interactListener) {
      // 注意：GameEventChannel 会在实体销毁时自动清理监听器
      this.interactListener = null;
    }

    Logger.log(`[Drop] Destroying dropped item entity: ${this.droppedItem?.name}`);

    // 销毁实体
    entity.destroy();
  }

  /**
   * 组件销毁时清理
   */
  onDestroy() {
    // 清理交互监听
    if (this.interactListener) {
      // 注意：GameEventChannel 会在实体销毁时自动清理监听器
      this.interactListener = null;
    }

    Logger.log('[Drop] Component destroyed');
  }
}

