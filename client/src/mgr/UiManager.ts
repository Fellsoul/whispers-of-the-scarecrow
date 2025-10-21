/**
 * UI 管理器
 * UI Manager - 负责注册、路由和管理所有 UI 模块
 */

import { Singleton } from '../core/patterns/Singleton';
import { EventBus } from '../core/events/EventBus';
import { BookUI } from '../ui/book/BookUI';
import type { UiScreenInstance } from '../ui/book/BookUI';
import { BookEvents } from '../ui/book/events';
import { JsonManager, JsonDataType } from './JsonManager';
import { UiScaler } from '../ui/UiScaler';
import { SettingsUI } from '../ui/settings/SettingsUI';
import { SettingsController } from '../ui/settings/SettingsController';
import { SettingsEvents } from '../ui/settings/events';

/**
 * UiManager 类
 * 职责：
 * 1. 注册所有 UI 模块（BookUI 等）
 * 2. 路由事件到对应的 UI 模块
 * 3. 提供统一的 UI 访问接口
 * 4. 不处理具体的 UI 渲染逻辑（由各模块自己处理）
 */
interface UIModule {
  dispose?(): void;
}

export class UiManager extends Singleton<UiManager>() {
  private eventBus: EventBus;
  private uiModules: Map<string, UIModule> = new Map();
  private isInitialized: boolean = false;
  private screenScaleRatio: number = 1;
  private settingsController: SettingsController | null = null;
  private eventRoutingSetup: boolean = false;

  constructor() {
    super();
    this.eventBus = EventBus.instance;
    this.calculateScreenScaleRatio();
  }

  /**
   * 计算屏幕缩放比
   * 仅当窗口高度小于1080时，缩放比小于1
   */
  private calculateScreenScaleRatio(): void {
    const baseHeight = 1080;
    const currentHeight = screenHeight; // 全局变量，获取当前屏幕高度

    // 仅当高度小于1080时才缩放
    if (currentHeight < baseHeight) {
      this.screenScaleRatio = currentHeight / baseHeight;
      console.log(
        `[UiManager] Screen scale ratio: ${this.screenScaleRatio.toFixed(3)} (${currentHeight}/${baseHeight})`
      );
    } else {
      this.screenScaleRatio = 1;
      console.log(
        `[UiManager] Screen scale ratio: 1 (no scaling, height >= ${baseHeight})`
      );
    }
  }

  /**
   * 获取屏幕缩放比
   */
  getScreenScaleRatio(): number {
    return this.screenScaleRatio;
  }

  /**
   * 初始化 UI 管理器
   * @param uiScreen UiIndex_screen 实例（可选）
   */
  async initialize(
    uiScreen?: UIModule & Record<string, unknown>
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn('[UiManager] Already initialized');
      return;
    }

    console.log('[UiManager] Initializing...');

    // 1. 先初始化 JsonManager，预加载所有书本相关的 JSON 数据
    try {
      await JsonManager.instance.initialize([
        JsonDataType.BOOK_PAGE_CONFIG,
        JsonDataType.BOOK_BOOKMARKS,
      ]);
    } catch (error) {
      console.error('[UiManager] Failed to initialize JsonManager:', error);
    }

    // 2. 注册书本 UI（如果还没有的话）
    let bookUI = this.get<BookUI>('book');
    if (!bookUI) {
      bookUI = new BookUI();
      this.register('book', bookUI);
    } else {
      console.log('[UiManager] BookUI already exists, reusing...');
    }

    // 3. 如果提供了 uiScreen，初始化书本 UI
    if (uiScreen) {
      try {
        await bookUI.initialize(uiScreen as unknown as UiScreenInstance);
      } catch (error) {
        console.error('[UiManager] Failed to initialize book UI:', error);
      }

      // 初始化Settings UI
      let settingsUI = this.get<SettingsUI>('settings');
      if (!settingsUI) {
        settingsUI = new SettingsUI();
        this.register('settings', settingsUI);
      }

      try {
        await settingsUI.initialize(uiScreen as unknown as UiScreenInstance);

        // 创建并初始化SettingsController
        this.settingsController = new SettingsController(settingsUI);
        this.settingsController.initialize();

        console.log('[UiManager] Settings UI initialized');
      } catch (error) {
        console.error('[UiManager] Failed to initialize settings UI:', error);
      }

      // 设置 topBar 和 windowScaleAnchor 为不可点击
      this.setupNonInteractiveElements(uiScreen);

      // 应用UI缩放（仅在screenHeight < 1080时）
      if (this.screenScaleRatio < 1) {
        this.applyUiScaling(uiScreen);

        // 缩放完成后，通知BookUI更新保存的原始位置
        bookUI.updateIconOriginalPosition();
      }
    }

    // 4. 订阅全局事件并路由到对应模块
    this.setupEventRouting();

    this.isInitialized = true;
    console.log('[UiManager] Initialized successfully');
  }

  /**
   * 应用UI缩放
   * 递归遍历所有UI元素并应用缩放比例
   */
  private applyUiScaling(uiScreen: UIModule & Record<string, unknown>): void {
    console.log(
      `[UiManager] Applying UI scaling with ratio: ${this.screenScaleRatio}`
    );

    try {
      const scaler = new UiScaler(this.screenScaleRatio);

      // 查找并缩放windowMiddleAnchor（包含book相关UI）
      const windowMiddleAnchor =
        uiScreen.uiBox_windowMiddleAnchor as unknown as UiNode;
      if (windowMiddleAnchor) {
        console.log('[UiManager] Scaling windowMiddleAnchor and its children');
        scaler.scaleUI(windowMiddleAnchor);
      }

      // 查找并缩放windowTopRightAnchor（包含topBar和bookIcon）
      const windowTopRightAnchor =
        uiScreen.uiBox_windowTopRightAnchor as unknown as UiNode;
      if (windowTopRightAnchor) {
        console.log(
          '[UiManager] Scaling windowTopRightAnchor and its children'
        );
        scaler.scaleUI(windowTopRightAnchor);
      }
    } catch (error) {
      console.error('[UiManager] Failed to apply UI scaling:', error);
    }
  }

  /**
   * 设置不可交互的元素
   * 将 topBar 和 windowMiddleAnchor 设置为不可点击（点击穿透）
   */
  private setupNonInteractiveElements(
    uiScreen: UIModule & Record<string, unknown>
  ): void {
    try {
      // 从 windowTopRightAnchor 中获取 topBar
      const windowTopRightAnchor =
        uiScreen.uiBox_windowTopRightAnchor as unknown;
      if (
        windowTopRightAnchor &&
        typeof windowTopRightAnchor === 'object' &&
        windowTopRightAnchor !== null
      ) {
        // 查找 topBar（在 windowTopRightAnchor 中）
        const topBar = (windowTopRightAnchor as UiBox).findChildByName?.(
          'topBar'
        );
      } else {
        console.warn('[UiManager] windowTopRightAnchor not found in uiScreen');
      }

      // 设置 windowMiddleAnchor 为不可点击（使用 pointerEventBehavior）
      const windowMiddleAnchor = uiScreen.uiBox_windowMiddleAnchor as unknown;
      if (
        windowMiddleAnchor &&
        typeof windowMiddleAnchor === 'object' &&
        windowMiddleAnchor !== null &&
        'pointerEventBehavior' in windowMiddleAnchor
      ) {
        (
          windowMiddleAnchor as { pointerEventBehavior: string }
        ).pointerEventBehavior = 'NONE';
        console.log(
          '[UiManager] windowMiddleAnchor pointerEventBehavior set to NONE (click-through)'
        );
      } else {
        console.warn('[UiManager] windowMiddleAnchor not found in uiScreen');
      }
    } catch (error) {
      console.error(
        '[UiManager] Failed to setup non-interactive elements:',
        error
      );
    }
  }

  /**
   * 设置事件路由
   * UiManager 只做路由，不做具体实现
   */
  private setupEventRouting(): void {
    // 防止重复注册事件路由
    if (this.eventRoutingSetup) {
      console.log('[UiManager] Event routing already setup, skipping...');
      return;
    }

    // 书本相关事件路由
    this.eventBus.on(
      BookEvents.BOOK_OPEN,
      (payload?: { pageNumber?: string }) => {
        const bookUI = this.get<BookUI>('book');
        if (bookUI) {
          bookUI.open(payload?.pageNumber);
        }
      }
    );

    // BOOK_CLOSE 事件是通知性的，由 BookController.close() 发出
    // 不应该在这里再次调用 bookUI.close()，否则会造成循环
    // BookUI 会监听此事件来更新 UI 状态（显示封面等）

    this.eventBus.on(
      BookEvents.BOOK_GOTO,
      (payload?: { pageNumber?: string }) => {
        const bookUI = this.get<BookUI>('book');
        if (bookUI && payload?.pageNumber) {
          bookUI.goto(payload.pageNumber);
        }
      }
    );

    this.eventBus.on(BookEvents.BOOK_NEXT, () => {
      const bookUI = this.get<BookUI>('book');
      if (bookUI) {
        bookUI.next();
      }
    });

    this.eventBus.on(BookEvents.BOOK_PREV, () => {
      const bookUI = this.get<BookUI>('book');
      if (bookUI) {
        bookUI.prev();
      }
    });

    // 标记事件路由已设置
    this.eventRoutingSetup = true;
    console.log('[UiManager] Event routing setup complete');
  }

  /**
   * 注册 UI 模块
   * @param id 模块唯一标识
   * @param ui UI 模块实例
   */
  register(id: string, ui: UIModule): void {
    if (this.uiModules.has(id)) {
      console.warn(
        `[UiManager] UI module "${id}" already registered, overwriting`
      );
    }
    this.uiModules.set(id, ui);
    console.log(`[UiManager] Registered UI module: ${id}`);
  }

  /**
   * 获取 UI 模块
   * @param id 模块唯一标识
   * @returns UI 模块实例
   */
  get<T extends UIModule = UIModule>(id: string): T | undefined {
    return this.uiModules.get(id) as T;
  }

  /**
   * 注销 UI 模块
   * @param id 模块唯一标识
   */
  unregister(id: string): void {
    const ui = this.uiModules.get(id);
    if (ui && typeof ui.dispose === 'function') {
      ui.dispose();
    }
    this.uiModules.delete(id);
    console.log(`[UiManager] Unregistered UI module: ${id}`);
  }

  /**
   * 检查模块是否已注册
   * @param id 模块唯一标识
   */
  has(id: string): boolean {
    return this.uiModules.has(id);
  }

  /**
   * 获取所有已注册的模块 ID
   */
  getRegisteredModules(): string[] {
    return Array.from(this.uiModules.keys());
  }

  /**
   * 清理所有 UI 模块
   */
  dispose(): void {
    console.log('[UiManager] Disposing all UI modules...');

    this.uiModules.forEach((ui) => {
      if (typeof ui.dispose === 'function') {
        ui.dispose();
      }
    });

    this.uiModules.clear();
    this.isInitialized = false;

    console.log('[UiManager] Disposed');
  }
}
