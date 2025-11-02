/**
 * 物品栏UI事件定义
 */

import type { IInventoryItem } from '@shares/item/IItem';

/**
 * 背包更新数据
 */
export interface InventoryUpdateData {
  inventory: (IInventoryItem | null)[];
  itemCount: number;
  weightDebuff: number;
}

/**
 * 物品选中数据
 */
export interface ItemSelectedData {
  slot: number;
  item: IInventoryItem;
}

/**
 * 背包事件（使用通用事件名，不包含 userId，因为 sendTo 已经指定了目标）
 */
export const INVENTORY_UPDATE = 'inventory:update';
export const INVENTORY_ITEM_SELECTED = 'inventory:item:selected';
export const INVENTORY_ITEM_DESELECTED = 'inventory:item:deselected';
export const INVENTORY_FULL = 'inventory:full';

