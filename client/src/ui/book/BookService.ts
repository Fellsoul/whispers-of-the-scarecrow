/**
 * 书本服务
 * Book Service - 处理资源加载、i18n、样式查询
 */

import { JsonManager, JsonDataType } from '../../mgr/JsonManager';
import type {
  BookData,
  BookMarkData,
  StyleConfig,
  ConditionsData,
} from './types';

/**
 * 书本服务类
 * 负责：
 * 1. 加载书本 JSON 数据
 * 2. 加载书签数据
 * 3. 查询样式配置（从 settings.ts / styles.ts）
 * 4. i18n 文本解析
 * 5. 资源路径解析
 */
export class BookService {
  private bookData: BookData | null = null;
  private bookMarkData: BookMarkData | null = null;
  private conditionsData: ConditionsData | null = null;
  private settings: Map<string, number | string | boolean> = new Map();
  private styles: Map<string, StyleConfig> = new Map();
  private i18nMap: Map<string, string> = new Map();

  private locale: string = 'zh-CN';

  constructor() {
    this.initializeDefaults();
  }

  /**
   * 初始化默认配置
   */
  private initializeDefaults(): void {
    // 默认布局配置
    this.settings.set('PAGE_CONTENT_W', 384);
    this.settings.set('PAGE_CONTENT_H', 582);
    this.settings.set('TEXT_MAX_W', 360);
    this.settings.set('SEP_H', 4);
    this.settings.set('SEP_SM_H', 2);
    this.settings.set('MT_TITLE', 20);
    this.settings.set('GAP_AFTER_TITLE', 16);
    this.settings.set('GAP_AFTER_SEP', 24);
    this.settings.set('GAP_AFTER_SUBTITLE', 12);
    this.settings.set('GAP_AFTER_SUBSEP', 16);
    this.settings.set('GAP_SECTION', 32);
    this.settings.set('GAP_IMAGE_PARAGRAPH', 16);
    this.settings.set('LH_TITLE', 48);
    this.settings.set('LH_SUBTITLE', 36);
    this.settings.set('LH_BODY', 28);

    // 默认样式配置
    this.styles.set('TITLE', {
      fontSize: 32,
      fontFamily: 'serif',
      color: '#2c1810',
      lineHeight: 48,
      textAlign: 'center',
    });

    this.styles.set('SUBTITLE', {
      fontSize: 24,
      fontFamily: 'serif',
      color: '#3d2817',
      lineHeight: 36,
      textAlign: 'left',
    });

    this.styles.set('BODY', {
      fontSize: 18,
      fontFamily: 'sans-serif',
      color: '#442d1f',
      lineHeight: 28,
      letterSpacing: 0.5,
      textAlign: 'left',
    });

    this.styles.set('SEP_ORNATE', {
      color: '#8b6f47',
    });

    this.styles.set('SEP_SMALL', {
      color: '#a08968',
    });

    console.log(
      '[BookService] Defaults initialized, i18n data will be loaded from JSON'
    );
  }

  /**
   * 加载 i18n 文本数据
   * 从 JsonManager 加载 pages_zh-CN.json
   */
  async loadI18nData(locale: string = 'zh-CN'): Promise<void> {
    try {
      const jsonManager = JsonManager.instance;

      // 设置语言环境
      if (locale === 'zh-CN' || locale === 'en-US') {
        jsonManager.setLocale(locale as 'zh-CN' | 'en-US');
      }

      // 从 JsonManager 加载 i18n 文本数据
      const i18nData = await jsonManager.getDataAsync<Record<string, unknown>>(
        JsonDataType.BOOK_I18N_TEXT
      );

      if (i18nData) {
        // 清空现有的 i18nMap
        this.i18nMap.clear();

        // 将嵌套的 JSON 对象扁平化为 Map
        this.flattenI18nData(i18nData);

        console.log(
          `[BookService] Loaded ${this.i18nMap.size} i18n entries for locale: ${locale}`
        );
      } else {
        console.warn(`[BookService] No i18n data found for locale: ${locale}`);
      }
    } catch (error) {
      console.error(
        `[BookService] Failed to load i18n data for ${locale}:`,
        error
      );
      throw error;
    }
  }

  /**
   * 将嵌套的 JSON 对象扁平化为 key -> value 的 Map
   * 例如: { "welcome": { "greet": "你好" } } -> "welcome.greet" -> "你好"
   */
  private flattenI18nData(
    obj: Record<string, unknown>,
    prefix: string = ''
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // 递归处理嵌套对象
        this.flattenI18nData(value as Record<string, unknown>, fullKey);
      } else {
        // 添加到 i18nMap
        this.i18nMap.set(fullKey, String(value));
      }
    }
  }

  /**
   * 加载书本数据
   * 从 JsonManager 获取预加载的数据
   */
  async loadBookData(): Promise<BookData> {
    try {
      const jsonManager = JsonManager.instance;
      this.bookData = await jsonManager.getDataAsync<BookData>(
        JsonDataType.BOOK_PAGE_CONFIG
      );

      if (!this.bookData) {
        throw new Error('Book data is null');
      }

      this.locale = this.bookData.locale || 'zh-CN';

      // 加载对应语言的 i18n 数据
      await this.loadI18nData(this.locale);

      console.log('[BookService] Book data loaded successfully');

      return this.bookData;
    } catch (error) {
      console.error('[BookService] Failed to load book data:', error);
      throw error;
    }
  }

  /**
   * 加载书签数据
   * 从 JsonManager 获取预加载的数据
   */
  async loadBookMarks(): Promise<BookMarkData> {
    try {
      const jsonManager = JsonManager.instance;
      this.bookMarkData = await jsonManager.getDataAsync<BookMarkData>(
        JsonDataType.BOOK_BOOKMARKS
      );

      if (!this.bookMarkData) {
        throw new Error('Bookmark data is null');
      }

      console.log('[BookService] Bookmark data loaded successfully');
      return this.bookMarkData;
    } catch (error) {
      console.error('[BookService] Failed to load bookmarks:', error);
      throw error;
    }
  }

  /**
   * 加载条件数据
   * 从 JsonManager 获取预加载的数据
   */
  async loadConditions(): Promise<ConditionsData> {
    try {
      const jsonManager = JsonManager.instance;
      this.conditionsData = await jsonManager.getDataAsync<ConditionsData>(
        JsonDataType.BOOK_CONDITIONS
      );

      if (!this.conditionsData) {
        throw new Error('Conditions data is null');
      }

      console.log('[BookService] Conditions data loaded successfully');
      return this.conditionsData;
    } catch (error) {
      console.error('[BookService] Failed to load conditions:', error);
      throw error;
    }
  }

  /**
   * 获取书本数据
   */
  getBookData(): BookData | null {
    return this.bookData;
  }

  /**
   * 获取书签数据
   */
  getBookMarkData(): BookMarkData | null {
    return this.bookMarkData;
  }

  /**
   * 获取条件数据
   */
  getConditionsData(): ConditionsData | null {
    return this.conditionsData;
  }

  /**
   * 获取指定元素的条件配置
   * @param elementId 元素ID（例如 "image-1"）
   */
  getConditionConfig(elementId: string) {
    return this.conditionsData?.[elementId] || null;
  }

  /**
   * 根据引用键获取配置值
   * @param ref 配置键（如 "TEXT_MAX_W"）
   * @returns 配置值
   */
  getSetting<T extends number | string | boolean = number>(
    ref: string
  ): T | undefined {
    return this.settings.get(ref) as T | undefined;
  }

  /**
   * 根据引用键获取样式配置
   * @param ref 样式键（如 "TITLE"）
   * @returns 样式配置
   */
  getStyle(ref: string): StyleConfig | undefined {
    return this.styles.get(ref);
  }

  /**
   * 解析 i18n 文本
   * @param key i18n 键
   * @param fallback 后备文本
   * @returns 解析后的文本
   */
  getText(key?: string, fallback?: string): string {
    if (!key) {
      return fallback || '';
    }
    return this.i18nMap.get(key) || fallback || key;
  }

  /**
   * 解析资源路径
   * @param srcRef 资源引用
   * @returns 完整资源路径
   */
  resolveAssetPath(srcRef: string): string {
    // 在实际项目中，这里应该使用资源管理器解析路径
    // 例如：return AssetManager.getPath(srcRef);
    // 目前返回相对路径
    return `/assets/${srcRef}`;
  }

  /**
   * 批量解析配置引用
   * @param layout 布局配置对象
   * @returns 解析后的数值对象
   */
  resolveLayout(layout?: {
    maxWidthRef?: string;
    lineHeightRef?: string;
    marginTopRef?: string;
    heightRef?: string;
    gapBetweenRef?: string;
  }): {
    maxWidth?: number;
    lineHeight?: number;
    marginTop?: number;
    height?: number;
    gapBetween?: number;
  } {
    if (!layout) {
      return {};
    }

    return {
      maxWidth: layout.maxWidthRef
        ? this.getSetting<number>(layout.maxWidthRef)
        : undefined,
      lineHeight: layout.lineHeightRef
        ? this.getSetting<number>(layout.lineHeightRef)
        : undefined,
      marginTop: layout.marginTopRef
        ? this.getSetting<number>(layout.marginTopRef)
        : undefined,
      height: layout.heightRef
        ? this.getSetting<number>(layout.heightRef)
        : undefined,
      gapBetween: layout.gapBetweenRef
        ? this.getSetting<number>(layout.gapBetweenRef)
        : undefined,
    };
  }

  /**
   * 设置语言环境
   */
  setLocale(locale: string): void {
    this.locale = locale;
  }

  /**
   * 获取当前语言环境
   */
  getLocale(): string {
    return this.locale;
  }

  /**
   * 更新 settings（用于动态配置）
   */
  updateSettings(key: string, value: number | string | boolean): void {
    this.settings.set(key, value);
  }

  /**
   * 更新样式（用于动态配置）
   */
  updateStyle(key: string, style: StyleConfig): void {
    this.styles.set(key, style);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.bookData = null;
    this.bookMarkData = null;
    this.conditionsData = null;
    this.settings.clear();
    this.styles.clear();
    this.i18nMap.clear();
  }
}
