import { EventBus } from '../../core/events/EventBus';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import { InventoryService } from './InventoryService';
import { InventoryUI } from './InventoryUI';
import type { UiScreenInstance } from './InventoryUI';
import type {
  InventoryUpdateData,
  ItemSelectedData,
} from './events';
import {
  INVENTORY_UPDATE,
  INVENTORY_ITEM_SELECTED,
  INVENTORY_ITEM_DESELECTED,
  INVENTORY_FULL,
} from './events';

/**
 * InventoryUIController - 背包UI控制器
 * 负责协调Service、UI和服务端通信
 */
export class InventoryUIController {
  /** 背包服务 */
  private service: InventoryService;

  /** 背包UI */
  private ui: InventoryUI;

  /** 事件总线 */
  private eventBus: EventBus;

  /** 通信管理器 */
  private communicationMgr: CommunicationMgr;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 当前玩家ID（用于发送事件到服务端） */
  private currentUserId: string | null = null;

  constructor() {
    this.service = new InventoryService();
    this.ui = new InventoryUI(this.service);
    this.eventBus = EventBus.instance;
    this.communicationMgr = CommunicationMgr.instance;
  }

  /**
   * 初始化控制器
   * @param screen UI Screen 实例
   */
  public initialize(screen: UiScreenInstance): void {
    if (this.initialized) {
      console.warn('[InventoryUIController] Already initialized');
      return;
    }

    // 初始化服务
    this.service.initialize();

    // 初始化UI
    this.ui.initialize(
      screen,
      this.handleSlotClick.bind(this),
      this.handleDropClick.bind(this)
    );

    // 设置事件监听
    this.setupEventListeners();

    // 获取当前玩家ID
    this.getCurrentUserId();

    this.initialized = true;

  }

  /**
   * 获取当前玩家ID（仅用于发送消息到服务端）
   * 注意：客户端通常不直接知道自己的userId，需要从服务端获取
   */
  private getCurrentUserId(): void {

    
    // 监听服务端的用户ID设置事件
    this.eventBus.on<{ userId: string }>('client:userId:set', (data) => {
      if (data?.userId) {
        this.currentUserId = data.userId;

      }
    });
  }

  /**
   * 设置事件监听器（使用通用事件名）
   */
  private setupEventListeners(): void {
    // 监听背包更新事件
    this.eventBus.on(INVENTORY_UPDATE, this.handleInventoryUpdate.bind(this));

    // 监听物品选中事件
    this.eventBus.on(INVENTORY_ITEM_SELECTED, this.handleItemSelected.bind(this));

    // 监听物品取消选中事件
    this.eventBus.on(INVENTORY_ITEM_DESELECTED, this.handleItemDeselected.bind(this));

    // 监听背包已满事件
    this.eventBus.on(INVENTORY_FULL, this.handleInventoryFull.bind(this));

    // 监听场景模式变化事件
    this.eventBus.on<{ sceneMode: string }>('server:scenemode:changed', this.handleSceneModeChanged.bind(this));
  }

  /**
   * 处理场景模式变化
   * @param data 场景模式数据
   */
  private handleSceneModeChanged(data?: { sceneMode: string }): void {
    if (!data?.sceneMode) {
      return;
    }

    const sceneMode = data.sceneMode;
    console.log(`[InventoryUIController] Scene mode changed to: ${sceneMode}`);

    // 如果场景是 lobby 或 readiness，隐藏背包UI
    if (sceneMode === 'lobby' || sceneMode === 'readiness') {
      console.log(`[InventoryUIController] Hiding inventory UI (${sceneMode} scene)`);
      this.ui.hide();
    }
    // 如果场景是 ingame，显示背包UI
    else if (sceneMode === 'ingame') {
      console.log('[InventoryUIController] Showing inventory UI (ingame scene)');
      this.ui.show();
    }
  }

  /**
   * 处理背包更新事件
   */
  private handleInventoryUpdate(data?: InventoryUpdateData): void {
    if (!data) {
      console.warn('[InventoryUIController] Received empty inventory update data');
      return;
    }



    // 更新服务层数据
    this.service.updateInventory(data);

    // 更新UI显示
    this.ui.updateInventory(data);

    // 检查当前选中的槽位是否仍然有物品
    const selectedSlot = this.service.getSelectedSlot();
    if (selectedSlot !== null && this.service.isSlotEmpty(selectedSlot)) {
      // 如果选中的槽位已经空了，自动取消选中
      console.log('[InventoryUIController] Selected slot is now empty, deselecting');
      this.service.deselectSlot();
      this.ui.deselectSlot();
    }
  }

  /**
   * 处理物品选中事件
   */
  private handleItemSelected(data?: ItemSelectedData): void {
    if (!data) {
      console.warn('[InventoryUIController] Received empty item selected data');
      return;
    }



    // 更新服务层
    this.service.selectSlot(data.slot);

    // 更新UI
    this.ui.selectSlot(data.slot);
  }

  /**
   * 处理物品取消选中事件
   */
  private handleItemDeselected(): void {
    console.log('[InventoryUIController] Item deselected');

    // 更新服务层
    this.service.deselectSlot();

    // 更新UI
    this.ui.deselectSlot();
  }

  /**
   * 处理背包已满事件
   */
  private handleInventoryFull(): void {
    console.warn('[InventoryUIController] Inventory is full');

    // 显示UI提示
    this.ui.showInventoryFullMessage();
  }

  /**
   * 处理槽位点击
   * @param slot 槽位索引
   */
  private handleSlotClick(slot: number): void {
    console.log(`[InventoryUIController] Slot ${slot} clicked`);

    // 检查槽位是否有物品
    if (this.service.isSlotEmpty(slot)) {
      console.log('[InventoryUIController] Slot is empty, ignoring click');
      return;
    }

    // 检查是否已经选中了这个槽位
    const currentSelectedSlot = this.service.getSelectedSlot();
    if (currentSelectedSlot === slot) {
      console.log('[InventoryUIController] Slot already selected, deselecting');
      // 已选中，取消选中
      this.sendDeselectRequest();
      return;
    }

    // 发送选中请求到服务端
    this.sendSelectRequest(slot);
  }

  /**
   * 处理丢弃按钮点击
   * @param slot 槽位索引
   */
  private handleDropClick(slot: number): void {
    console.log(`[InventoryUIController] Drop button clicked for slot ${slot}`);

    // 检查槽位是否有物品
    if (this.service.isSlotEmpty(slot)) {
      console.warn('[InventoryUIController] Cannot drop from empty slot');
      return;
    }

    // 发送丢弃请求到服务端
    this.sendDropRequest(slot);
  }

  /**
   * 发送选中物品请求到服务端
   * @param slot 槽位索引
   */
  private sendSelectRequest(slot: number): void {
    if (!this.currentUserId) {
      console.warn('[InventoryUIController] No user ID, requesting from server...');
      this.requestUserId();
      return;
    }

    console.log(`[InventoryUIController] Sending select request for slot ${slot}`);

    // 发送事件到服务端
    this.communicationMgr.send(
      `inventory:${this.currentUserId}:select`,
      { slot }
    );
  }

  /**
   * 发送取消选中请求到服务端
   */
  private sendDeselectRequest(): void {
    if (!this.currentUserId) {
      console.warn('[InventoryUIController] No user ID, requesting from server...');
      this.requestUserId();
      return;
    }

    console.log('[InventoryUIController] Sending deselect request');

    // 通过选中 -1 来表示取消选中
    this.communicationMgr.send(
      `inventory:${this.currentUserId}:select`,
      { slot: -1 }
    );
  }

  /**
   * 发送丢弃物品请求到服务端
   * @param slot 槽位索引
   */
  private sendDropRequest(slot: number): void {
    if (!this.currentUserId) {
      console.warn('[InventoryUIController] No user ID, requesting from server...');
      this.requestUserId();
      return;
    }



    // 发送事件到服务端
    this.communicationMgr.send(
      `inventory:${this.currentUserId}:drop`,
      { slot }
    );
  }

  /**
   * 向服务端请求当前玩家的 userId
   */
  private requestUserId(): void {
    this.communicationMgr.send('client:request:userId', {});
  }

  /**
   * 清空控制器
   */
  public clear(): void {
    console.log('[InventoryUIController] Clearing');

    this.service.clear();
    this.ui.clear();
  }

  /**
   * 销毁控制器
   */
  dispose(): void {
    console.log('[InventoryUIController] Destroying');

    // 移除事件监听
    this.eventBus.off(INVENTORY_UPDATE);
    this.eventBus.off(INVENTORY_ITEM_SELECTED);
    this.eventBus.off(INVENTORY_ITEM_DESELECTED);
    this.eventBus.off(INVENTORY_FULL);

    this.ui.destroy();
    this.initialized = false;
  }
}

