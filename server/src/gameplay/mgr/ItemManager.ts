import { Singleton } from '../../core/patterns/Singleton';
import type { IItem, IInventoryItem } from '@shares/item/IItem';
import { ItemType } from '@shares/item/IItem';
import { Logger } from '../../core/utils/Logger';

/**
 * ItemManager - 物品管理器
 * 负责维护全局物品列表和物品注册表
 */
export class ItemManager extends Singleton<ItemManager>() {
  /** 全局物品注册表 (itemId -> IItem) */
  private itemRegistry: Map<string, IItem> = new Map();

  /** 是否已初始化 */
  private initialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * 初始化物品管理器
   * 在 Readiness 场景时调用
   */
  public initialize(): void {
    if (this.initialized) {
      Logger.warn('[ItemManager] Already initialized');
      return;
    }

    Logger.log('[ItemManager] Initializing item registry...');

    // 注册所有游戏物品
    this.registerDefaultItems();

    this.initialized = true;
    Logger.log(`[ItemManager] Initialized with ${this.itemRegistry.size} items`);
  }

  /**
   * 注册默认物品
   */
  private registerDefaultItems(): void {
    // 材料类物品
    this.registerItem({
      id: 'item_pumpkin_seed',
      name: 'PumpkinSeed',
      displayNameKey: 'item:pumpkin_seed.name',
      descriptionKey: 'item:pumpkin_seed.description',
      type: ItemType.Material,
      weightSpeedDebuff: 0.0,
      usageCount: null,
      iconUrl: 'picture/pumpkinSeed_item.png',
      stackable: true,
      maxStack: 1,
      rarity: 'common',
    });

    this.registerItem({
      id: 'item_premium_pumpkin_seed',
      name: 'PremiumPumpkinSeed',
      displayNameKey: 'item:premium_pumpkin_seed.name',
      descriptionKey: 'item:premium_pumpkin_seed.description',
      type: ItemType.Material,
      weightSpeedDebuff: 0.0,
      usageCount: null,
      iconUrl: 'picture/premiumPumpkinSeed_item.png',
      stackable: true,
      maxStack: 1,
      rarity: 'uncommon',
    });

    this.registerItem({
      id: 'item_wax',
      name: 'Wax',
      displayNameKey: 'item:wax.name',
      descriptionKey: 'item:wax.description',
      type: ItemType.Material,
      weightSpeedDebuff: 0.05,
      usageCount: null,
      iconUrl: 'picture/wax_item.png',
      stackable: true,
      maxStack: 1,
      rarity: 'common',
    });

    this.registerItem({
      id: 'item_cotton_thread',
      name: 'CottonThread',
      displayNameKey: 'item:cotton_thread.name',
      descriptionKey: 'item:cotton_thread.description',
      type: ItemType.Material,
      weightSpeedDebuff: 0.0,
      usageCount: null,
      iconUrl: 'picture/cottonThread_item.png',
      stackable: true,
      maxStack: 1,
      rarity: 'common',
    });

    // 消耗品
    this.registerItem({
      id: 'item_raw_pumpkin',
      name: 'RawPumpkin',
      displayNameKey: 'item:raw_pumpkin.name',
      descriptionKey: 'item:raw_pumpkin.description',
      type: ItemType.Material,
      weightSpeedDebuff: 0.1,
      usageCount: null,
      iconUrl: 'picture/pumpkin_item.png',
      stackable: true,
      maxStack: 1,
      rarity: 'common',
    });

    this.registerItem({
      id: 'item_speed_boost',
      name: 'SpeedBoost',
      displayNameKey: 'item:speed_boost.name',
      descriptionKey: 'item:speed_boost.description',
      type: ItemType.Consumable,
      weightSpeedDebuff: 0.05,
      usageCount: 1,
      iconUrl: 'assets/items/speed_boost.png',
      stackable: false,
      rarity: 'rare',
    });

    // 关键物品
    this.registerItem({
      id: 'item_lantern',
      name: 'Lantern',
      displayNameKey: 'item:lantern.name',
      descriptionKey: 'item:lantern.description',
      type: ItemType.KeyItem,
      weightSpeedDebuff: 0.15,
      usageCount: null,
      iconUrl: 'picture/pumpkinLighted_item.png',
      stackable: false,
      rarity: 'epic',
    });

    // QTE 产出物品 - 蜡烛
    this.registerItem({
      id: 'item_candle',
      name: 'Candle',
      displayNameKey: 'item:candle.name',
      descriptionKey: 'item:candle.description',
      type: ItemType.Material,
      weightSpeedDebuff: 0.0,
      usageCount: null,
      iconUrl: 'picture/candle_item.png',
      stackable: true,
      maxStack: 1,
      rarity: 'common',
    });

    // QTE 产出物品 - 雕刻南瓜
    this.registerItem({
      id: 'item_carved_pumpkin',
      name: 'CarvedPumpkin',
      displayNameKey: 'item:carved_pumpkin.name',
      descriptionKey: 'item:carved_pumpkin.description',
      type: ItemType.Material,
      weightSpeedDebuff: 0.1,
      usageCount: null,
      iconUrl: 'picture/pumpkinCarved_item.png',
      stackable: true,
      maxStack: 1,
      rarity: 'uncommon',
    });

    // QTE 产出物品 - 南瓜灯（用于献祭）
    this.registerItem({
      id: 'item_pumpkin_lantern',
      name: 'PumpkinLantern',
      displayNameKey: 'item:pumpkin_lantern.name',
      descriptionKey: 'item:pumpkin_lantern.description',
      type: ItemType.KeyItem,
      weightSpeedDebuff: 0.2,
      usageCount: null,
      iconUrl: 'picture/pumpkinLantern_item.png',
      stackable: false,
      rarity: 'rare',
    });

    Logger.log('[ItemManager] Default items registered');
  }

  /**
   * 注册物品
   * @param item 物品数据
   */
  public registerItem(item: IItem): void {
    if (this.itemRegistry.has(item.id)) {
      Logger.warn(`[ItemManager] Item ${item.id} already registered, overwriting...`);
    }

    this.itemRegistry.set(item.id, item);
    Logger.log(`[ItemManager] Registered item: ${item.id} (${item.name})`);
  }

  /**
   * 根据ID获取物品数据
   * @param itemId 物品ID
   * @returns 物品数据，如果不存在则返回 null
   */
  public getItemById(itemId: string): IItem | null {
    return this.itemRegistry.get(itemId) || null;
  }

  /**
   * 创建物品实例
   * @param itemId 物品ID
   * @returns 物品实例，如果物品不存在则返回 null
   */
  public createItemInstance(itemId: string): IInventoryItem | null {
    const itemData = this.getItemById(itemId);
    if (!itemData) {
      Logger.error(`[ItemManager] Cannot create instance: item ${itemId} not found`);
      return null;
    }

    // 创建物品实例
    const instance: IInventoryItem = {
      ...itemData,
      instanceId: this.generateInstanceId(),
      remainingUses: itemData.usageCount,
      stackCount: 1,
      acquiredAt: Date.now(),
    };

    Logger.log(`[ItemManager] Created instance ${instance.instanceId} of ${itemId}`);
    return instance;
  }

  /**
   * 生成物品实例ID
   */
  private generateInstanceId(): string {
    return `item_instance_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取所有已注册的物品
   * @returns 物品数组
   */
  public getAllItems(): IItem[] {
    return Array.from(this.itemRegistry.values());
  }

  /**
   * 根据类型获取物品列表
   * @param type 物品类型
   * @returns 符合类型的物品数组
   */
  public getItemsByType(type: ItemType): IItem[] {
    return this.getAllItems().filter((item) => item.type === type);
  }

  /**
   * 检查物品是否存在
   * @param itemId 物品ID
   * @returns 是否存在
   */
  public hasItem(itemId: string): boolean {
    return this.itemRegistry.has(itemId);
  }

  /**
   * 重置管理器（用于测试或重新初始化）
   */
  public reset(): void {
    this.itemRegistry.clear();
    this.initialized = false;
    Logger.log('[ItemManager] Reset complete');
  }
}

