import type { IInventoryItem } from '@shares/item/IItem';
import type { InventoryUpdateData } from './events';
import { InventoryService } from './InventoryService';
import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';
import i18n from '@root/i18n';

export type UiScreenInstance = UiIndex_screen;

/**
 * 背包槽位UI引用
 */
interface InventorySlotUIRefs {
  slot: UiImage;
  item: UiImage;
  dropButton?: UiImage; // 可选，需要在编辑器中手动添加
}

/**
 * InventoryUI - 背包UI管理类
 * 负责UI元素的显示、更新和交互
 */
export class InventoryUI {
  /** 背包服务 */
  private service: InventoryService;

  /** UI Screen 实例 */
  private uiScreen: UiScreenInstance | null = null;

  /** 背包槽位UI引用数组 */
  private inventorySlots: (InventorySlotUIRefs | null)[] = [null, null, null];

  /** 是否已初始化 */
  private initialized: boolean = false;

  constructor(service: InventoryService, screen?: UiScreenInstance) {
    this.service = service;
    if (screen) {
      this.uiScreen = screen;
    }
  }

  /**
   * 初始化UI
   * @param screen UI Screen 实例
   * @param onSlotClick 槽位点击回调
   * @param onDropClick 丢弃按钮点击回调
   */
  public initialize(
    screen: UiScreenInstance,
    onSlotClick: (slot: number) => void,
    onDropClick: (slot: number) => void
  ): void {
    if (this.initialized) {
      console.warn('[InventoryUI] Already initialized');
      return;
    }

    this.uiScreen = screen;

    // 获取背包框架
    const inventoryFrame = this.uiScreen.uiBox_inventory;
    if (!inventoryFrame) {
      console.error('[InventoryUI] Cannot find inventory frame');
      return;
    }

    // 初始化时隐藏背包UI（只有在 ingame 场景时才显示）
    inventoryFrame.visible = false;
    console.log('[InventoryUI] Inventory frame initially hidden (will show in ingame scene)');

    // 初始化3个槽位
    // 槽位1
    const slot1 = this.uiScreen.uiImage_inventorySlot1;
    const item1 = this.uiScreen.uiImage_item; // inventorySlot1/item
    if (slot1 && item1) {
      const dropButton = this.findChildByName(slot1, 'dropButton') as UiImage | undefined;
      
      console.log(`[InventoryUI] Slot 0 - dropButton found:`, dropButton?.name, dropButton);
      
      this.inventorySlots[0] = {
        slot: slot1,
        item: item1,
        dropButton: dropButton,
      };

      // 初始化物品图片为隐藏
      item1.visible = false;

      // 注册槽位点击事件
      slot1.events.on('pointerdown', () => {
        console.log('[InventoryUI] Slot 0 clicked');
        onSlotClick(0);
      });

      // 如果有丢弃按钮，注册点击事件
      if (dropButton) {
        dropButton.visible = false;
        dropButton.events.on('pointerdown', () => {
          console.log('[InventoryUI] Drop button clicked for slot 0');
          onDropClick(0);
        });
      }
    }

    // 槽位2
    const slot2 = this.uiScreen.uiImage_inventorySlot2;
    const item2 = this.uiScreen.uiImage_windowDownAnchor_inventory_inventorySlot2_item;
    if (slot2 && item2) {
      const dropButton2 = this.findChildByName(slot2, 'dropButton') as UiImage | undefined;
      
      console.log(`[InventoryUI] Slot 1 - dropButton found:`, dropButton2?.name, dropButton2);
      
      this.inventorySlots[1] = {
        slot: slot2,
        item: item2,
        dropButton: dropButton2,
      };

      // 初始化物品图片为隐藏
      item2.visible = false;

      // 注册槽位点击事件
      slot2.events.on('pointerdown', () => {
        console.log('[InventoryUI] Slot 1 clicked');
        onSlotClick(1);
      });

      // 如果有丢弃按钮，注册点击事件
      if (dropButton2) {
        dropButton2.visible = false;
        dropButton2.events.on('pointerdown', () => {
          console.log('[InventoryUI] Drop button clicked for slot 1');
          onDropClick(1);
        });
      }
    }

    // 槽位3
    const slot3 = this.uiScreen.uiImage_inventorySlot3;
    const item3 = this.uiScreen.uiImage_windowDownAnchor_inventory_inventorySlot3_item;
    if (slot3 && item3) {
      const dropButton3 = this.findChildByName(slot3, 'dropButton') as UiImage | undefined;
      
      console.log(`[InventoryUI] Slot 2 - dropButton found:`, dropButton3?.name, dropButton3);
      
      this.inventorySlots[2] = {
        slot: slot3,
        item: item3,
        dropButton: dropButton3,
      };

      // 初始化物品图片为隐藏
      item3.visible = false;

      // 注册槽位点击事件
      slot3.events.on('pointerdown', () => {
        console.log('[InventoryUI] Slot 2 clicked');
        onSlotClick(2);
      });

      // 如果有丢弃按钮，注册点击事件
      if (dropButton3) {
        dropButton3.visible = false;
        dropButton3.events.on('pointerdown', () => {
          console.log('[InventoryUI] Drop button clicked for slot 2');
          onDropClick(2);
        });
      }
    }

    this.initialized = true;
    console.log('[InventoryUI] Initialized with 3 slots');
  }

  /**
   * 在UI节点中查找指定名称的子节点
   * @param parent 父节点
   * @param name 子节点名称
   * @returns 找到的子节点或undefined
   */
  private findChildByName(parent: UiNode, name: string): UiNode | undefined {
    // 递归查找子节点
    const searchChildren = (node: UiNode): UiNode | undefined => {
      if (node.name === name) {
        return node;
      }
      // 检查子节点
      for (const child of node.children) {
        const found = searchChildren(child);
        if (found) {
          return found;
        }
      }
      return undefined;
    };

    return searchChildren(parent);
  }

  /**
   * 更新背包UI显示
   * @param data 背包更新数据
   */
  public updateInventory(data: InventoryUpdateData): void {
    if (!this.initialized) {
      console.warn('[InventoryUI] Not initialized');
      return;
    }

    console.log('[InventoryUI] Updating inventory display');

    // 更新每个槽位
    for (let i = 0; i < 3; i++) {
      const item = data.inventory[i];
      this.updateSlot(i, item);
    }
  }

  /**
   * 更新单个槽位
   * @param slot 槽位索引
   * @param item 物品数据，null表示空槽位
   */
  private updateSlot(slot: number, item: IInventoryItem | null): void {
    const slotRefs = this.inventorySlots[slot];
    if (!slotRefs) {
      return;
    }

    if (item) {
      // 有物品，显示图片
      slotRefs.item.image = item.iconUrl;
      slotRefs.item.visible = true;
    } else {
      // 空槽位，隐藏图片
      slotRefs.item.visible = false;

    }

    // 更新丢弃按钮可见性（根据当前选中状态）
    this.updateDropButtonVisibility(slot);
  }

  /**
   * 选中槽位
   * @param slot 槽位索引
   */
  public selectSlot(slot: number): void {
    if (!this.initialized) {
      console.warn('[InventoryUI] Not initialized');
      return;
    }


    // 先取消所有槽位的高亮
    for (let i = 0; i < 3; i++) {
      this.highlightSlot(i, false);
      this.updateDropButtonVisibility(i);
    }

    // 高亮当前选中的槽位
    this.highlightSlot(slot, true);
    
    // 显示当前槽位的丢弃按钮
    this.updateDropButtonVisibility(slot);
  }

  /**
   * 取消选中
   */
  public deselectSlot(): void {
    if (!this.initialized) {
      console.warn('[InventoryUI] Not initialized');
      return;
    }

    console.log('[InventoryUI] Deselecting slot');

    // 隐藏所有丢弃按钮
    for (let i = 0; i < 3; i++) {
      this.updateDropButtonVisibility(i);
      this.highlightSlot(i, false);
    }
  }

  /**
   * 更新丢弃按钮可见性
   * @param slot 槽位索引
   */
  private updateDropButtonVisibility(slot: number): void {
    const slotRefs = this.inventorySlots[slot];
    if (!slotRefs || !slotRefs.dropButton) {
      return;
    }

    // 只有当前选中的槽位且有物品时才显示丢弃按钮
    const isSelected = this.service.getSelectedSlot() === slot;
    const hasItem = !this.service.isSlotEmpty(slot);
    const shouldShow = isSelected && hasItem;


    slotRefs.dropButton.visible = shouldShow;
  }

  /**
   * 高亮槽位
   * @param slot 槽位索引
   * @param highlight 是否高亮
   */
  private highlightSlot(slot: number, highlight: boolean): void {
    const slotRefs = this.inventorySlots[slot];
    if (!slotRefs) {
      return;
    }

    // 可以通过修改透明度来实现高亮效果
    if (highlight) {
      // 高亮效果：降低透明度
      (slotRefs.slot as unknown as Record<string, number>).backgroundOpacity = 0.2;
    } else {
      // 恢复正常
      (slotRefs.slot as unknown as Record<string, number>).backgroundOpacity = 0;
    }
  }

  /**
   * 显示背包已满提示
   */
  public showInventoryFullMessage(): void {
    console.warn('[InventoryUI] Inventory is full!');
    // 可以在这里添加UI提示，例如显示一个临时消息
    // @ts-ignore - i18n type signature is too strict
    const message = i18n.t('item:inventory_full') as string;
    // 显示消息到控制台（后续可以替换为实际的UI提示）
    console.log(`[InventoryUI] Message: ${message}`);
  }

  /**
   * 清空UI
   */
  public clear(): void {
    if (!this.initialized) {
      return;
    }

    console.log('[InventoryUI] Clearing UI');

    // 清空所有槽位
    for (let i = 0; i < 3; i++) {
      this.updateSlot(i, null);
      this.highlightSlot(i, false);
    }
  }

  /**
   * 显示背包UI
   */
  public show(): void {
    if (!this.uiScreen) {
      return;
    }

    const inventoryFrame = this.uiScreen.uiBox_inventory;
    if (inventoryFrame) {
      inventoryFrame.visible = true;
      console.log('[InventoryUI] Inventory frame shown');
    }
  }

  /**
   * 隐藏背包UI
   */
  public hide(): void {
    if (!this.uiScreen) {
      return;
    }

    const inventoryFrame = this.uiScreen.uiBox_inventory;
    if (inventoryFrame) {
      inventoryFrame.visible = false;
      console.log('[InventoryUI] Inventory frame hidden');
    }
  }

  /**
   * 销毁UI
   */
  public destroy(): void {
    this.clear();
    this.initialized = false;
    console.log('[InventoryUI] Destroyed');
  }
}

