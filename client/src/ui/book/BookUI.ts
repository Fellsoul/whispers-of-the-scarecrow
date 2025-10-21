/**
 * 书本 UI Facade
 * Book UI Facade - 封装书本 UI 的所有操作，直接操作 UiIndex_screen 中的 UI 元素
 */

import { EventBus } from '../../core/events/EventBus';
import { BookService } from './BookService';
import { BookController } from './BookController';
import { ConditionChecker } from './ConditionChecker';
import { BookEvents } from './events';
import { Animation } from '../Animation';
import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';

// 使用引擎自动生成的 UI Screen 类型
export type UiScreenInstance = UiIndex_screen;

/**
 * 书本 UI 类
 * 职责：
 * 1. 初始化和管理 BookService 和 BookController
 * 2. 提供公开的 API（open/close/goto/next/prev）
 * 3. 监听控制器事件，更新 UI 元素
 * 4. 管理书签、翻页按钮等交互
 */
export class BookUI {
  private static instanceCount = 0; // 追踪实例数量

  private service: BookService;
  private controller: BookController;
  private conditionChecker: ConditionChecker;
  private eventBus: EventBus;

  // UI 元素引用（需要通过 UiIndex_screen 获取）
  private uiScreen: UiScreenInstance | null = null;

  // 当前渲染状态
  private isInitialized: boolean = false;
  private eventsSetup: boolean = false; // UI 交互事件是否已设置
  private eventBusListenersSetup: boolean = false; // EventBus 监听器是否已设置

  // bookIcon 动画相关
  private bookIconOriginalPosition: { x: number; y: number } | null = null;
  private isAnimating: boolean = false;

  // 书签动画相关
  private bookmarkOriginalPositions: Map<
    number,
    { x: number; y: number }
  > | null = null;

  // 防抖：记录上次点击时间
  private lastClickTime: number = 0;

  // 记录玩家是否曾经打开过书本
  private hasEverOpened: boolean = false;

  // 翻页动画状态
  private isFlipping: boolean = false;

  // 最后一次翻页方向
  private lastFlipDirection: 'next' | 'prev' = 'next';

  // 用户页码计数器（按照实际显示顺序连续编号）
  private userPageCounter: number = 0;

  // pageIndex到用户页码的映射：pageIndex -> userPageNumber
  // 例如：pageIndex=0 -> 0, pageIndex=1 -> 2, pageIndex=50 -> 4
  private bookmarkPageMap: Map<number, number> = new Map();

  /**
   * 更新bookIcon的原始位置（在UI缩放后调用）
   */
  updateIconOriginalPosition(): void {
    const bookIcon = this.getBookIcon();
    if (bookIcon) {
      this.bookIconOriginalPosition = {
        x: bookIcon.position.offset.x,
        y: bookIcon.position.offset.y,
      };
      console.log(
        '[BookUI] Updated bookIcon original position after scaling:',
        this.bookIconOriginalPosition
      );
    }
  }

  /**
   * 获取 bookIcon（现在在 windowTopRightAnchor 中）
   */
  private getBookIcon(): UiImage | null {
    if (!this.uiScreen) {
      return null;
    }

    // 尝试直接访问
    if (this.uiScreen.uiImage_bookIcon) {
      return this.uiScreen.uiImage_bookIcon;
    }

    // 如果直接访问失败，尝试从 windowTopRightAnchor 中查找
    const windowTopRightAnchor = (
      this.uiScreen as unknown as Record<string, unknown>
    ).uiBox_windowTopRightAnchor;
    if (
      windowTopRightAnchor &&
      typeof windowTopRightAnchor === 'object' &&
      windowTopRightAnchor !== null
    ) {
      const { findChildByName } = windowTopRightAnchor as {
        findChildByName?: (name: string) => UiImage | null;
      };
      const bookIcon = findChildByName?.('bookIcon');
      if (bookIcon) {
        return bookIcon;
      }
    }

    console.warn('[BookUI] bookIcon not found');
    return null;
  }

  /**
   * 获取书本容器（现在在 windowMiddleAnchor 中）
   */
  private getContainerLeft(): UiBox | null {
    if (!this.uiScreen) {
      return null;
    }

    // 尝试直接访问
    if (this.uiScreen.uiBox_bookElementContainerLeft) {
      return this.uiScreen.uiBox_bookElementContainerLeft;
    }

    // 如果直接访问失败，尝试从 windowMiddleAnchor 中查找
    const windowMiddleAnchor = (
      this.uiScreen as unknown as Record<string, unknown>
    ).uiBox_windowMiddleAnchor;
    if (
      windowMiddleAnchor &&
      typeof windowMiddleAnchor === 'object' &&
      windowMiddleAnchor !== null
    ) {
      const { findChildByName } = windowMiddleAnchor as {
        findChildByName?: (name: string) => UiBox | null;
      };
      return findChildByName?.('bookElementContainerLeft') || null;
    }

    console.warn('[BookUI] bookElementContainerLeft not found');
    return null;
  }

  /**
   * 获取书本容器（现在在 windowMiddleAnchor 中）
   */
  private getContainerRight(): UiBox | null {
    if (!this.uiScreen) {
      return null;
    }

    // 尝试直接访问
    if (this.uiScreen.uiBox_bookElementContainerRight) {
      return this.uiScreen.uiBox_bookElementContainerRight;
    }

    // 如果直接访问失败，尝试从 windowMiddleAnchor 中查找
    const windowMiddleAnchor = (
      this.uiScreen as unknown as Record<string, unknown>
    ).uiBox_windowMiddleAnchor;
    if (
      windowMiddleAnchor &&
      typeof windowMiddleAnchor === 'object' &&
      windowMiddleAnchor !== null
    ) {
      const { findChildByName } = windowMiddleAnchor as {
        findChildByName?: (name: string) => UiBox | null;
      };
      return findChildByName?.('bookElementContainerRight') || null;
    }

    console.warn('[BookUI] bookElementContainerRight not found');
    return null;
  }

  /**
   * 获取翻页动画元素
   */
  private getFlipElements(): {
    flip1: UiImage | null;
    flip2: UiImage | null;
    flip3: UiImage | null;
  } {
    if (!this.uiScreen) {
      return { flip1: null, flip2: null, flip3: null };
    }

    const screen = this.uiScreen as unknown as Record<string, unknown>;

    return {
      flip1: (screen.uiImage_bookBgFlip1 as UiImage) || null,
      flip2: (screen.uiImage_bookBgFlip2 as UiImage) || null,
      flip3: (screen.uiImage_bookBgFlip3 as UiImage) || null,
    };
  }

  constructor() {
    BookUI.instanceCount++;

    this.eventBus = EventBus.instance;
    this.service = new BookService();
    this.controller = new BookController(this.service, this.eventBus);
    this.conditionChecker = new ConditionChecker();

    // 注意：setupEventListeners 会在 initialize 中调用
    // 必须在 calculateBookmarkPageNumbers 之后调用，否则第一次页面变化时 bookmarkPageMap 为空
  }

  /**
   * 初始化书本 UI
   * @param uiScreen UiIndex_screen 实例
   */
  async initialize(uiScreen: UiScreenInstance): Promise<void> {
    try {
      this.uiScreen = uiScreen;

      // 先初始化控制器数据（但不打开页面）
      await this.controller.initialize();

      // 计算每个书签的起始页码（必须在setupEventListeners之前）
      this.calculateBookmarkPageNumbers();

      // 设置事件监听器（必须在calculateBookmarkPageNumbers之后，controller.initialize之后）
      this.setupEventListeners();

      // 设置 UI 交互
      this.setupUIInteractions();

      // 初始状态：bookInvisible（只显示 icon）
      this.showBookInvisible();

      this.isInitialized = true;
    } catch (error) {
      console.error('[BookUI] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 计算每个书签的起始页码
   * 遍历validPageIndices，为每个书签范围内的pageIndex计算对应的用户页码
   */
  private calculateBookmarkPageNumbers(): void {
    const bookMarkData = this.service.getBookMarkData();
    if (!bookMarkData) {
      console.warn('[BookUI] No bookmark data available for page calculation');
      return;
    }

    const validPageIndices = this.controller.getValidPageIndices();
    let cumulativeUserPageNumber = 0;

    // 遍历每个书签
    bookMarkData.bookMarks.forEach((bookmark) => {
      const { pageNumberLeft, pageNumberRight } = bookmark;

      // 遍历所有validPageIndices，找到属于当前书签的pageIndex
      for (const pageIndex of validPageIndices) {
        const leftPageNum = pageIndex * 2;
        const rightPageNum = pageIndex * 2 + 1;

        // 检查这个pageIndex是否属于当前书签范围
        const inRange =
          (leftPageNum >= pageNumberLeft && leftPageNum <= pageNumberRight) ||
          (rightPageNum >= pageNumberLeft && rightPageNum <= pageNumberRight);

        if (inRange) {
          // 记录这个pageIndex对应的用户页码
          this.bookmarkPageMap.set(pageIndex, cumulativeUserPageNumber);

          // 每个pageIndex对应2页，累加
          cumulativeUserPageNumber += 2;
        }
      }
    });
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 防止重复注册 EventBus 监听器
    if (this.eventBusListenersSetup) {
      return;
    }

    // 监听页面变化事件
    this.eventBus.on(
      BookEvents.BOOK_PAGE_CHANGED,
      (payload: undefined | { pageNumber: string; pageIndex: number }) => {
        if (!payload) {
          return;
        }
        this.onPageChanged(payload.pageNumber, payload.pageIndex);
      }
    );

    // 监听书本关闭事件，显示 bookBgClosed 下的所有子元素
    this.eventBus.on(BookEvents.BOOK_CLOSE, () => {
      this.onBookClosed();
    });

    // 标记 EventBus 监听器已设置
    this.eventBusListenersSetup = true;
    console.log('[BookUI] EventBus listeners setup complete');
  }

  /**
   * 设置 UI 交互（按钮点击等）
   */
  private setupUIInteractions(): void {
    if (!this.uiScreen) {
      return;
    }

    // 防止重复注册事件监听器
    if (this.eventsSetup) {
      console.log('[BookUI] Events already setup, skipping...');
      return;
    }

    // 返回按钮
    const returnButton = this.uiScreen.uiImage_returnButton;
    if (returnButton) {
      returnButton.events.on('pointerdown', () => {
        // 防抖：记录点击时间
        this.lastClickTime = Date.now();
        this.close();
      });
    }

    // 左翻页按钮
    const toLeftPageButton = this.uiScreen.uiImage_toLeftPageButton;
    if (toLeftPageButton) {
      toLeftPageButton.events.on('pointerdown', () => {
        this.prev();
      });
    }

    // 右翻页按钮
    const toRightPageButton = this.uiScreen.uiImage_toRightPageButton;
    if (toRightPageButton) {
      toRightPageButton.events.on('pointerdown', () => {
        this.next();
      });
    }

    // 设置书签点击（5个书签）
    this.setupBookmarks();

    // bookIcon 点击触发打开动画
    const bookIcon = this.getBookIcon();
    if (bookIcon) {
      bookIcon.events.on('pointerdown', () => {
        if (!this.isAnimating) {
          // 如果曾经打开过，直接打开到书本内容
          // 如果没有打开过，显示封面
          if (this.hasEverOpened) {
            this.openWithAnimation();
          } else {
            this.openToCover();
          }
        }
      });
    }

    // 封面点击打开书本（保留，用于从封面状态打开）
    const bookBgClosed = this.uiScreen.uiImage_bookBgClosed;
    if (bookBgClosed) {
      bookBgClosed.events.on('pointerdown', () => {
        // 防抖：如果刚刚点击了 returnButton（100ms 内），忽略此次点击
        const timeSinceLastClick = Date.now() - this.lastClickTime;
        if (timeSinceLastClick < 100) {
          console.log(
            '[BookUI] Ignoring bookBgClosed click (too soon after returnButton)'
          );
          return;
        }
        this.open();
        // 标记为已经打开过
        this.hasEverOpened = true;
      });
    }

    // 标记事件已设置
    this.eventsSetup = true;
    console.log('[BookUI] UI interactions setup complete');
  }

  /**
   * 设置书签交互
   * 绑定书签1-10到json数组的index 0-9
   * 点击书签跳转到对应的 pageNumberLeft
   * 设置书签下的text元素为对应的label
   */
  private setupBookmarks(): void {
    if (!this.uiScreen) {
      return;
    }

    // 设置所有书签的点击事件（1-10）
    const bookmarks = this.getAllBookmarks();
    const bookMarkData = this.service.getBookMarkData();

    if (!bookMarkData) {
      console.warn('[BookUI] No bookmark data available, will retry on open');
      return;
    }

    bookmarks.forEach((image, index) => {
      if (image && bookMarkData.bookMarks[index]) {
        const bookmark = bookMarkData.bookMarks[index];

        // 设置书签下的文本元素
        this.setBookmarkLabel(image, bookmark.label, index + 1);

        // 绑定点击事件
        image.events.on('pointerdown', () => {
          console.log(
            `[BookUI] Bookmark ${index + 1} clicked: ${bookmark.label}, jumping to page ${bookmark.pageNumberLeft}`
          );

          // 跳转到书签的左侧页码（pageNumberLeft）
          // pageNumberLeft 是实际页码，需要转换为 pageIndex（每次显示2页）
          const pageIndex = Math.floor(bookmark.pageNumberLeft / 2);

          // 发送书签点击事件
          this.eventBus.emit(BookEvents.BOOK_BOOKMARK_CLICK, {
            bookmarkId: bookmark.id,
            pageNumber: bookmark.pageNumberLeft.toString(),
          });

          // 直接跳转到对应页面
          this.controller.gotoPageByIndex(pageIndex);
        });
      }
    });

    console.log(
      `[BookUI] ${bookmarks.length} bookmarks bound to data and labels set`
    );
  }

  /**
   * 设置书签的标签文本
   * @param bookmarkImage 书签图片元素
   * @param label 标签文本
   * @param bookmarkNumber 书签编号（1-10）
   */
  private setBookmarkLabel(
    bookmarkImage: UiImage,
    label: string,
    bookmarkNumber: number
  ): void {
    // 查找书签下的text子元素
    if (!bookmarkImage.children || bookmarkImage.children.length === 0) {
      console.warn(`[BookUI] Bookmark ${bookmarkNumber} has no children`);
      return;
    }

    // 遍历查找text元素
    for (const child of bookmarkImage.children) {
      const childName = child.name.toLowerCase();

      // 查找名称包含 'text' 或 'label' 的元素
      if (childName.includes('text') || childName.includes('label')) {
        const textElement = child as unknown as UiText;

        if ('textContent' in textElement) {
          textElement.textContent = label;
          textElement.visible = true;
          console.log(
            `[BookUI] Set bookmark ${bookmarkNumber} label: ${label}`
          );
          return;
        }
      }
    }

    console.warn(
      `[BookUI] No text element found in bookmark ${bookmarkNumber}`
    );
  }

  /**
   * 打开书本
   * @param pageNumber 指定页码，不提供则打开第一页
   */
  open(pageNumber?: string): void {
    if (!this.isInitialized) {
      console.warn('[BookUI] Not initialized yet');
      return;
    }

    // 隐藏封面，显示书本内容
    this.hideBookCover();
    this.showBookContent();

    // 打开到指定页（controller会触发pageChanged事件，自动更新userPageCounter）
    this.controller.open(pageNumber);
  }

  /**
   * 关闭书本（带动画）
   * 根据当前状态决定是关闭到 closed 还是 invisible
   */
  close(): void {
    if (!this.isInitialized) {
      console.warn('[BookUI] Not initialized yet');
      return;
    }

    if (this.isAnimating) {
      return;
    }

    // 检查当前状态
    const currentState = this.controller.getState();

    if (currentState === 'open') {
      // 从 opened 关闭到 closed，保留 returnButton
      this.closeToBookCover();
    } else if (currentState === 'closed') {
      // 从 closed 关闭到 invisible，隐藏 returnButton
      this.closeToInvisible();
    }
  }

  /**
   * 跳转到指定页
   * @param pageNumber 页码
   */
  goto(pageNumber: string): void {
    this.controller.gotoPage(pageNumber);
  }

  /**
   * 下一页（带翻页动画）
   */
  async next(): Promise<void> {
    // 防止动画期间重复点击
    if (this.isFlipping) {
      return;
    }

    this.isFlipping = true;
    this.lastFlipDirection = 'next'; // 记录翻页方向

    try {
      // 1. 立即隐藏当前页面内容
      this.hideAllPageContent();

      // 2. 播放翻页动画
      await this.playFlipAnimation('next');

      // 3. 动画完成后更新并显示新页面（会触发onPageChanged，自动更新userPageCounter）
      this.controller.nextPage();
    } finally {
      this.isFlipping = false;
    }
  }

  /**
   * 上一页（带翻页动画）
   */
  async prev(): Promise<void> {
    // 防止动画期间重复点击
    if (this.isFlipping) {
      return;
    }

    this.isFlipping = true;
    this.lastFlipDirection = 'prev'; // 记录翻页方向

    try {
      // 1. 立即隐藏当前页面内容
      this.hideAllPageContent();

      // 2. 播放翻页动画
      await this.playFlipAnimation('prev');

      // 3. 动画完成后更新并显示新页面（会触发onPageChanged，自动更新userPageCounter）
      this.controller.prevPage();
    } finally {
      this.isFlipping = false;
    }
  }

  /**
   * 根据当前pageIndex更新用户页码计数器
   * 直接从bookmarkPageMap中查找对应的用户页码
   */
  private updateUserPageCounter(pageIndex: number): void {
    // 直接从map中查找这个pageIndex对应的用户页码
    const userPageNumber = this.bookmarkPageMap.get(pageIndex);

    if (userPageNumber !== undefined) {
      this.userPageCounter = userPageNumber;
    } else {
      // 如果找不到，保持当前值（不应该发生，说明pageIndex不在validPageIndices中）
      console.warn(
        `[BookUI] No user page number found for pageIndex ${pageIndex}`
      );
    }
  }

  /**
   * 页面改变处理
   * 不再使用 JSON 配置的 pages，直接根据 pageIndex 计算要显示的页码
   * pageIndex 是当前的"翻页索引"，每次翻页 +2（因为一次显示两页）
   *
   * 左侧显示偶数页：pageIndex * 2 (0, 2, 4, 6...)
   * 右侧显示奇数页：pageIndex * 2 + 1 (1, 3, 5, 7...)
   */
  private onPageChanged(pageNumber: string, pageIndex: number): void {
    // 根据当前pageIndex计算应该显示的用户页码
    this.updateUserPageCounter(pageIndex);

    // 计算左右页码
    // pageIndex=0 → 左:0, 右:1
    // pageIndex=1 → 左:2, 右:3
    // pageIndex=2 → 左:4, 右:5
    const leftPageNum = pageIndex * 2;
    const rightPageNum = pageIndex * 2 + 1;

    // 使用用户页码计数器（连续编号，不跳跃）
    const leftDisplayPage = this.userPageCounter;
    const rightDisplayPage = this.userPageCounter + 1;

    // 显示左侧页面（偶数页）
    const foundLeft = this.renderPageByNumber(
      leftPageNum,
      'left',
      leftDisplayPage
    );

    // 显示右侧页面（奇数页）
    const foundRight = this.renderPageByNumber(
      rightPageNum,
      'right',
      rightDisplayPage
    );

    // 检查是否两侧都找不到页面
    if (!foundLeft && !foundRight) {
      console.warn(
        `[BookUI] Both pages not found: left=${leftPageNum}, right=${rightPageNum}, trying to find valid page`
      );
      // 尝试根据翻页方向查找有效页面
      this.tryFindValidPage(pageIndex, this.lastFlipDirection);
      return;
    }

    // 更新翻页按钮状态
    this.updateNavigationButtons();

    // 更新书签高亮状态
    this.updateBookmarkHighlight(leftPageNum, rightPageNum);
  }

  /**
   * 尝试查找有效页面
   * 当当前页面两侧都不存在时，根据方向查找下一个有效页面
   * @param currentPageIndex 当前页面索引
   * @param direction 查找方向：'next' 往后查找，'prev' 往前查找
   */
  private tryFindValidPage(
    currentPageIndex: number,
    direction: 'next' | 'prev'
  ): void {
    console.log(
      `[BookUI] Trying to find valid page from index ${currentPageIndex}, direction: ${direction}`
    );

    // 获取当前在有效页面列表中的位置
    const validPageIndices = this.controller.getValidPageIndices();
    const currentValidIndex = validPageIndices.indexOf(currentPageIndex);

    if (currentValidIndex === -1) {
      console.warn(
        `[BookUI] Current page ${currentPageIndex} not in valid page indices`
      );
      return;
    }

    if (direction === 'next') {
      // 往后查找（增大索引），用于往右翻页时
      for (let i = currentValidIndex + 1; i < validPageIndices.length; i++) {
        const testPageIndex = validPageIndices[i];
        const leftPageNum = testPageIndex * 2;
        const rightPageNum = testPageIndex * 2 + 1;

        // 检查这个页面是否至少有一侧存在
        const hasLeft = this.checkPageExists(leftPageNum, 'left');
        const hasRight = this.checkPageExists(rightPageNum, 'right');

        if (hasLeft || hasRight) {
          console.log(
            `[BookUI] Found valid page at index ${testPageIndex} (left: ${hasLeft}, right: ${hasRight})`
          );
          // 跳转到这个有效页面
          this.controller.gotoPageByIndex(testPageIndex);
          return;
        }
      }

      // 往后找不到有效页面，隐藏向右翻页按钮
      console.warn(
        '[BookUI] No valid pages found forward, hiding next page button'
      );
      this.hideNavigationButton('next');
    } else {
      // 往前查找（减小索引），用于往左翻页时
      for (let i = currentValidIndex - 1; i >= 0; i--) {
        const testPageIndex = validPageIndices[i];
        const leftPageNum = testPageIndex * 2;
        const rightPageNum = testPageIndex * 2 + 1;

        // 检查这个页面是否至少有一侧存在
        const hasLeft = this.checkPageExists(leftPageNum, 'left');
        const hasRight = this.checkPageExists(rightPageNum, 'right');

        if (hasLeft || hasRight) {
          console.log(
            `[BookUI] Found valid page at index ${testPageIndex} (left: ${hasLeft}, right: ${hasRight})`
          );
          // 跳转到这个有效页面
          this.controller.gotoPageByIndex(testPageIndex);
          return;
        }
      }

      // 往前找不到有效页面，隐藏向左翻页按钮
      console.warn(
        '[BookUI] No valid pages found backward, hiding prev page button'
      );
      this.hideNavigationButton('prev');
    }
  }

  /**
   * 检查指定页面是否存在
   * @param pageNum 页码
   * @param side 左侧或右侧
   * @returns 页面是否存在
   */
  private checkPageExists(pageNum: number, side: 'left' | 'right'): boolean {
    if (!this.uiScreen) {
      return false;
    }

    const container =
      side === 'left' ? this.getContainerLeft() : this.getContainerRight();

    if (!container || !container.children) {
      return false;
    }

    const targetPageNames = [
      `page-${pageNum}`,
      `page${pageNum}`,
      `Page-${pageNum}`,
      `Page${pageNum}`,
    ];

    for (const child of container.children) {
      const isTargetPage = targetPageNames.some(
        (targetName) => child.name.toLowerCase() === targetName.toLowerCase()
      );
      if (isTargetPage) {
        return true;
      }
    }

    return false;
  }

  /**
   * 根据页码渲染指定侧的页面
   * @param pageNum 页码（0, 1, 2, 3...）
   * @param side 'left' 或 'right'
   * @param displayPageNumber 显示页码（从1开始）
   * @returns 是否找到并显示了页面
   */
  private renderPageByNumber(
    pageNum: number,
    side: 'left' | 'right',
    displayPageNumber: number
  ): boolean {
    if (!this.uiScreen) {
      return false;
    }

    const container =
      side === 'left' ? this.getContainerLeft() : this.getContainerRight();

    if (!container) {
      console.warn(`[BookUI] ${side} container not found`);
      return false;
    }

    // 显示指定页码的 page 元素
    return this.showPageInContainer(container, pageNum, displayPageNumber);
  }

  /**
   * 隐藏所有页面内容
   * 在翻页动画开始前调用，立即隐藏当前显示的页面
   */
  private hideAllPageContent(): void {
    if (!this.uiScreen) {
      return;
    }

    const containerLeft = this.getContainerLeft();
    const containerRight = this.getContainerRight();

    // 隐藏左侧容器中的所有页面
    if (containerLeft && containerLeft.children) {
      for (const child of containerLeft.children) {
        const childName = child.name.toLowerCase();
        if (childName.startsWith('page')) {
          const pageBox = child as unknown as UiBox;
          pageBox.visible = false;
        }
      }
    }

    // 隐藏右侧容器中的所有页面
    if (containerRight && containerRight.children) {
      for (const child of containerRight.children) {
        const childName = child.name.toLowerCase();
        if (childName.startsWith('page')) {
          const pageBox = child as unknown as UiBox;
          pageBox.visible = false;
        }
      }
    }

    console.log('[BookUI] All page content hidden for flip animation');
  }

  /**
   * 在指定容器中显示指定页码的 page 元素
   * 命名规则：page-0, page-1, page-2...
   * 偶数页（0, 2, 4...）应该在 containerLeft 中
   * 奇数页（1, 3, 5...）应该在 containerRight 中
   * @param displayPageNumber 显示页码（从1开始）
   * @returns 是否找到并显示了页面
   */
  private showPageInContainer(
    container: UiBox,
    pageNumber: number,
    displayPageNumber: number
  ): boolean {
    console.log(`[BookUI] showPageInContainer: page ${pageNumber}`);

    const { children } = container;
    if (!children || children.length === 0) {
      console.warn('[BookUI] No children found in container');
      return false;
    }

    // 目标 page 元素名称（支持多种格式）
    const targetPageNames = [
      `page-${pageNumber}`,
      `page${pageNumber}`,
      `Page-${pageNumber}`,
      `Page${pageNumber}`,
    ];

    let foundPage = false;

    // 遍历所有子元素
    for (const child of children) {
      const { name } = child;
      const childName = name.toLowerCase();

      // 检查是否是 page 元素
      if (childName.startsWith('page')) {
        // 将 UiNode 转换为 UiBox（page 元素应该是 UiBox 类型）
        const pageBox = child as unknown as UiBox;

        // 检查是否是目标页码
        const isTargetPage = targetPageNames.some(
          (targetName) => name.toLowerCase() === targetName.toLowerCase()
        );

        if (isTargetPage) {
          // 找到目标页，显示并填充内容
          console.log(`[BookUI] Found target page: ${name}`);
          pageBox.visible = true;
          foundPage = true;

          // 设置页码（在page元素下查找pageNumber子元素）
          this.setPageNumber(child, displayPageNumber);

          // 填充页面内容
          this.fillPageContentInElement(child);
        } else {
          // 非目标页，隐藏
          pageBox.visible = false;
        }
      }
    }

    if (!foundPage) {
      console.warn(`[BookUI] Page element not found: page-${pageNumber}`);
    }

    return foundPage;
  }

  /**
   * 设置页面的页码显示
   * 在page元素的children中查找名为pageNumber的子元素并设置文本
   * @param pageElement page元素
   * @param displayPageNumber 显示页码（从1开始）
   */
  private setPageNumber(pageElement: UiNode, displayPageNumber: number): void {
    const pageChildren = pageElement.children;
    if (!pageChildren || pageChildren.length === 0) {
      return;
    }

    // 查找名为 pageNumber 的子元素
    for (const child of pageChildren) {
      const childName = child.name.toLowerCase();

      if (childName === 'pagenumber' || childName.startsWith('pagenumber')) {
        const uiText = child as unknown as UiText;
        if ('textContent' in uiText) {
          uiText.textContent = displayPageNumber.toString();
          uiText.visible = true;
          console.log(
            `[BookUI] Set pageNumber element to: ${displayPageNumber}`
          );
          return; // 找到并设置后立即返回
        }
      }
    }

    // 如果没找到pageNumber元素，不输出警告（因为不是所有page都需要显示页码）
  }

  /**
   * 填充单个 page 元素的内容
   * 遍历 page 的子元素，查找 title/paragraph/subtitle/image 文本元素
   * 使用元素的 textContent 作为 i18n key，从 JSON 中获取对应的文本内容
   * 支持条件显示：如果元素名称以 "c-" 开头，则检查条件是否满足
   */
  private async fillPageContentInElement(pageElement: UiNode): Promise<void> {
    const pageChildren = pageElement.children;
    if (!pageChildren || pageChildren.length === 0) {
      return;
    }

    // 遍历 page 的子元素，查找文本和图片元素
    for (const element of pageChildren) {
      const { name } = element;
      const elementName = name.toLowerCase();

      // 检查是否是条件元素（名称以 "c-" 开头）
      const isConditional = elementName.startsWith('c-');

      // 如果是条件元素，检查条件
      if (isConditional) {
        const shouldShow = await this.checkElementCondition(elementName);
        if (!shouldShow) {
          // 条件不满足，隐藏元素
          const uiElement = element as unknown as { visible: boolean };
          if ('visible' in uiElement) {
            uiElement.visible = false;
          }
          console.log(
            `[BookUI] Hidden conditional element: ${elementName} (condition not met)`
          );
          continue;
        }
      }

      // 检查是否是文本元素 (title, paragraph, subtitle)
      if (
        elementName.startsWith('title') ||
        elementName.startsWith('c-title') ||
        elementName.startsWith('paragraph') ||
        elementName.startsWith('c-paragraph') ||
        elementName.startsWith('subtitle') ||
        elementName.startsWith('c-subtitle')
      ) {
        // 尝试将元素转换为 UiText 类型
        const uiText = element as unknown as UiText;

        // 检查是否具有 textContent 属性（UiText 特征）
        if ('textContent' in uiText) {
          // 使用元素当前的 textContent 作为 i18n key
          const i18nKey = uiText.textContent || '';

          if (i18nKey) {
            // 从 JSON 数据中获取对应的文本内容
            const translatedText = this.service.getText(i18nKey, i18nKey);

            // 设置文本内容
            uiText.textContent = translatedText;
            uiText.visible = true;

            console.log(
              `[BookUI] Filled text: ${elementName} -> ${i18nKey} -> ${translatedText.substring(0, 30)}`
            );
          }
        }
      }

      // 检查是否是图片元素
      if (
        elementName.startsWith('image') ||
        elementName.startsWith('c-image')
      ) {
        const uiImage = element as unknown as UiImage;
        if ('visible' in uiImage) {
          uiImage.visible = true;
          console.log(`[BookUI] Showing image: ${elementName}`);
        }
      }
    }
  }

  /**
   * 检查元素是否满足显示条件
   * @param elementName 元素名称（例如 "c-image-1"）
   * @returns 是否满足条件
   */
  private async checkElementCondition(elementName: string): Promise<boolean> {
    // 移除 "c-" 前缀，提取元素ID
    // 例如：c-image-1 -> image-1, c-paragraph-secret -> paragraph-secret
    const elementId = elementName.substring(2);

    // 从服务中获取条件配置
    const conditionConfig = this.service.getConditionConfig(elementId);

    if (!conditionConfig) {
      // 没有找到条件配置，默认显示
      console.warn(
        `[BookUI] No condition config found for: ${elementId}, showing by default`
      );
      return true;
    }

    try {
      // 使用 conditionChecker 检查条件
      const result =
        await this.conditionChecker.checkConditions(conditionConfig);
      console.log(`[BookUI] Condition check for ${elementId}: ${result}`);
      return result;
    } catch (error) {
      console.error(
        `[BookUI] Error checking condition for ${elementId}:`,
        error
      );
      // 出错时默认不显示
      return false;
    }
  }

  /**
   * 清空左侧页面（隐藏所有文本元素）
   */
  private clearLeftPage(): void {
    if (!this.uiScreen) {
      return;
    }
    const container = this.getContainerLeft();
    if (container) {
      this.hidePageContent(container);
    }
  }

  /**
   * 清空右侧页面（隐藏所有文本元素）
   */
  private clearRightPage(): void {
    if (!this.uiScreen) {
      return;
    }
    const container = this.getContainerRight();
    if (container) {
      this.hidePageContent(container);
    }
  }

  /**
   * 隐藏页面内容（将所有文本元素设为不可见）
   */
  private hidePageContent(container: UiBox): void {
    const { children } = container;
    if (!children || children.length === 0) {
      return;
    }

    // 遍历所有 page 元素
    for (const child of children) {
      const { name } = child;
      const childName = name.toLowerCase();

      if (childName.startsWith('page')) {
        const pageChildren = child.children;
        if (!pageChildren || pageChildren.length === 0) {
          continue;
        }

        // 隐藏所有文本元素
        for (const textElement of pageChildren) {
          const elementName = textElement.name.toLowerCase();

          if (
            elementName.startsWith('title') ||
            elementName.startsWith('paragraph') ||
            elementName.startsWith('subtitle')
          ) {
            const uiText = textElement as unknown as UiText;
            if ('visible' in uiText) {
              uiText.visible = false;
            }
          }
        }
      }
    }
  }

  /**
   * 书本关闭事件处理
   * 显示 bookBgClosed 下的所有子元素
   */
  private onBookClosed(): void {
    if (!this.uiScreen) {
      console.warn('[BookUI] UI screen not initialized');
      return;
    }

    const bookBgClosed = this.uiScreen.uiImage_bookBgClosed;

    if (!bookBgClosed) {
      console.warn('[BookUI] bookBgClosed not found');
      return;
    }

    // 显示 bookBgClosed 及其所有子元素
    bookBgClosed.visible = true;
    bookBgClosed.imageOpacity = 1;

    if (bookBgClosed.children) {
      for (const child of bookBgClosed.children) {
        if (child && 'visible' in child) {
          (child as { visible: boolean }).visible = true;
        }
      }
    }
  }

  /**
   * 显示书本封面
   */
  private showBookCover(): void {
    if (!this.uiScreen) {
      console.warn('[BookUI] UI screen not initialized');
      return;
    }

    try {
      const bookBgClosed = this.uiScreen.uiImage_bookBgClosed;
      const bookBgOpened = this.uiScreen.uiImage_bookBgOpened;
      const bookElementContainerLeft = this.getContainerLeft();
      const bookElementContainerRight = this.getContainerRight();

      const returnButton = this.uiScreen.uiImage_returnButton;

      // 显示封面
      if (bookBgClosed) {
        console.log('[BookUI] Setting bookBgClosed visible = true');
        bookBgClosed.visible = true;
        bookBgClosed.imageOpacity = 1;
      }

      // 恢复 returnButton 的透明度（准备下次显示）
      if (returnButton) {
        returnButton.imageOpacity = 1;
        console.log('[BookUI] Reset returnButton opacity to 1');
      }

      // 恢复 bookBgClosed 子元素的可见性
      if (bookBgClosed && bookBgClosed.children) {
        for (const child of bookBgClosed.children) {
          if (child && 'visible' in child) {
            (child as { visible: boolean }).visible = true;
          }
        }
      }

      // 隐藏打开状态的书
      if (bookBgOpened) {
        bookBgOpened.visible = false;
      }
      if (bookElementContainerLeft) {
        bookElementContainerLeft.visible = false;
      }
      if (bookElementContainerRight) {
        bookElementContainerRight.visible = false;
      }

      // 不改变 returnButton 的 visible 状态，保持当前状态
      // (opened->closed 时保留，invisible 时已经是隐藏的)

      // 隐藏所有书签
      const bookmarks = this.getAllBookmarks();
      bookmarks.forEach((bookmark) => {
        bookmark.visible = false;
      });
    } catch (error) {
      console.error('[BookUI] Error in showBookCover:', error);
      throw error;
    }
  }

  /**
   * 隐藏书本封面
   */
  private hideBookCover(): void {
    if (!this.uiScreen) {
      console.warn('[BookUI] UI screen not initialized');
      return;
    }

    const bookBgClosed = this.uiScreen.uiImage_bookBgClosed;
    if (bookBgClosed) {
      bookBgClosed.visible = false;
    }
  }

  /**
   * 显示书本内容
   */
  private showBookContent(): void {
    if (!this.uiScreen) {
      console.warn('[BookUI] UI screen not initialized');
      return;
    }

    const bookBgOpened = this.uiScreen.uiImage_bookBgOpened;
    const bookElementContainerLeft = this.getContainerLeft();
    const bookElementContainerRight = this.getContainerRight();
    const returnButton = this.uiScreen.uiImage_returnButton;

    // 显示书本打开状态的背景
    if (bookBgOpened) {
      bookBgOpened.visible = true;
      bookBgOpened.imageOpacity = 1;
    }

    // 显示左右容器
    if (bookElementContainerLeft) {
      bookElementContainerLeft.visible = true;
    }
    if (bookElementContainerRight) {
      bookElementContainerRight.visible = true;
    }

    // 显示返回按钮
    if (returnButton) {
      returnButton.visible = true;
      returnButton.imageOpacity = 1; // 重置透明度
    }

    // 重新设置书签（确保数据已加载且文本已设置）
    if (!this.eventsSetup) {
      this.setupBookmarks();
    } else {
      // 即使事件已设置，也要更新书签文本（可能语言已切换）
      this.updateBookmarkLabels();
    }

    // 显示书签（已达成和未达成）- 带动画
    this.animateBookmarksIn().then(() => {
      // 动画完成后，根据当前页面更新书签高亮
      const currentPageIndex = this.controller.getCurrentPageIndex();
      if (currentPageIndex >= 0) {
        const leftPageNum = currentPageIndex * 2;
        const rightPageNum = currentPageIndex * 2 + 1;
        this.updateBookmarkHighlight(leftPageNum, rightPageNum);
      }
    });

    console.log(
      '[BookUI] Book content shown: bookBgOpened, returnButton, bookmarks'
    );
  }

  /**
   * 更新书签标签文本（不重新绑定事件）
   */
  private updateBookmarkLabels(): void {
    const bookmarks = this.getAllBookmarks();
    const bookMarkData = this.service.getBookMarkData();

    if (!bookMarkData) {
      console.warn('[BookUI] No bookmark data available for label update');
      return;
    }

    bookmarks.forEach((image, index) => {
      if (image && bookMarkData.bookMarks[index]) {
        const bookmark = bookMarkData.bookMarks[index];
        this.setBookmarkLabel(image, bookmark.label, index + 1);
      }
    });

    console.log('[BookUI] Bookmark labels updated');
  }

  /**
   * 更新书签高亮状态
   * 检查当前页面是否在书签范围内，并相应地调整不透明度
   * @param leftPageNum 左侧页码
   * @param rightPageNum 右侧页码
   */
  private updateBookmarkHighlight(
    leftPageNum: number,
    rightPageNum: number
  ): void {
    const bookmarks = this.getAllBookmarks();
    const bookMarkData = this.service.getBookMarkData();

    if (!bookMarkData) {
      return;
    }

    bookmarks.forEach((image, index) => {
      if (!image || !bookMarkData.bookMarks[index]) {
        return;
      }

      const bookmark = bookMarkData.bookMarks[index];
      const { pageNumberLeft, pageNumberRight } = bookmark;

      // 检查当前展示的页面是否在书签范围内
      // 只要左页或右页有一个在范围内，就认为在范围内
      const isInRange =
        (leftPageNum >= pageNumberLeft && leftPageNum <= pageNumberRight) ||
        (rightPageNum >= pageNumberLeft && rightPageNum <= pageNumberRight) ||
        (leftPageNum <= pageNumberLeft && rightPageNum >= pageNumberRight);

      // 设置目标不透明度
      const targetOpacity = isInRange ? 1.0 : 0.4;

      // 使用动画过渡
      this.animateBookmarkOpacity(image, targetOpacity);

      if (isInRange) {
        console.log(
          `[BookUI] Bookmark ${index + 1} (${bookmark.label}) is in range [${pageNumberLeft}-${pageNumberRight}], highlighting`
        );
      }
    });
  }

  /**
   * 动画改变书签的不透明度
   * @param bookmark 书签元素
   * @param targetOpacity 目标不透明度（0-1）
   */
  private animateBookmarkOpacity(
    bookmark: UiImage,
    targetOpacity: number
  ): void {
    if (!bookmark) {
      return;
    }

    const currentOpacity = bookmark.imageOpacity || 1;

    // 如果已经是目标不透明度，不需要动画
    if (Math.abs(currentOpacity - targetOpacity) < 0.01) {
      return;
    }

    // 使用简单的淡入淡出动画（200ms）
    const duration = 200;
    const startOpacity = currentOpacity;
    const startTime = Date.now();
    const frameTime = 16; // 约60fps

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用缓动函数（easeInOutQuad）
      const easeProgress =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      bookmark.imageOpacity =
        startOpacity + (targetOpacity - startOpacity) * easeProgress;

      if (progress < 1) {
        setTimeout(animate, frameTime);
      } else {
        bookmark.imageOpacity = targetOpacity;
      }
    };

    animate();
  }

  /**
   * 播放翻页动画
   * @param direction 'next' 往右翻页（下一页），'prev' 往左翻页（上一页）
   * @returns Promise 动画完成后resolve
   */
  private async playFlipAnimation(direction: 'next' | 'prev'): Promise<void> {
    const { flip1, flip2, flip3 } = this.getFlipElements();

    if (!flip1 || !flip2 || !flip3) {
      console.warn(
        '[BookUI] Flip animation elements not found, skipping animation'
      );
      return;
    }

    console.log(`[BookUI] Playing flip animation: ${direction}`);

    // 确定动画顺序
    const elements =
      direction === 'next'
        ? [flip1, flip2, flip3] // 往右：1 → 2 → 3
        : [flip3, flip2, flip1]; // 往左：3 → 2 → 1

    // 初始化：隐藏所有翻页元素
    [flip1, flip2, flip3].forEach((el) => {
      el.visible = false;
      el.imageOpacity = 0;
    });

    // 动画参数
    const fadeInDuration = 100; // 渐显时长
    const holdDuration = 50; // 保持时长
    const fadeOutDuration = 100; // 渐隐时长

    // 播放重叠动画：当前元素渐隐的同时，下一个元素开始渐显
    for (let i = 0; i < elements.length; i++) {
      const currentElement = elements[i];
      const nextElement = elements[i + 1];

      // 显示并渐显当前元素
      currentElement.visible = true;
      await this.fadeIn(currentElement, fadeInDuration);

      // 保持
      await this.delay(holdDuration);

      // 渐隐当前元素，同时渐显下一个元素（如果有）
      if (nextElement) {
        // 并行执行：当前元素渐隐 + 下一个元素渐显
        nextElement.visible = true;
        await Promise.all([
          this.fadeOut(currentElement, fadeOutDuration),
          this.fadeIn(nextElement, fadeInDuration),
        ]);
        currentElement.visible = false;
      } else {
        // 最后一个元素，只需要渐隐
        await this.fadeOut(currentElement, fadeOutDuration);
        currentElement.visible = false;
      }
    }

    console.log('[BookUI] Flip animation completed');
  }

  /**
   * 获取所有书签元素（1-10）
   */
  private getAllBookmarks(): UiImage[] {
    if (!this.uiScreen) {
      return [];
    }

    return [
      this.uiScreen.uiImage_bookmark1,
      this.uiScreen.uiImage_bookmark2,
      this.uiScreen.uiImage_bookmark3,
      this.uiScreen.uiImage_bookmark4,
      this.uiScreen.uiImage_bookmark5,
      this.uiScreen.uiImage_bookmark6,
      this.uiScreen.uiImage_bookmark7,
      this.uiScreen.uiImage_bookmark8,
      this.uiScreen.uiImage_bookmark9,
      this.uiScreen.uiImage_bookmark10,
    ].filter((bookmark) => bookmark !== undefined) as UiImage[];
  }

  /**
   * 书签滑入动画
   * 从原位置左侧200px滑入到原位置，顺序执行，间隔50ms
   */
  private async animateBookmarksIn(): Promise<void> {
    const bookmarks = this.getAllBookmarks();
    if (bookmarks.length === 0) {
      return;
    }

    // 记录每个书签的原始位置（如果还没记录）
    if (!this.bookmarkOriginalPositions) {
      this.bookmarkOriginalPositions = new Map();
      bookmarks.forEach((bookmark, index) => {
        this.bookmarkOriginalPositions!.set(index, {
          x: bookmark.position.offset.x,
          y: bookmark.position.offset.y,
        });
      });
    }

    // 顺序为每个书签执行滑入动画
    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];
      const originalPos = this.bookmarkOriginalPositions.get(i);

      if (!originalPos) {
        continue;
      }

      // 设置初始位置：原位置 - 左偏移200px
      bookmark.position.offset.x = originalPos.x - 200;
      bookmark.position.offset.y = originalPos.y;
      bookmark.visible = true;
      bookmark.imageOpacity = 1;

      // 动画滑入到原位置（300ms）
      this.animatePosition(bookmark, originalPos.x, originalPos.y, 300);

      // 等待50ms再执行下一个书签
      if (i < bookmarks.length - 1) {
        await this.delay(50);
      }
    }

    console.log(`[BookUI] ${bookmarks.length} bookmarks animated in`);
  }

  /**
   * 更新翻页按钮状态
   * 不仅检查是否有上一页/下一页，还要检查是否真的有可显示的page元素
   */
  private updateNavigationButtons(): void {
    if (!this.uiScreen) {
      console.warn('[BookUI] UI screen not initialized');
      return;
    }

    const toLeftPageButton = this.uiScreen.uiImage_toLeftPageButton;
    const toRightPageButton = this.uiScreen.uiImage_toRightPageButton;

    // 检查是否有上一页
    if (toLeftPageButton) {
      const hasPrev =
        this.controller.hasPrevPage() && this.hasValidPageInDirection('prev');
      toLeftPageButton.visible = hasPrev;
    }

    // 检查是否有下一页
    if (toRightPageButton) {
      const hasNext =
        this.controller.hasNextPage() && this.hasValidPageInDirection('next');
      toRightPageButton.visible = hasNext;
    }
  }

  /**
   * 检查指定方向是否有有效的可显示页面
   * @param direction 'next' 检查往后，'prev' 检查往前
   * @returns 是否存在有效页面
   */
  private hasValidPageInDirection(direction: 'next' | 'prev'): boolean {
    const validPageIndices = this.controller.getValidPageIndices();
    const currentPageIndex = this.controller.getCurrentPageIndex();
    const currentValidIndex = validPageIndices.indexOf(currentPageIndex);

    if (currentValidIndex === -1) {
      return false;
    }

    if (direction === 'next') {
      // 检查往后是否有有效页面
      for (let i = currentValidIndex + 1; i < validPageIndices.length; i++) {
        const testPageIndex = validPageIndices[i];
        const leftPageNum = testPageIndex * 2;
        const rightPageNum = testPageIndex * 2 + 1;

        // 检查是否至少有一侧page元素存在
        const hasLeft = this.checkPageExists(leftPageNum, 'left');
        const hasRight = this.checkPageExists(rightPageNum, 'right');

        if (hasLeft || hasRight) {
          return true; // 找到有效页面
        }
      }
      return false; // 往后没有有效页面
    } else {
      // 检查往前是否有有效页面
      for (let i = currentValidIndex - 1; i >= 0; i--) {
        const testPageIndex = validPageIndices[i];
        const leftPageNum = testPageIndex * 2;
        const rightPageNum = testPageIndex * 2 + 1;

        // 检查是否至少有一侧page元素存在
        const hasLeft = this.checkPageExists(leftPageNum, 'left');
        const hasRight = this.checkPageExists(rightPageNum, 'right');

        if (hasLeft || hasRight) {
          return true; // 找到有效页面
        }
      }
      return false; // 往前没有有效页面
    }
  }

  /**
   * 隐藏指定方向的翻页按钮
   * @param direction 'next' 隐藏向右按钮，'prev' 隐藏向左按钮
   */
  private hideNavigationButton(direction: 'next' | 'prev'): void {
    if (!this.uiScreen) {
      return;
    }

    if (direction === 'next') {
      const toRightPageButton = this.uiScreen.uiImage_toRightPageButton;
      if (toRightPageButton) {
        toRightPageButton.visible = false;
      }
    } else {
      const toLeftPageButton = this.uiScreen.uiImage_toLeftPageButton;
      if (toLeftPageButton) {
        toLeftPageButton.visible = false;
      }
    }
  }

  /**
   * 显示 bookInvisible 状态（只显示 icon）
   */
  private showBookInvisible(): void {
    if (!this.uiScreen) {
      console.warn('[BookUI] UI screen not initialized');
      return;
    }

    const bookIcon = this.getBookIcon();
    const bookBgClosed = this.uiScreen.uiImage_bookBgClosed;
    const bookBgOpened = this.uiScreen.uiImage_bookBgOpened;
    const bookElementContainerLeft = this.getContainerLeft();
    const bookElementContainerRight = this.getContainerRight();

    // 保存 icon 原始位置
    if (bookIcon && !this.bookIconOriginalPosition) {
      this.bookIconOriginalPosition = {
        x: bookIcon.position.offset.x,
        y: bookIcon.position.offset.y,
      };
      console.log(
        '[BookUI] Saved bookIcon original position:',
        this.bookIconOriginalPosition
      );
    }

    // 只显示 icon
    if (bookIcon) {
      bookIcon.visible = true;
      bookIcon.imageOpacity = 1;
    }

    // 隐藏所有书本元素
    if (bookBgClosed) {
      bookBgClosed.visible = false;
      bookBgClosed.imageOpacity = 0;
    }
    if (bookBgOpened) {
      bookBgOpened.visible = false;
      bookBgOpened.imageOpacity = 0;
    }
    if (bookElementContainerLeft) {
      bookElementContainerLeft.visible = false;
    }
    if (bookElementContainerRight) {
      bookElementContainerRight.visible = false;
    }

    // 隐藏返回按钮
    const returnButton = this.uiScreen.uiImage_returnButton;
    if (returnButton) {
      returnButton.visible = false;
    }

    // 隐藏所有书签
    const bookmarks = this.getAllBookmarks();
    bookmarks.forEach((bookmark) => {
      bookmark.visible = false;
    });

    console.log('[BookUI] showBookInvisible completed: only bookIcon visible');
  }

  /**
   * 打开到封面（icon 动画）
   */
  private async openToCover(): Promise<void> {
    if (!this.uiScreen || this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    const bookIcon = this.getBookIcon();

    if (!bookIcon) {
      console.warn('[BookUI] bookIcon not found');
      this.isAnimating = false;
      return;
    }

    console.log('[BookUI] Opening to cover');

    try {
      // 1. icon 移动到屏幕中间并渐隐（500ms）

      await this.fadeOut(bookIcon, 300);

      // 2. 隐藏 icon
      bookIcon.visible = false;

      // 3. 显示封面
      this.showBookCover();
      const bookBgClosed = this.uiScreen.uiImage_bookBgClosed;
      if (bookBgClosed) {
        bookBgClosed.imageOpacity = 0;
        await this.fadeIn(bookBgClosed, 300);
      }

      console.log('[BookUI] Opened to cover');
    } catch (error) {
      console.error('[BookUI] Open to cover animation failed:', error);
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 带动画打开书本（到上次页面）
   */
  private async openWithAnimation(): Promise<void> {
    if (!this.uiScreen || this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    const bookIcon = this.getBookIcon();

    if (!bookIcon) {
      console.warn('[BookUI] bookIcon not found');
      this.isAnimating = false;
      return;
    }

    console.log('[BookUI] Starting open animation');

    try {
      // 1. icon 移动到屏幕中间并渐隐（500ms）

      await this.fadeOut(bookIcon, 300);

      // 2. 隐藏 icon
      bookIcon.visible = false;

      // 3. 显示书本打开的内容并渐显（300ms）
      const bookBgOpened = this.uiScreen.uiImage_bookBgOpened;
      if (bookBgOpened) {
        bookBgOpened.imageOpacity = 0;
      }

      // 打开书本（会调用 showBookContent）
      this.open();

      // 标记为已经打开过
      this.hasEverOpened = true;

      // 渐显书本背景
      if (bookBgOpened) {
        await this.fadeIn(bookBgOpened, 300);
      }
    } catch (error) {
      console.error('[BookUI] Open animation failed:', error);
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 关闭到封面状态（opened -> closed）
   * returnButton 保留
   */
  private async closeToBookCover(): Promise<void> {
    if (!this.uiScreen || this.isAnimating) {
      return;
    }

    this.isAnimating = true;

    try {
      // 1. 关闭书本内容
      this.controller.close();

      // 2. 隐藏容器的所有子元素（避免渐隐时影响观感）
      const bookBgOpened = this.uiScreen.uiImage_bookBgOpened;
      const containerLeft = this.getContainerLeft();
      const containerRight = this.getContainerRight();

      // 隐藏 containerLeft 的所有子元素
      if (containerLeft && containerLeft.children) {
        for (const child of containerLeft.children) {
          if (child && 'visible' in child) {
            (child as { visible: boolean }).visible = false;
          }
        }
      }

      // 隐藏 containerRight 的所有子元素
      if (containerRight && containerRight.children) {
        for (const child of containerRight.children) {
          if (child && 'visible' in child) {
            (child as { visible: boolean }).visible = false;
          }
        }
      }

      // 收集所有书签
      const bookmarks = this.getAllBookmarks();

      // 3. 书本内容渐隐（不包括 returnButton）
      await Promise.all([
        bookBgOpened ? this.fadeOut(bookBgOpened, 300) : Promise.resolve(),
        containerLeft ? this.fadeOut(containerLeft, 300) : Promise.resolve(),
        containerRight ? this.fadeOut(containerRight, 300) : Promise.resolve(),
        ...bookmarks.map((bookmark) => this.fadeOut(bookmark, 300)),
      ]);

      // 4. 隐藏书本打开元素
      if (bookBgOpened) {
        bookBgOpened.visible = false;
        bookBgOpened.imageOpacity = 0;
      }
      if (containerLeft) {
        containerLeft.visible = false;
      }
      if (containerRight) {
        containerRight.visible = false;
      }

      // 隐藏书签（但不隐藏 returnButton）
      bookmarks.forEach((bookmark) => {
        bookmark.visible = false;
      });

      // 5. 显示封面并渐显
      const bookBgClosed = this.uiScreen.uiImage_bookBgClosed;
      if (bookBgClosed) {
        bookBgClosed.visible = true;
        await new Promise((resolve) => setTimeout(resolve, 300));
        bookBgClosed.imageOpacity = 1;
        // 显示 bookBgClosed 的所有子元素
        if (bookBgClosed.children) {
          for (const child of bookBgClosed.children) {
            if (child && 'visible' in child) {
              (child as { visible: boolean }).visible = true;
            }
          }
          console.log(
            `[BookUI] Displayed ${bookBgClosed.children.length} child elements under bookBgClosed`
          );
        }
      }
    } catch (error) {
      console.error('[BookUI] Close to cover animation failed:', error);
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 关闭到不可见状态（closed -> invisible）
   * returnButton 隐藏
   */
  private async closeToInvisible(): Promise<void> {
    if (!this.uiScreen || this.isAnimating) {
      return;
    }

    this.isAnimating = true;

    try {
      // 1. 关闭书本内容，显示封面
      this.controller.close();

      // 2. 隐藏容器和封面的所有子元素（避免渐隐时影响观感）
      const bookBgClosed = this.uiScreen.uiImage_bookBgClosed;
      const bookBgOpened = this.uiScreen.uiImage_bookBgOpened;
      const containerLeft = this.getContainerLeft();
      const containerRight = this.getContainerRight();
      const returnButton = this.uiScreen.uiImage_returnButton;

      // 隐藏 containerLeft 的所有子元素
      if (containerLeft && containerLeft.children) {
        for (const child of containerLeft.children) {
          if (child && 'visible' in child) {
            (child as { visible: boolean }).visible = false;
          }
        }
      }

      // 隐藏 containerRight 的所有子元素
      if (containerRight && containerRight.children) {
        for (const child of containerRight.children) {
          if (child && 'visible' in child) {
            (child as { visible: boolean }).visible = false;
          }
        }
      }

      // 隐藏 bookBgClosed 的所有子元素
      if (bookBgClosed && bookBgClosed.children) {
        for (const child of bookBgClosed.children) {
          if (child && 'visible' in child) {
            (child as { visible: boolean }).visible = false;
          }
        }
      }

      // 收集所有书签
      const bookmarks = this.getAllBookmarks();

      // 3. 所有元素一起渐隐（包括 returnButton）
      await Promise.all([
        bookBgClosed ? this.fadeOut(bookBgClosed, 300) : Promise.resolve(),
        bookBgOpened ? this.fadeOut(bookBgOpened, 300) : Promise.resolve(),
        containerLeft ? this.fadeOut(containerLeft, 300) : Promise.resolve(),
        containerRight ? this.fadeOut(containerRight, 300) : Promise.resolve(),
        returnButton ? this.fadeOut(returnButton, 300) : Promise.resolve(),
        ...bookmarks.map((bookmark) => this.fadeOut(bookmark, 300)),
      ]);

      // 4. 隐藏所有元素
      if (bookBgClosed) {
        bookBgClosed.visible = false;
        bookBgClosed.imageOpacity = 0;
      }
      if (bookBgOpened) {
        bookBgOpened.visible = false;
        bookBgOpened.imageOpacity = 0;
      }
      if (containerLeft) {
        containerLeft.visible = false;
      }
      if (containerRight) {
        containerRight.visible = false;
      }

      // 隐藏 returnButton 和书签
      if (returnButton) {
        returnButton.visible = false;
        returnButton.imageOpacity = 0;
      }

      bookmarks.forEach((bookmark) => {
        bookmark.visible = false;
      });

      // 5. 显示 icon 并渐显（在屏幕中心）
      const bookIcon = this.getBookIcon();
      if (bookIcon) {
        bookIcon.visible = true;
        bookIcon.position.offset.x = 0; // 中心位置
        bookIcon.position.offset.y = 0;
        bookIcon.imageOpacity = 0;
        await this.fadeIn(bookIcon, 300);

        // 5. 等待 1 秒后，icon 回到原位
        await this.delay(1000);
        if (this.bookIconOriginalPosition) {
          await this.animateIconToPosition(
            bookIcon,
            this.bookIconOriginalPosition.x,
            this.bookIconOriginalPosition.y,
            500
          );
        }
      }

      console.log('[BookUI] Closed to invisible, all elements hidden');
    } catch (error) {
      console.error('[BookUI] Close to invisible animation failed:', error);
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 动画：将 icon 移动到指定位置
   */
  private animateIconToCenter(
    element: UiImage,
    targetX: number,
    targetY: number,
    duration: number
  ): Promise<void> {
    return Animation.animatePosition(element, targetX, targetY, duration);
  }

  /**
   * 动画：将元素移动到指定位置（通用方法）
   */
  private animatePosition(
    element: UiImage,
    targetX: number,
    targetY: number,
    duration: number
  ): Promise<void> {
    return Animation.animatePosition(element, targetX, targetY, duration);
  }

  /**
   * 动画：将 icon 移动到指定位置
   */
  private animateIconToPosition(
    element: UiImage,
    targetX: number,
    targetY: number,
    duration: number
  ): Promise<void> {
    return Animation.animatePosition(element, targetX, targetY, duration);
  }

  /**
   * 渐显动画（仅对 UiImage 有效，UiBox 立即完成）
   */
  private fadeIn(element: UiImage | UiBox, duration: number): Promise<void> {
    // UiBox 不需要透明度动画，立即返回
    if (!('imageOpacity' in element)) {
      return Promise.resolve();
    }

    return Animation.animateOpacity(element as UiImage, 1, duration);
  }

  /**
   * 渐隐动画（仅对 UiImage 有效，UiBox 立即完成）
   */
  private fadeOut(element: UiImage | UiBox, duration: number): Promise<void> {
    // UiBox 不需要透明度动画，立即返回
    if (!('imageOpacity' in element)) {
      return Promise.resolve();
    }

    return Animation.animateOpacity(element as UiImage, 0, duration);
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return Animation.delay(ms);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.controller.dispose();
    this.service.dispose();
    this.isInitialized = false;
  }
}
