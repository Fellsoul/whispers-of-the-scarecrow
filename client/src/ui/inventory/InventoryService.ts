import type { IInventoryItem } from '@shares/item/IItem';
import type { InventoryUpdateData } from './events';

/**
 * InventoryService - 背包数据管理服务
 * 负责存储和管理客户端背包数据
 */
export class InventoryService {
  /** 背包物品列表（最多3个槽位） */
  private inventory: (IInventoryItem | null)[] = [null, null, null];

  /** 当前选中的槽位 */
  private selectedSlot: number | null = null;

  /** 背包容量 */
  private readonly INVENTORY_SIZE = 3;

  constructor() {}

  /**
   * 初始化服务
   */
  public initialize(): void {
    this.clear();
    console.log('[InventoryService] Initialized');
  }

  /**
   * 更新背包数据
   * @param data 背包更新数据
   */
  public updateInventory(data: InventoryUpdateData): void {
    this.inventory = data.inventory;
    console.log(
      `[InventoryService] Inventory updated: ${data.itemCount}/${this.INVENTORY_SIZE} items`
    );
  }

  /**
   * 选中物品槽位
   * @param slot 槽位索引
   */
  public selectSlot(slot: number): void {
    if (slot < 0 || slot >= this.INVENTORY_SIZE) {
      console.error(`[InventoryService] Invalid slot: ${slot}`);
      return;
    }

    this.selectedSlot = slot;
  }

  /**
   * 取消选中
   */
  public deselectSlot(): void {
    this.selectedSlot = null;
  }

  /**
   * 获取当前选中的槽位
   * @returns 槽位索引，未选中则返回 null
   */
  public getSelectedSlot(): number | null {
    return this.selectedSlot;
  }

  /**
   * 获取指定槽位的物品
   * @param slot 槽位索引
   * @returns 物品数据，如果槽位为空则返回 null
   */
  public getItemAtSlot(slot: number): IInventoryItem | null {
    if (slot < 0 || slot >= this.INVENTORY_SIZE) {
      return null;
    }
    return this.inventory[slot];
  }

  /**
   * 获取完整背包数据
   * @returns 背包数组
   */
  public getInventory(): (IInventoryItem | null)[] {
    return [...this.inventory];
  }

  /**
   * 检查槽位是否为空
   * @param slot 槽位索引
   * @returns 是否为空
   */
  public isSlotEmpty(slot: number): boolean {
    if (slot < 0 || slot >= this.INVENTORY_SIZE) {
      return true;
    }
    return this.inventory[slot] === null;
  }

  /**
   * 清空背包
   */
  public clear(): void {
    this.inventory = [null, null, null];
    this.selectedSlot = null;
    console.log('[InventoryService] Cleared');
  }
}

