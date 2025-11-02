/**
 * 物品类型枚举
 */
export enum ItemType {
  /** 消耗品 */
  Consumable = 'consumable',
  /** 材料 */
  Material = 'material',
  /** 工具 */
  Tool = 'tool',
  /** 关键物品 */
  KeyItem = 'key_item',
}

/**
 * 物品接口
 * 定义游戏中所有物品的基础结构
 */
export interface IItem {
  /** 物品唯一ID */
  id: string;

  /** 物品名称（内部使用） */
  name: string;

  /** i18n 显示名字键 */
  displayNameKey: string;

  /** 物品描述的 i18n 键 */
  descriptionKey?: string;

  /** 物品类型 */
  type: ItemType;

  /** 负重减速修饰（0.0-1.0，0表示无减速，1表示完全无法移动） */
  weightSpeedDebuff: number;

  /** 可使用次数（消耗品）- null 表示无限或不可消耗 */
  usageCount: number | null;

  /** 物品图片 URL */
  iconUrl: string;

  /** 是否可堆叠 */
  stackable?: boolean;

  /** 最大堆叠数量 */
  maxStack?: number;

  /** 物品品质/稀有度 */
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

/**
 * 玩家背包中的物品实例
 */
export interface IInventoryItem extends IItem {
  /** 实例唯一ID（用于区分同种物品的不同实例） */
  instanceId: string;

  /** 当前剩余使用次数 */
  remainingUses: number | null;

  /** 当前堆叠数量 */
  stackCount?: number;

  /** 获得时间戳 */
  acquiredAt?: number;
}




