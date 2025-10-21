/**
 * JSON 数据管理器
 * JSON Manager - 统一管理所有 JSON 数据的加载和访问
 */

import { Singleton } from '../core/patterns/Singleton';
// 直接导入本地 JSON 文件（多语言版本）
import bookI18nText_zhCN from '../data/book/pages_zh-CN.json';
import bookI18nText_enUS from '../data/book/pages_en-US.json';
import bookBookmarks_zhCN from '../data/book/bookmarks_zh-CN.json';
import bookBookmarks_enUS from '../data/book/bookmarks_en-US.json';
import bookConditions_zhCN from '../data/book/conditions_zh-CN.json';
import bookConditions_enUS from '../data/book/conditions_en-US.json';

/**
 * JSON 数据类型枚举
 */
export enum JsonDataType {
  BOOK_PAGE_CONFIG = 'book_page_config',
  BOOK_BOOKMARKS = 'book_bookmarks',
  BOOK_I18N_TEXT = 'book_i18n_text', // i18n 文本数据（pages_zh-CN.json）
  BOOK_CONDITIONS = 'book_conditions', // 条件显示配置（conditions_zh-CN.json）
  // 可以继续添加其他 JSON 类型
}

/**
 * 支持的语言环境
 */
export type SupportedLocale = 'zh-CN' | 'en-US';

/**
 * JSON 数据源映射（多语言）
 * 按语言分组的 JSON 数据
 */
const JSON_DATA_SOURCE_BY_LOCALE: Record<
  SupportedLocale,
  Record<JsonDataType, unknown>
> = {
  'zh-CN': {
    [JsonDataType.BOOK_PAGE_CONFIG]: {}, // 空对象，不再使用
    [JsonDataType.BOOK_BOOKMARKS]: bookBookmarks_zhCN,
    [JsonDataType.BOOK_I18N_TEXT]: bookI18nText_zhCN, // i18n 文本数据
    [JsonDataType.BOOK_CONDITIONS]: bookConditions_zhCN, // 条件显示配置
  },
  'en-US': {
    [JsonDataType.BOOK_PAGE_CONFIG]: {}, // 空对象，不再使用
    [JsonDataType.BOOK_BOOKMARKS]: bookBookmarks_enUS,
    [JsonDataType.BOOK_I18N_TEXT]: bookI18nText_enUS, // i18n 文本数据
    [JsonDataType.BOOK_CONDITIONS]: bookConditions_enUS, // 条件显示配置
  },
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
  private currentLocale: SupportedLocale = 'zh-CN'; // 默认语言

  constructor() {
    super();
  }

  /**
   * 设置当前语言环境
   * @param locale 语言环境
   */
  setLocale(locale: SupportedLocale): void {
    if (this.currentLocale !== locale) {
      console.log(
        `[JsonManager] Switching locale from ${this.currentLocale} to ${locale}`
      );
      this.currentLocale = locale;
      // 清空缓存，下次获取时会重新加载对应语言的数据
      this.dataCache.clear();
    }
  }

  /**
   * 获取当前语言环境
   */
  getLocale(): SupportedLocale {
    return this.currentLocale;
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
   * 直接从导入的 JSON 对象中获取（根据当前语言环境）
   * @param dataType 数据类型
   */
  private async fetchJsonByToken(dataType: JsonDataType): Promise<unknown> {
    const localeData = JSON_DATA_SOURCE_BY_LOCALE[this.currentLocale];

    if (!localeData) {
      throw new Error(
        `[JsonManager] Unsupported locale: ${this.currentLocale}`
      );
    }

    const data = localeData[dataType];

    if (!data) {
      throw new Error(
        `[JsonManager] Unknown data type: ${dataType} for locale: ${this.currentLocale}`
      );
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
