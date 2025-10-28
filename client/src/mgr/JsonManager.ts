/**
 * JSON 数据管理器
 * JSON Manager - 统一管理所有 JSON 配置数据的加载和访问
 * 注意：翻译数据现在由 i18n 系统管理，此类仅用于非翻译的配置数据
 */

import { Singleton } from '../core/patterns/Singleton';
import mapHrefData from '../data/mapHref.json';

/**
 * JSON 数据类型枚举
 * 注意：翻译相关的数据类型已移除，请使用 i18n 系统
 */
export enum JsonDataType {
  BOOK_PAGE_CONFIG = 'book_page_config',
  MAP_HREF = 'map_href',
  // 可以继续添加其他非翻译的配置 JSON 类型
}

/**
 * JSON 数据源映射
 * 存储非翻译的配置数据
 */
const JSON_DATA_SOURCE: Record<JsonDataType, unknown> = {
  [JsonDataType.BOOK_PAGE_CONFIG]: {}, // 配置数据，如需要可以导入
  [JsonDataType.MAP_HREF]: mapHrefData, // 地图链接数据
};

/**
 * JsonManager 类
 * 职责：
 * 1. 在初始化时预加载所有 JSON 数据
 * 2. 提供统一的数据访问接口
 * 3. 支持按需加载和缓存
 * 4. 通过 token/key 反向获取数据
 */
export class JsonManager extends Singleton<JsonManager>() {
  private dataCache: Map<string, unknown> = new Map();
  private isInitialized: boolean = false;
  private loadingPromises: Map<string, Promise<unknown>> = new Map();

  constructor() {
    super();
  }

  /**
   * 初始化 JSON 管理器
   * @param dataTypes 需要预加载的数据类型数组，如果不提供则加载所有
   */
  async initialize(dataTypes?: JsonDataType[]): Promise<void> {
    if (this.isInitialized) {
      console.warn('[JsonManager] Already initialized');
      return;
    }

    console.log('[JsonManager] Initializing...');

    // 确定要加载的数据类型
    const typesToLoad = dataTypes || Object.values(JsonDataType);

    // 并行加载所有 JSON 数据
    const loadPromises = typesToLoad.map((type) => {
      return this.loadJsonData(type).catch((error) => {
        console.error(`[JsonManager] Failed to load ${type}:`, error);
        return null;
      });
    });

    await Promise.all(loadPromises);

    this.isInitialized = true;
    console.log('[JsonManager] Initialized successfully');
  }

  /**
   * 加载指定类型的 JSON 数据
   * @param dataType 数据类型
   */
  private async loadJsonData(dataType: JsonDataType): Promise<unknown> {
    const cacheKey = dataType;

    // 如果已经在缓存中，直接返回
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey);
    }

    // 如果正在加载中，返回加载 Promise
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // 开始加载
    const loadPromise = this.fetchJsonByToken(dataType);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const data = await loadPromise;
      this.dataCache.set(cacheKey, data);
      this.loadingPromises.delete(cacheKey);
      console.log(`[JsonManager] Loaded ${dataType}`);
      return data;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * 通过 token/key 获取 JSON 数据
   * 直接从导入的 JSON 对象中获取
   * @param dataType 数据类型
   */
  private async fetchJsonByToken(dataType: JsonDataType): Promise<unknown> {
    const data = JSON_DATA_SOURCE[dataType];

    if (data === undefined) {
      throw new Error(`[JsonManager] Unknown data type: ${dataType}`);
    }

    // 直接返回导入的 JSON 对象（同步转异步）
    return Promise.resolve(data);
  }

  /**
   * 获取指定类型的 JSON 数据
   * @param dataType 数据类型
   * @returns 数据对象，如果未加载则返回 null
   */
  getData<T = unknown>(dataType: JsonDataType): T | null {
    return (this.dataCache.get(dataType) as T) || null;
  }

  /**
   * 异步获取指定类型的 JSON 数据（如果未加载则先加载）
   * @param dataType 数据类型
   */
  async getDataAsync<T = unknown>(dataType: JsonDataType): Promise<T> {
    // 如果已经在缓存中，直接返回
    if (this.dataCache.has(dataType)) {
      return this.dataCache.get(dataType) as T;
    }

    // 否则加载数据
    return (await this.loadJsonData(dataType)) as T;
  }

  /**
   * 手动添加自定义 JSON 数据到缓存
   * @param key 缓存键
   * @param data JSON 数据对象
   */
  addCustomData<T = unknown>(key: string, data: T): void {
    this.dataCache.set(key, data);
    console.log(`[JsonManager] Added custom data: ${key}`);
  }

  /**
   * 重新加载指定类型的数据
   * @param dataType 数据类型
   */
  async reload(dataType: JsonDataType): Promise<unknown> {
    this.dataCache.delete(dataType);
    return this.loadJsonData(dataType);
  }

  /**
   * 清除指定数据的缓存
   * @param dataType 数据类型
   */
  clearCache(dataType?: JsonDataType): void {
    if (dataType) {
      this.dataCache.delete(dataType);
      console.log(`[JsonManager] Cleared cache for ${dataType}`);
    } else {
      this.dataCache.clear();
      console.log('[JsonManager] Cleared all cache');
    }
  }

  /**
   * 检查数据是否已加载
   * @param dataType 数据类型
   */
  isLoaded(dataType: JsonDataType): boolean {
    return this.dataCache.has(dataType);
  }

  /**
   * 获取所有已加载的数据类型
   */
  getLoadedTypes(): string[] {
    return Array.from(this.dataCache.keys());
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.dataCache.clear();
    this.loadingPromises.clear();
    this.isInitialized = false;
    console.log('[JsonManager] Disposed');
  }
}
