import { _decorator, Component, EntityNode } from '@dao3fun/component';
import { EventBus } from '../../../core/events/EventBus';
import { ItemManager } from '../../mgr/ItemManager';
import type { IInventoryItem } from '@shares/item/IItem';
import { Logger } from '../../../core/utils/Logger';
import { CommunicationMgr } from '../../../presentation/CommunicationGateway';
import { Drop } from '../drop/Drop';

const { apclass } = _decorator;

/**
 * InventoryController - 背包控制器
 * 负责管理玩家的物品背包，最多持有3个物品
 */
@apclass('InventoryController')
export class InventoryController extends Component<GameEntity> {
  /** 玩家ID */
  private userId: string | null = null;

  /** 背包物品列表（最多3个） */
  private inventory: (IInventoryItem | null)[] = [null, null, null];

  /** 最大背包容量 */
  private readonly MAX_INVENTORY_SIZE = 3;

  /** 当前选中的槽位编号 */
  private selectedSlot: number | null = null;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 事件总线 */
  private eventBus: EventBus = EventBus.instance;

  /** 物品管理器 */
  private itemManager: ItemManager = ItemManager.instance;

  /** 通信管理器 */
  private communicationMgr: CommunicationMgr = CommunicationMgr.instance;

  /**
   * 组件启动时调用
   */
  start() {
    Logger.log('[InventoryController] Component started');
  }

  /**
   * 初始化背包控制器
   * @param userId 玩家ID（可选，从实体获取）
   */
  public initialize(userId?: string): void {
    const { player } = this.node.entity;
    if (!player) {
      Logger.warn('[InventoryController] Player not found on entity');
      return;
    }

    // 从 entity 获取 userId
    const actualUserId = player.userId;

    if (this.initialized) {
      Logger.warn(`[InventoryController] Already initialized for player ${actualUserId}`);
      return;
    }

    // 存储 userId 用于事件监听和注销
    this.userId = actualUserId;

    // 初始化背包槽位
    this.inventory = [null, null, null];

    // 注册事件监听
    this.setupEventListeners();

    this.initialized = true;
    Logger.log(`[InventoryController] Initialized for player ${actualUserId}`);
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.userId) {return;}

    // 监听添加物品事件
    this.eventBus.on(
      `inventory:${this.userId}:add`,
      this.handleAddItem.bind(this)
    );

    // 监听移除物品事件
    this.eventBus.on(
      `inventory:${this.userId}:remove`,
      this.handleRemoveItem.bind(this)
    );

    // 监听使用物品事件
    this.eventBus.on(
      `inventory:${this.userId}:use`,
      this.handleUseItem.bind(this)
    );

    // 监听丢弃物品事件
    this.eventBus.on(
      `inventory:${this.userId}:drop`,
      this.handleDropItem.bind(this)
    );

    // 监听选中物品事件
    this.eventBus.on(
      `inventory:${this.userId}:select`,
      this.handleSelectItem.bind(this)
    );

    Logger.log(`[InventoryController] Event listeners setup for player ${this.userId}`);
  }

  /**
   * 添加物品到背包
   * @param itemId 物品ID
   * @param slot 指定槽位（可选，如果不指定则自动分配）
   * @returns 是否成功添加
   */
  public addItem(itemId: string, slot?: number): boolean {
    if (!this.initialized) {
      Logger.warn('[InventoryController] Not initialized');
      return false;
    }

    // 检查背包是否已满
    if (this.isFull() && slot === undefined) {
      Logger.warn(`[InventoryController] Inventory full for player ${this.userId}`);
      this.notifyInventoryFull();
      return false;
    }

    // 创建物品实例
    const itemInstance = this.itemManager.createItemInstance(itemId);
    if (!itemInstance) {
      Logger.error(`[InventoryController] Failed to create item instance: ${itemId}`);
      return false;
    }

    // 确定放置槽位
    let targetSlot = slot;
    if (targetSlot === undefined) {
      targetSlot = this.findEmptySlot();
      if (targetSlot === -1) {
        Logger.warn(`[InventoryController] No empty slot available`);
        return false;
      }
    }

    // 检查槽位是否有效
    if (targetSlot < 0 || targetSlot >= this.MAX_INVENTORY_SIZE) {
      Logger.error(`[InventoryController] Invalid slot: ${targetSlot}`);
      return false;
    }

    // 如果槽位已有物品，尝试堆叠或替换
    if (this.inventory[targetSlot]) {
      const existingItem = this.inventory[targetSlot];
      if (existingItem && existingItem.id === itemId && existingItem.stackable) {
        // 堆叠物品
        return this.stackItem(targetSlot, itemInstance);
      } else {
        Logger.warn(`[InventoryController] Slot ${targetSlot} is occupied`);
        return false;
      }
    }

    // 放置物品
    this.inventory[targetSlot] = itemInstance;

    Logger.log(
      `[InventoryController] Added item ${itemId} to slot ${targetSlot} for player ${this.userId}`
    );

    // 通知客户端背包更新
    this.notifyInventoryUpdate();

    return true;
  }

  /**
   * 堆叠物品
   * @param slot 槽位
   * @param _newItem 新物品实例（暂未使用，保留用于未来扩展）
   * @returns 是否成功堆叠
   */
  private stackItem(slot: number, _newItem: IInventoryItem): boolean {
    const existingItem = this.inventory[slot];
    if (!existingItem || !existingItem.stackable) {return false;}

    const maxStack = existingItem.maxStack || 99;
    const currentStack = existingItem.stackCount || 1;

    if (currentStack >= maxStack) {
      Logger.warn(`[InventoryController] Stack limit reached for item ${existingItem.id}`);
      return false;
    }

    existingItem.stackCount = currentStack + 1;

    Logger.log(
      `[InventoryController] Stacked item ${existingItem.id} in slot ${slot} (${existingItem.stackCount}/${maxStack})`
    );

    this.notifyInventoryUpdate();
    return true;
  }

  /**
   * 从背包移除物品
   * @param slot 槽位索引
   * @returns 被移除的物品实例，如果失败则返回 null
   */
  public removeItem(slot: number): IInventoryItem | null {
    if (!this.initialized) {
      Logger.warn('[InventoryController] Not initialized');
      return null;
    }

    if (slot < 0 || slot >= this.MAX_INVENTORY_SIZE) {
      Logger.error(`[InventoryController] Invalid slot: ${slot}`);
      return null;
    }

    const item = this.inventory[slot];
    if (!item) {
      Logger.warn(`[InventoryController] No item in slot ${slot}`);
      return null;
    }

    // 如果是可堆叠物品且数量 > 1，减少数量
    if (item.stackable && item.stackCount && item.stackCount > 1) {
      item.stackCount--;
      Logger.log(
        `[InventoryController] Reduced stack of ${item.id} in slot ${slot} (${item.stackCount} remaining)`
      );
      this.notifyInventoryUpdate();
      return { ...item, stackCount: 1 }; // 返回单个物品副本
    }

    // 移除物品
    this.inventory[slot] = null;

    Logger.log(`[InventoryController] Removed item ${item.id} from slot ${slot}`);

    // 如果移除的是当前选中的物品，自动取消选中
    if (this.selectedSlot === slot) {
      this.deselectItem();
    }

    // 通知客户端背包更新
    this.notifyInventoryUpdate();

    return item;
  }

  /**
   * 使用物品
   * @param slot 槽位索引
   * @returns 是否成功使用
   */
  public useItem(slot: number): boolean {
    if (!this.initialized) {
      Logger.warn('[InventoryController] Not initialized');
      return false;
    }

    if (slot < 0 || slot >= this.MAX_INVENTORY_SIZE) {
      Logger.error(`[InventoryController] Invalid slot: ${slot}`);
      return false;
    }

    const item = this.inventory[slot];
    if (!item) {
      Logger.warn(`[InventoryController] No item in slot ${slot}`);
      return false;
    }

    // 检查是否可使用
    if (item.remainingUses === 0) {
      Logger.warn(`[InventoryController] Item ${item.id} has no remaining uses`);
      return false;
    }

    Logger.log(`[InventoryController] Player ${this.userId} using item ${item.id} from slot ${slot}`);

    // 触发物品使用效果（通过事件通知其他系统）
    this.eventBus.emit(`item:used:${item.id}`, {
      userId: this.userId,
      itemId: item.id,
      instanceId: item.instanceId,
    });

    // 减少使用次数
    if (item.remainingUses !== null) {
      item.remainingUses--;
      
      // 如果使用次数耗尽，移除物品
      if (item.remainingUses <= 0) {
        this.inventory[slot] = null;
        Logger.log(`[InventoryController] Item ${item.id} consumed and removed`);
        
        // 如果移除的是当前选中的物品，自动取消选中
        if (this.selectedSlot === slot) {
          this.deselectItem();
        }
      }
    }

    // 通知客户端
    this.notifyInventoryUpdate();

    return true;
  }

  /**
   * 查找空槽位
   * @returns 空槽位索引，如果没有则返回 -1
   */
  private findEmptySlot(): number {
    for (let i = 0; i < this.MAX_INVENTORY_SIZE; i++) {
      if (this.inventory[i] === null) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 检查背包是否已满
   * @returns 是否已满
   */
  public isFull(): boolean {
    return this.inventory.every((slot) => slot !== null);
  }

  /**
   * 获取背包中的物品数量
   * @returns 物品数量
   */
  public getItemCount(): number {
    return this.inventory.filter((slot) => slot !== null).length;
  }

  /**
   * 获取背包内容
   * @returns 背包物品数组
   */
  public getInventory(): (IInventoryItem | null)[] {
    return [...this.inventory];
  }

  /**
   * 获取指定槽位的物品
   * @param slot 槽位索引
   * @returns 物品实例，如果没有则返回 null
   */
  public getItemAtSlot(slot: number): IInventoryItem | null {
    if (slot < 0 || slot >= this.MAX_INVENTORY_SIZE) {
      return null;
    }
    return this.inventory[slot];
  }

  /**
   * 计算当前负重减速
   * @returns 总减速值（0.0-1.0）
   */
  public getTotalWeightDebuff(): number {
    let totalDebuff = 0;

    for (const item of this.inventory) {
      if (item) {
        totalDebuff += item.weightSpeedDebuff;
      }
    }

    // 限制在 0-1 之间
    return Math.min(1.0, Math.max(0, totalDebuff));
  }

  /**
   * 检查背包中是否有指定物品
   * @param itemId 物品ID
   * @returns 是否有该物品
   */
  public hasItem(itemId: string): boolean {
    return this.inventory.some((item) => item !== null && item.id === itemId);
  }

  /**
   * 根据物品ID移除物品
   * @param itemId 物品ID
   * @param count 移除数量（默认1）
   * @returns 是否成功移除
   */
  public removeItemById(itemId: string, count: number = 1): boolean {
    let remainingCount = count;

    for (let i = 0; i < this.MAX_INVENTORY_SIZE && remainingCount > 0; i++) {
      const item = this.inventory[i];
      if (item && item.id === itemId) {
        if (item.stackable && item.stackCount !== undefined && item.stackCount > 1) {
          // 如果是可堆叠物品且数量大于1
          const removeCount = Math.min(item.stackCount, remainingCount);
          item.stackCount -= removeCount;
          remainingCount -= removeCount;

          if (item.stackCount <= 0) {
            this.inventory[i] = null;
          }
        } else {
          // 不可堆叠物品或数量为1的物品
          this.inventory[i] = null;
          remainingCount--;
        }

        // 如果当前选中的槽位被移除，取消选中
        if (this.selectedSlot === i && this.inventory[i] === null) {
          this.deselectItem();
        }
      }
    }

    // 通知客户端更新
    if (remainingCount < count) {
      this.notifyInventoryUpdate();
      Logger.log(`[InventoryController] Removed ${count - remainingCount} of item ${itemId} for player ${this.userId}`);
      return true;
    }

    return false;
  }

  /**
   * 选中指定槽位的物品
   * @param slot 槽位索引
   * @returns 是否成功选中
   */
  public selectItem(slot: number): boolean {
    if (!this.initialized) {
      Logger.warn('[InventoryController] Not initialized');
      return false;
    }

    // 验证槽位有效性
    if (slot < 0 || slot >= this.MAX_INVENTORY_SIZE) {
      Logger.error(`[InventoryController] Invalid slot: ${slot}`);
      return false;
    }

    // 检查槽位是否有物品
    if (!this.inventory[slot]) {
      Logger.warn(`[InventoryController] No item in slot ${slot} to select`);
      return false;
    }

    // 如果已经选中了这个槽位，则取消选中
    if (this.selectedSlot === slot) {
      this.deselectItem();
      return true;
    }

    this.selectedSlot = slot;
    
    Logger.log(
      `[InventoryController] Selected item in slot ${slot}: ${this.inventory[slot]?.name}`
    );

    // 通知客户端选中状态更新
    this.notifyItemSelected(slot);

    return true;
  }

  /**
   * 取消选中当前物品
   */
  public deselectItem(): void {
    if (this.selectedSlot === null) {
      return;
    }

    const previousSlot = this.selectedSlot;
    this.selectedSlot = null;

    // 通知客户端取消选中
    this.notifyItemDeselected();
  }

  /**
   * 获取当前选中的物品实例
   * @returns 选中的物品实例，如果没有选中则返回 null
   */
  public get selectedInventoryItem(): IInventoryItem | null {
    if (this.selectedSlot === null) {
      return null;
    }
    return this.inventory[this.selectedSlot];
  }

  /**
   * 获取当前选中的槽位编号
   * @returns 槽位编号，如果没有选中则返回 null
   */
  public getSelectedSlot(): number | null {
    return this.selectedSlot;
  }

  /**
   * 通知客户端背包更新
   */
  private notifyInventoryUpdate(): void {
    const { player } = this.node.entity;
    if (!player) {
      Logger.warn('[InventoryController] Cannot notify inventory update: player not found');
      return;
    }

    const userId = player.userId;
    const playerEntity = this.node.entity as GamePlayerEntity;

    // 通过 CommunicationMgr 发送到客户端（使用通用事件名，sendTo 已经指定了目标）
    this.communicationMgr.sendTo(
      playerEntity,
      'inventory:update',
      {
        inventory: this.getInventory(),
        itemCount: this.getItemCount(),
        weightDebuff: this.getTotalWeightDebuff(),
      }
    );

  }

  /**
   * 通知客户端背包已满
   */
  private notifyInventoryFull(): void {
    const { player } = this.node.entity;
    if (!player) {return;}

    const userId = player.userId;

    this.communicationMgr.sendTo(
      this.node.entity as GamePlayerEntity,
      'inventory:full',
      {}
    );

  }

  /**
   * 通知客户端物品被选中
   * @param slot 被选中的槽位
   */
  private notifyItemSelected(slot: number): void {
    const { player } = this.node.entity;
    if (!player) {return;}

    const userId = player.userId;
    const item = this.inventory[slot];

    // 通知当前玩家物品被选中
    this.communicationMgr.sendTo(
      this.node.entity as GamePlayerEntity,
      'inventory:item:selected',
      {
        slot,
        item: item,
      }
    );

    // 广播到所有客户端以更新 ingameProfiles 的 carryingItem
    const itemImageUrl = item ? item.iconUrl : null;
    this.communicationMgr.sendBroad('ingame:item:update', {
      userId: userId,
      itemImageUrl: itemImageUrl,
    });

    Logger.log(
      `[InventoryController] Broadcast item selection for ${userId}: ${itemImageUrl || 'none'}`
    );
  }

  /**
   * 通知客户端物品被取消选中
   */
  private notifyItemDeselected(): void {
    const { player } = this.node.entity;
    if (!player) {return;}

    const userId = player.userId;

    // 通知当前玩家物品被取消选中
    this.communicationMgr.sendTo(
      this.node.entity as GamePlayerEntity,
      'inventory:item:deselected',
      {}
    );

    // 广播到所有客户端以清除 ingameProfiles 的 carryingItem
    this.communicationMgr.sendBroad('ingame:item:update', {
      userId: userId,
      itemImageUrl: null,
    });

    Logger.log(
      `[InventoryController] Broadcast item deselection for ${userId}`
    );
  }

  /* =========================
   * 事件处理方法
   * ========================= */

  /**
   * 处理添加物品事件
   */
  private handleAddItem(data?: { itemId: string; slot?: number }): void {
    if (!data) {return;}
    this.addItem(data.itemId, data.slot);
  }

  /**
   * 处理移除物品事件
   */
  private handleRemoveItem(data?: { slot: number }): void {
    if (!data) {return;}
    this.removeItem(data.slot);
  }

  /**
   * 处理使用物品事件
   */
  private handleUseItem(data?: { slot: number }): void {
    if (!data) {return;}
    this.useItem(data.slot);
  }

  /**
   * 处理丢弃物品事件
   */
  private handleDropItem(data?: { slot: number }): void {
    if (!data) {return;}

    const item = this.removeItem(data.slot);
    if (item) {
      
      // 在玩家前方生成掉落物实体
      this.spawnDroppedItem(item);
    }
  }

  /**
   * 在玩家前方生成掉落物实体
   * @param item 掉落的物品数据
   */
  private spawnDroppedItem(item: IInventoryItem): void {
    try {
      const playerEntity = this.node.entity;
      if (!playerEntity || !playerEntity.player) {
        Logger.error('[InventoryController] Cannot spawn dropped item: invalid player entity');
        return;
      }

      // 获取玩家位置
      const playerPos = playerEntity.position;
      
      // 在玩家脚底前方随机位置丢弃物品
      const offsetDistance = 1.5; // 前方 1.5 格距离
      const randomAngle = Math.random() * Math.PI * 2; // 随机角度
      
      const dropX = playerPos.x + Math.cos(randomAngle) * offsetDistance;
      const dropY = playerPos.y; // 保持在脚底高度
      const dropZ = playerPos.z + Math.sin(randomAngle) * offsetDistance;

      // 创建掉落物实体
      const droppedEntity = world.createEntity({
        position: new GameVector3(dropX, dropY, dropZ),
        mesh: 'mesh/dropMesh.vb' as GameModelAssets, // 使用默认方块模型，后续可自定义
        meshScale: new GameVector3(0.02, 0.02, 0.02),
        meshColor: new GameRGBAColor(1, 0.8, 0.2, 1), // 金黄色
        collides: false, // 不开启碰撞
        fixed: true, // 固定在地面
        gravity: false, // 不受重力影响
        enableInteract: true, // 开启交互
        interactRadius: 3,
        tags: ['dropped_item', `item_${item.id}`],
      });

      Logger.log(
        `[InventoryController] Dropped item entity created at (${dropX.toFixed(2)}, ${dropY.toFixed(2)}, ${dropZ.toFixed(2)})`
      );

      // 动态导入并添加 Drop 组件
      this.addDropComponentToEntity(droppedEntity as GameEntity, item);

      // 触发全局掉落事件（供其他系统监听）
      this.eventBus.emit(`item:dropped`, {
        userId: this.userId,
        itemId: item.id,
        instanceId: item.instanceId,
        position: new GameVector3(dropX, dropY, dropZ),
        entityId: droppedEntity?.id ?? '',
      });
    } catch (error) {
      Logger.error('[InventoryController] Error spawning dropped item:', error);
    }
  }

  /**
   * 为掉落物实体添加 Drop 组件
   * @param entity 掉落物实体
   * @param item 物品数据
   */
  private addDropComponentToEntity(entity: GameEntity | null, item: IInventoryItem): void {
    if (!entity) {
      Logger.error('[InventoryController] Cannot add Drop component: entity is null');
      return;
    }

    try {
      // 创建 EntityNode 包装器
      const entityNode = new EntityNode(entity);

      // 添加 Drop 组件
      entityNode.addComponent(Drop);

      // 获取并初始化组件
      const dropComponent = entityNode.getComponent(Drop);
      if (dropComponent) {
        dropComponent.initialize(item);
        Logger.log(`[InventoryController] Drop component added and initialized for item: ${item.name}`);
      } else {
        Logger.error('[InventoryController] Failed to initialize Drop component');
      }
    } catch (error) {
      Logger.error('[InventoryController] Error adding Drop component:', error);
    }
  }

  /**
   * 处理选中物品事件
   */
  private handleSelectItem(data?: { slot: number }): void {
    if (!data) {return;}
    this.selectItem(data.slot);
  }

  /**
   * 清空背包
   */
  public clearInventory(): void {
    this.inventory = [null, null, null];
    
    // 清空背包时取消选中
    if (this.selectedSlot !== null) {
      this.deselectItem();
    }
    
    Logger.log(`[InventoryController] Inventory cleared for player ${this.userId}`);
    this.notifyInventoryUpdate();
  }

  /**
   * 组件销毁时清理
   */
  onDestroy() {
    if (!this.userId) {return;}

    // 移除事件监听
    this.eventBus.off(`inventory:${this.userId}:add`);
    this.eventBus.off(`inventory:${this.userId}:remove`);
    this.eventBus.off(`inventory:${this.userId}:use`);
    this.eventBus.off(`inventory:${this.userId}:drop`);
    this.eventBus.off(`inventory:${this.userId}:select`);

    Logger.log(`[InventoryController] Destroyed for player ${this.userId}`);
  }
}

