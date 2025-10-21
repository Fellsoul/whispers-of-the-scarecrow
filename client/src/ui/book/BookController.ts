/**
 * 书本控制器
 * Book Controller - 处理分页、状态管理、导航逻辑
 */

import type { EventBus } from '../../core/events/EventBus';
import type { BookService } from './BookService';
import { BookEvents } from './events';
import { BookState } from './types';
import type {
  BookData,
  Page,
  NavigationPayload,
  BookmarkClickPayload,
} from './types';

/**
 * 书本控制器类
 * 职责：
 * 1. 管理书本状态（IDLE/LOADING/READY/OPEN/CLOSED/ERROR）
 * 2. 处理页面导航（上一页/下一页/跳转）
 * 3. 管理当前页面和页面索引
 * 4. 处理书签跳转
 * 5. 发布状态变化事件
 */
export class BookController {
  private service: BookService;
  private eventBus: EventBus;

  private state: BookState = BookState.IDLE;
  private bookData: BookData | null = null;
  private currentPageIndex: number = -1;
  private pageIndexMap: Map<string, number> = new Map(); // pageNumber -> index

  // 有效页面管理（跳过空白页）
  private validPageIndices: number[] = []; // 有内容的页面索引列表
  private currentValidIndex: number = -1; // 在validPageIndices中的位置
  private displayPageNumber: number = 0; // 显示给用户的页码（从1开始）

  constructor(service: BookService, eventBus: EventBus) {
    this.service = service;
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听导航事件
    this.eventBus.on<NavigationPayload>(BookEvents.BOOK_GOTO, (payload) => {
      if (payload?.pageNumber) {
        this.gotoPage(payload.pageNumber);
      } else if (payload?.pageIndex !== undefined) {
        this.gotoPageByIndex(payload.pageIndex);
      }
    });

    this.eventBus.on(BookEvents.BOOK_NEXT, () => this.nextPage());
    this.eventBus.on(BookEvents.BOOK_PREV, () => this.prevPage());

    // 监听书签点击
    this.eventBus.on<BookmarkClickPayload>(
      BookEvents.BOOK_BOOKMARK_CLICK,
      (payload) => {
        if (payload?.pageNumber) {
          this.gotoPage(payload.pageNumber);
        }
      }
    );
  }

  /**
   * 初始化书本数据
   * 新逻辑：不再加载 pages 配置，页面由引擎预设
   * 只需要确保 i18n 文本数据已加载
   */
  async initialize(): Promise<void> {
    try {
      this.setState(BookState.LOADING);

      // 尝试加载书本数据（可选，主要用于 locale 等配置）
      try {
        this.bookData = await this.service.loadBookData();
        console.log('[BookController] Book data loaded (optional)');
      } catch (error) {
        console.warn(
          '[BookController] Book data not available, using defaults:',
          error
        );
        // 不强制要求 bookData，使用默认配置
        this.bookData = {
          locale: 'zh-CN',
          version: 1,
          settingsRef: 'default',
          pages: [], // 空数组，不再使用
        };

        // 即使 bookData 加载失败，也尝试加载 i18n 数据
        try {
          await this.service.loadI18nData('zh-CN');
          console.log('[BookController] i18n data loaded separately');
        } catch (i18nError) {
          console.warn('[BookController] Failed to load i18n data:', i18nError);
        }
      }

      // 加载书签数据
      try {
        await this.service.loadBookMarks();
        console.log('[BookController] Bookmarks data loaded');
      } catch (error) {
        console.warn('[BookController] Bookmarks data not available:', error);
      }

      // 加载条件数据（可选）
      try {
        await this.service.loadConditions();
        console.log('[BookController] Conditions data loaded');
      } catch (error) {
        console.warn('[BookController] Conditions data not available:', error);
      }

      // 不再构建页面索引映射（页面由引擎预设）
      // this.buildPageIndexMap();

      // 构建有效页面列表（从书签数据中提取）
      this.buildValidPageIndices();

      this.setState(BookState.READY);
      this.eventBus.emit(BookEvents.BOOK_READY);

      const pageCount = this.bookData?.pages?.length || 0;
      console.log(
        `[BookController] Initialized successfully (pages config: ${pageCount}, using engine presets, valid pages: ${this.validPageIndices.length})`
      );
    } catch (error) {
      console.error('[BookController] Initialization failed:', error);
      this.setState(BookState.ERROR);
      this.eventBus.emit(BookEvents.BOOK_ERROR, { error });
      throw error;
    }
  }

  /**
   * 构建页面索引映射
   */
  private buildPageIndexMap(): void {
    if (!this.bookData) {
      return;
    }

    this.pageIndexMap.clear();
    this.bookData.pages.forEach((page, index) => {
      this.pageIndexMap.set(page.pageNumber, index);
    });
  }

  /**
   * 构建有效页面列表（从书签数据中提取）
   * 只包含书签范围内的页面，跳过空白页
   */
  private buildValidPageIndices(): void {
    this.validPageIndices = [];

    const bookMarkData = this.service.getBookMarkData();
    if (!bookMarkData || !bookMarkData.bookMarks) {
      console.warn(
        '[BookController] No bookmark data, cannot build valid page indices'
      );
      return;
    }

    // 收集所有书签范围内的页面
    const validPagesSet = new Set<number>();

    for (const bookmark of bookMarkData.bookMarks) {
      const { pageNumberLeft, pageNumberRight } = bookmark;

      // 将范围内的所有页面索引加入集合
      // pageIndex = Math.floor(pageNumber / 2)
      const startIndex = Math.floor(pageNumberLeft / 2);
      const endIndex = Math.floor(pageNumberRight / 2);

      for (let i = startIndex; i <= endIndex; i++) {
        validPagesSet.add(i);
      }
    }

    // 转换为排序的数组
    this.validPageIndices = Array.from(validPagesSet).sort((a, b) => a - b);

    console.log(
      `[BookController] Built valid page indices: ${this.validPageIndices.length} pages`
    );
    console.log(
      `[BookController] Valid page indices: [${this.validPageIndices.slice(0, 10).join(', ')}${this.validPageIndices.length > 10 ? '...' : ''}]`
    );
  }

  /**
   * 更新 currentValidIndex 和 displayPageNumber
   * @param pageIndex 当前实际页面索引
   */
  private updateValidIndexAndDisplayNumber(pageIndex: number): void {
    // 在 validPageIndices 中查找当前页面的位置
    const validIndex = this.validPageIndices.indexOf(pageIndex);

    if (validIndex !== -1) {
      // 页面在有效列表中
      this.currentValidIndex = validIndex;
      this.displayPageNumber = validIndex + 1; // 从1开始显示
    } else {
      // 页面不在有效列表中（理论上不应该发生）
      console.warn(
        `[BookController] Page index ${pageIndex} is not in valid page list`
      );
      this.currentValidIndex = -1;
      this.displayPageNumber = 0;
    }
  }

  /**
   * 打开书本到指定页
   * @param pageNumber 页码，不提供则打开第一个有效页面
   */
  open(pageNumber?: string): void {
    if (this.state !== BookState.READY && this.state !== BookState.CLOSED) {
      console.warn('[BookController] Book is not ready or closed');
      return;
    }

    this.setState(BookState.OPEN);

    if (pageNumber) {
      this.gotoPage(pageNumber);
    } else {
      // 打开第一个有效页面
      if (this.validPageIndices.length > 0) {
        const firstValidPage = this.validPageIndices[0];
        this.gotoPageByIndex(firstValidPage);
        console.log(
          `[BookController] Opening to first valid page: ${firstValidPage}`
        );
      } else {
        console.warn('[BookController] No valid pages available');
      }
    }
  }

  /**
   * 关闭书本
   */
  close(): void {
    if (this.state !== BookState.OPEN) {
      console.warn('[BookController] Book is not open');
      return;
    }

    this.setState(BookState.CLOSED);
    this.currentPageIndex = -1;

    // 检查有多少个监听器
    const listenerCount = this.eventBus.listenerCount(BookEvents.BOOK_CLOSE);
    console.log(
      `[BookController] Emitting BOOK_CLOSE event (${listenerCount} listeners)`
    );

    this.eventBus.emit(BookEvents.BOOK_CLOSE);
  }

  /**
   * 跳转到指定页码
   * @param pageNumber 页码标识
   */
  gotoPage(pageNumber: string): void {
    const index = this.pageIndexMap.get(pageNumber);
    if (index === undefined) {
      console.warn(`[BookController] Page not found: ${pageNumber}`);
      return;
    }

    this.gotoPageByIndex(index);
  }

  /**
   * 跳转到指定索引的页面
   * @param index 页面索引（从 0 开始）
   * 注意：页面由引擎预设，不再检查 pages 数组长度
   */
  gotoPageByIndex(index: number): void {
    if (index < 0) {
      console.warn(`[BookController] Invalid page index: ${index}`);
      return;
    }

    // 直接使用 index 作为翻页索引
    this.currentPageIndex = index;

    // 更新 currentValidIndex 和 displayPageNumber
    this.updateValidIndexAndDisplayNumber(index);

    console.log(
      `[BookController] Navigate to spread at index: ${index} (display page: ${this.displayPageNumber}/${this.validPageIndices.length})`
    );

    // 发布页面变化事件
    // pageNumber 字段保持为字符串类型以兼容现有代码，但实际使用 pageIndex
    this.eventBus.emit(BookEvents.BOOK_PAGE_CHANGED, {
      pageNumber: `${index}`, // 转换为字符串以兼容类型
      pageIndex: index,
    });
  }

  /**
   * 下一页（跳到下一个有效页面）
   * 使用 validPageIndices 列表，自动跳过空白页
   */
  nextPage(): void {
    if (this.validPageIndices.length === 0) {
      console.warn('[BookController] No valid pages available');
      return;
    }

    // 在有效页面列表中查找下一个
    const nextValidIndex = this.currentValidIndex + 1;

    if (nextValidIndex < this.validPageIndices.length) {
      const nextPageIndex = this.validPageIndices[nextValidIndex];
      this.gotoPageByIndex(nextPageIndex);
      console.log(
        `[BookController] Navigate to next valid page: ${nextPageIndex}`
      );
    } else {
      console.log('[BookController] Already at last valid page');
    }
  }

  /**
   * 上一页（跳到上一个有效页面）
   * 使用 validPageIndices 列表，自动跳过空白页
   */
  prevPage(): void {
    if (this.validPageIndices.length === 0) {
      console.warn('[BookController] No valid pages available');
      return;
    }

    // 在有效页面列表中查找上一个
    const prevValidIndex = this.currentValidIndex - 1;

    if (prevValidIndex >= 0) {
      const prevPageIndex = this.validPageIndices[prevValidIndex];
      this.gotoPageByIndex(prevPageIndex);
      console.log(
        `[BookController] Navigate to previous valid page: ${prevPageIndex}`
      );
    } else {
      console.log('[BookController] Already at first valid page');
    }
  }

  /**
   * 获取当前页面（已废弃，不再使用 pages 配置）
   */
  getCurrentPage(): Page | null {
    console.warn('[BookController] getCurrentPage is deprecated');
    return null;
  }

  /**
   * 获取当前页面索引
   */
  getCurrentPageIndex(): number {
    return this.currentPageIndex;
  }

  /**
   * 获取显示页码（在有效页面列表中的位置，从1开始）
   */
  getDisplayPageNumber(): number {
    return this.displayPageNumber;
  }

  /**
   * 获取有效页面总数
   */
  getValidPageCount(): number {
    return this.validPageIndices.length;
  }

  /**
   * 获取有效页面索引列表
   */
  getValidPageIndices(): number[] {
    return this.validPageIndices;
  }

  /**
   * 获取总页数（已废弃，页面由引擎预设）
   */
  getTotalPages(): number {
    console.warn(
      '[BookController] getTotalPages is deprecated, pages are preset in engine'
    );
    return 0;
  }

  /**
   * 获取当前状态
   */
  getState(): BookState {
    return this.state;
  }

  /**
   * 设置状态
   */
  private setState(state: BookState): void {
    const oldState = this.state;
    this.state = state;
    console.log(`[BookController] State: ${oldState} -> ${state}`);
  }

  /**
   * 检查是否有下一页
   * 使用 validPageIndices 列表判断
   */
  hasNextPage(): boolean {
    if (this.validPageIndices.length === 0) {
      return false;
    }
    return this.currentValidIndex < this.validPageIndices.length - 1;
  }

  /**
   * 检查是否有上一页
   * 使用 validPageIndices 列表判断
   */
  hasPrevPage(): boolean {
    return this.currentValidIndex > 0;
  }

  /**
   * 根据页码获取页面（已废弃）
   */
  getPageByNumber(pageNumber: string): Page | null {
    console.warn('[BookController] getPageByNumber is deprecated');
    return null;
  }

  /**
   * 获取所有页面（已废弃，不再使用 pages 配置）
   */
  getAllPages(): Page[] {
    console.warn(
      '[BookController] getAllPages is deprecated, pages are preset in engine'
    );
    return [];
  }

  /**
   * 检查页码是否存在（已废弃）
   */
  hasPage(pageNumber: string): boolean {
    console.warn('[BookController] hasPage is deprecated');
    return false;
  }

  /**
   * 获取书本数据
   */
  getBookData(): BookData | null {
    return this.bookData;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.bookData = null;
    this.pageIndexMap.clear();
    this.currentPageIndex = -1;
    this.setState(BookState.IDLE);
  }
}
