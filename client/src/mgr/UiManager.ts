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
import {
  SettingsEvents,
  type ChangeLanguageEventData,
} from '../ui/settings/events';
import { UiI18nSwitcher } from '../ui/UiI18nSwitcher';
import { MatchPoolUI } from '../ui/matchPool/MatchPoolUI';
import { MatchPoolController } from '../ui/matchPool/MatchPoolController';
import { CommunicationMgr } from '../presentation/CommunicationGateway';
import { ReadinessUI } from '../ui/readiness/ReadinessUI';
import { CharacterRegistry } from '../../../shares/character/CharacterRegistry';
import { IngameProfilesUI } from '../ui/ingame/IngameProfilesUI';
import { IngameProfilesController } from '../ui/ingame/IngameProfilesController_v2';
import { InventoryUIController } from '../ui/inventory/InventoryUIController';
import { QteUIController } from '../ui/qte/QteUIController';

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
  private matchPoolController: MatchPoolController | null = null;
  private eventRoutingSetup: boolean = false;

  private windowMiddleAnchor: UiBox | null = null;
  private windowTopRightAnchor: UiBox | null = null;
  private windowTopAnchor: UiBox | null = null;
  private windowDownRightAnchor: UiBox | null = null;
  private windowDownAnchor: UiBox | null = null;
  private windowTopLeftAnchor: UiBox | null = null;
  private communicationMgr: CommunicationMgr;
  private currentScene: string | null = null;

  constructor() {
    super();
    this.eventBus = EventBus.instance;
    this.communicationMgr = CommunicationMgr.instance;
    // 初始化时使用默认值1，在initialize中延迟获取真实值
    this.screenScaleRatio = 1;
  }

  /**
   * 计算屏幕缩放比
   * 延迟1秒获取screenHeight以确保获取到正确的窗口大小
   * 仅当窗口高度小于1080时，缩放比小于1
   */
  private async calculateScreenScaleRatio(): Promise<void> {
    const baseHeight = 1080;

    // 延迟1秒获取screenHeight，确保引擎已正确初始化
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const currentHeight = screenHeight; // 全局变量，获取当前屏幕高度
    console.log(
      `[UiManager] Detected screen height after delay: ${currentHeight}px`
    );

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

    // 延迟获取正确的screenHeight并计算缩放比
    await this.calculateScreenScaleRatio();

    //获得页面锚点框
    this.windowMiddleAnchor = uiScreen?.uiBox_windowMiddleAnchor as UiBox;
    this.windowTopRightAnchor = uiScreen?.uiBox_windowTopRightAnchor as UiBox;
    this.windowTopAnchor = uiScreen?.uiBox_windowTopAnchor as UiBox;
    this.windowDownRightAnchor = uiScreen?.uiBox_windowDownRightAnchor as UiBox;
    this.windowDownAnchor = uiScreen?.uiBox_windowDownAnchor as UiBox;
    this.windowTopLeftAnchor = uiScreen?.uiBox_windowTopLeftAnchor as UiBox;

    // 0. 初始化角色注册表 - 优先加载
    try {
      CharacterRegistry.initialize();
      console.log('[UiManager] CharacterRegistry initialized');
    } catch (error) {
      console.error(
        '[UiManager] Failed to initialize CharacterRegistry:',
        error
      );
    }

    // 1. 先初始化 JsonManager，预加载所有书本相关的 JSON 配置数据
    // 注意：翻译数据（bookmarks, conditions）现在由 i18n 系统管理
    try {
      await JsonManager.instance.initialize([
        JsonDataType.BOOK_PAGE_CONFIG,
        JsonDataType.MAP_HREF,
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

      // 应用UI缩放（仅在screenHeight < 1080时）
      if (this.screenScaleRatio < 1) {
        this.applyUiScaling(uiScreen);

        // 缩放完成后，通知BookUI更新保存的原始位置
        bookUI.updateIconOriginalPosition();
      }

      //应用i18nSwitcher
      this.applyI18nSwitcher(uiScreen);

      // 初始化MatchPool UI
      let matchPoolUI = this.get<MatchPoolUI>('matchPool');
      if (!matchPoolUI) {
        matchPoolUI = new MatchPoolUI();
        this.register('matchPool', matchPoolUI);
      }

      try {
        await matchPoolUI.initialize(uiScreen as unknown as UiScreenInstance);

        // 创建并初始化MatchPoolController
        this.matchPoolController = new MatchPoolController(matchPoolUI);
        this.matchPoolController.initialize();

        console.log('[UiManager] MatchPool UI initialized');
      } catch (error) {
        console.error('[UiManager] Failed to initialize matchPool UI:', error);
      }
    }

    // 4. 订阅全局事件并路由到对应模块
    this.setupEventRouting();

    // 5. 设置场景查询监听器
    this.setupSceneListener();

    // 6. 查询当前场景
    this.queryCurrentScene();

    //7. 初始化Readiness UI
    if (uiScreen) {
      let readinessUI = this.get<ReadinessUI>('readiness');
      if (!readinessUI) {
        readinessUI = new ReadinessUI();
        this.register('readiness', readinessUI);
      }

      try {
        // ReadinessUI现在是Facade，内部管理Controller和Service
        await readinessUI.initialize(uiScreen as unknown as UiScreenInstance);
        console.log('[UiManager] Readiness UI initialized');
      } catch (error) {
        console.error('[UiManager] Failed to initialize readiness UI:', error);
      }
    }

    //8. 初始化IngameProfiles UI
    if (uiScreen) {
      let ingameProfilesController =
        this.get<IngameProfilesController>('ingameProfiles');
      if (!ingameProfilesController) {
        ingameProfilesController = new IngameProfilesController();
        this.register('ingameProfiles', ingameProfilesController);
      }

      try {
        // IngameProfilesUI现在是Facade，内部管理Controller和Service
        await ingameProfilesController.initialize(
          uiScreen as unknown as UiScreenInstance
        );
        console.log('[UiManager] IngameProfiles UI initialized');
      } catch (error) {
        console.error(
          '[UiManager] Failed to initialize ingameProfiles UI:',
          error
        );
      }
    }

    //9. 初始化Inventory UI
    if (uiScreen) {
      let inventoryController = this.get<InventoryUIController>('inventory');
      if (!inventoryController) {
        inventoryController = new InventoryUIController();
        this.register('inventory', inventoryController);
      }

      try {
        inventoryController.initialize(uiScreen as unknown as UiScreenInstance);
        console.log('[UiManager] Inventory UI initialized');
      } catch (error) {
        console.error('[UiManager] Failed to initialize inventory UI:', error);
      }
    }

    //10. 初始化QTE UI
    if (uiScreen) {
      let qteController = this.get<QteUIController>('qte');
      if (!qteController) {
        qteController = new QteUIController();
        this.register('qte', qteController);
      }

      try {
        qteController.initialize(uiScreen as unknown as UiScreenInstance);
        console.log('[UiManager] QTE UI initialized');
      } catch (error) {
        console.error('[UiManager] Failed to initialize QTE UI:', error);
      }
    }

    this.isInitialized = true;
    console.log('[UiManager] Initialized successfully');
  }

  /**
   * 应用UI缩放
   * 递归遍历所有UI元素并应用缩放比例
   */
  private applyI18nSwitcher(
    uiScreen: UIModule & Record<string, unknown>
  ): void {
    console.log('[UiManager] Applying i18n switcher');
    if (this.windowTopAnchor) {
      const i18nSwitcher = new UiI18nSwitcher();
      i18nSwitcher.switchUI(this.windowTopAnchor);
    }
    if (this.windowDownRightAnchor) {
      const i18nSwitcher = new UiI18nSwitcher();
      i18nSwitcher.switchUI(this.windowDownRightAnchor);
    }
  }

  private applyUiScaling(uiScreen: UIModule & Record<string, unknown>): void {
    console.log(
      `[UiManager] Applying UI scaling with ratio: ${this.screenScaleRatio}`
    );

    try {
      const scaler = new UiScaler(this.screenScaleRatio);

      // 查找并缩放windowMiddleAnchor（包含book相关UI）
      if (this.windowMiddleAnchor) {
        console.log('[UiManager] Scaling windowMiddleAnchor and its children');
        scaler.scaleUI(this.windowMiddleAnchor);
      }

      // 查找并缩放windowTopRightAnchor（包含topBar和bookIcon）
      if (this.windowTopRightAnchor) {
        console.log(
          '[UiManager] Scaling windowTopRightAnchor and its children'
        );
        scaler.scaleUI(this.windowTopRightAnchor);
      }

      //查找并缩放windowDownRightAnchor (包含准备界面系列按钮)
      if (this.windowDownRightAnchor) {
        console.log(
          '[UiManager] Scaling windowDownRightAnchor and its children'
        );
        scaler.scaleUI(this.windowDownRightAnchor);
      } else {
        console.log('[UiManager] windowDownRightAnchor not found');
      }

      //查找并缩放windowTopAnchor(包含玩家)
      if (this.windowTopAnchor) {
        console.log('[UiManager] Scaling windowTopAnchor and its children');
        scaler.scaleUI(this.windowTopAnchor);
      }

      //查找并缩放windowDownAnchor(包含退出按钮)
      if (this.windowDownAnchor) {
        console.log('[UiManager] Scaling windowDownAnchor and its children');
        scaler.scaleUI(this.windowDownAnchor);
      }

      if (this.windowTopLeftAnchor) {
        console.log('[UiManager] Scaling windowTopLeftAnchor and its children');
        scaler.scaleUI(this.windowTopLeftAnchor);
      }
    } catch (error) {
      console.error('[UiManager] Failed to apply UI scaling:', error);
    }
  }

  /**
   * 设置不可交互的元素
   * 将 topBar 和 windowMiddleAnchor 设置为不可点击（点击穿透）
   */

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

    // 语言切换事件监听
    this.eventBus.on(
      SettingsEvents.CHANGE_LANGUAGE,
      async (payload?: ChangeLanguageEventData) => {
        const newLanguage = payload?.language || 'zh-CN';
        console.log(
          `[UiManager] Language change event received: ${newLanguage}`
        );

        // i18n 已经在 SettingsUI 中切换了，这里只需要通知其他需要更新的 UI 模块
        // 如果有 UI 需要重新加载数据，可以在这里处理

        // 例如，BookUI 可能需要重新加载书本数据
        const bookUI = this.get<BookUI>('book');
        if (bookUI && bookUI['controller']) {
          console.log('[UiManager] Reloading book data for new language...');
          // 如果 BookController 有 reload 方法，可以调用
        }
      }
    );

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
   * 设置场景响应监听器
   */
  private setupSceneListener(): void {
    this.eventBus.on<{ currentScene: string }>(
      'server:scene:response',
      (data) => {
        if (data?.currentScene) {
          this.currentScene = data.currentScene;
          console.log(
            `[UiManager] Received current scene: ${this.currentScene}`
          );

          // 根据场景类型更新book icon显示状态
          this.updateBookIconVisibility();
        }
      }
    );
  }

  /**
   * 查询当前场景
   */
  private queryCurrentScene(): void {
    console.log('[UiManager] Querying current scene from server');
    this.communicationMgr.send('client:scene:query', {});
  }

  /**
   * 获取当前场景
   */
  public getCurrentScene(): string | null {
    return this.currentScene;
  }

  /**
   * 更新book icon的显示状态
   * 在 lobby 场景显示 icon，在其他场景隐藏
   */
  private updateBookIconVisibility(): void {
    const bookUI = this.get<BookUI>('book');
    if (!bookUI) {
      return;
    }

    // 检查当前场景是否需要隐藏book icon
    const shouldHideIcon = this.shouldHideBookIcon();

    if (shouldHideIcon) {
      console.log(
        `[UiManager] Hiding book icon for scene: ${this.currentScene}`
      );
      // 调用BookUI的方法来隐藏icon
      bookUI.setBookIconVisible(false);
    } else {
      console.log(
        `[UiManager] Showing book icon for scene: ${this.currentScene}`
      );
      // 在 lobby 场景显示 icon
      bookUI.setBookIconVisible(true);
    }
  }

  /**
   * 判断当前场景是否需要隐藏book icon
   */
  private shouldHideBookIcon(): boolean {
    if (!this.currentScene) {
      return false;
    }

    // 只在 lobby 场景显示 icon，其他场景隐藏
    const hideScenes = ['readiness', 'ingame'];
    return hideScenes.includes(this.currentScene);
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
