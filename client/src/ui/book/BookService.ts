/**
 * 书本服务
 * Book Service - 处理资源加载、i18n、样式查询
 */

import { JsonManager, JsonDataType } from '../../mgr/JsonManager';
import i18n from '@root/i18n';
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
      '[BookService] Defaults initialized, using project i18n system'
    );
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

      // 同步项目i18n语言设置
      const bookLocale = this.bookData.locale || 'zh-CN';
      if (i18n.language !== bookLocale) {
        await i18n.changeLanguage(bookLocale);
        console.log(`[BookService] Changed i18n language to: ${bookLocale}`);
      }

      console.log('[BookService] Book data loaded successfully');

      return this.bookData;
    } catch (error) {
      console.error('[BookService] Failed to load book data:', error);
      throw error;
    }
  }

  /**
   * 加载书签数据
   * 从 i18n 系统获取
   */
  async loadBookMarks(): Promise<BookMarkData> {
    try {
      // 从 i18n 系统获取书签数据
       
      const bookmarksData = i18n.getResourceBundle(
        i18n.language,
        'book_bookmarks'
      ) as any;

      if (!bookmarksData) {
        throw new Error('Bookmark data is null');
      }

      this.bookMarkData = bookmarksData as BookMarkData;
      console.log('[BookService] Bookmark data loaded successfully');
      return this.bookMarkData;
    } catch (error) {
      console.error('[BookService] Failed to load bookmarks:', error);
      throw error;
    }
  }

  /**
   * 加载条件数据
   * 从 i18n 系统获取
   */
  async loadConditions(): Promise<ConditionsData> {
    try {
      // 从 i18n 系统获取条件数据
       
      const conditionsData = i18n.getResourceBundle(
        i18n.language,
        'book_conditions'
      ) as any;

      if (!conditionsData) {
        throw new Error('Conditions data is null');
      }

      this.conditionsData = conditionsData as ConditionsData;
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
   * 使用项目的 i18n 系统
   * @param key i18n 键，支持格式：
   *   - "welcome.greet" - 从默认命名空间查找
   *   - "pages.welcome.greet" - 从 book_pages 命名空间查找
   *   - "bookmarks.xxx" - 从 book_bookmarks 命名空间查找
   *   - "conditions.xxx" - 从 book_conditions 命名空间查找
   * @param fallback 后备文本
   * @returns 解析后的文本
   */
  getText(key?: string, fallback?: string): string {
    if (!key) {
      return fallback || '';
    }

    // 解析命名空间和实际的 key
    let namespace = 'book_pages'; // 默认使用 book_pages 命名空间
    let actualKey = key;

    // 如果 key 以特定前缀开头，映射到对应的命名空间
    if (key.startsWith('pages.')) {
      namespace = 'book_pages';
      actualKey = key.substring(6); // 移除 "pages." 前缀
    } else if (key.startsWith('bookmarks.')) {
      namespace = 'book_bookmarks';
      actualKey = key.substring(10); // 移除 "bookmarks." 前缀
    } else if (key.startsWith('conditions.')) {
      namespace = 'book_conditions';
      actualKey = key.substring(11); // 移除 "conditions." 前缀
    }

    // 使用项目的 i18n.t() 方法，使用命名空间前缀格式
    // i18next 支持 "namespace:key" 格式
    const fullKey = `${namespace}:${actualKey}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const translated = i18n.t(fullKey as any) as string;

    console.log(
      `[BookService] Translating key: ${key} -> fullKey: ${fullKey}, result: ${translated}`
    );

    // 如果返回的是key本身（未找到翻译），使用fallback
    return translated !== fullKey ? translated : fallback || key;
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
   * 同步到项目的 i18n 系统
   */
  async setLocale(locale: string): Promise<void> {
    await i18n.changeLanguage(locale);
    console.log(`[BookService] Language changed to: ${locale}`);
  }

  /**
   * 获取当前语言环境
   * 从项目的 i18n 系统获取
   */
  getLocale(): string {
    return i18n.language;
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
  }
}
