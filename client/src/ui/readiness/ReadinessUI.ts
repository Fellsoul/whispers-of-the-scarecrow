/**
 * ReadinessUI Facade
 * Readiness UI Facade - 封装Readiness UI的所有操作，管理Controller和Service
 *
 * 职责：
 * 1. 初始化和管理ReadinessService和ReadinessController
 * 2. 提供公开的API（如果需要）
 * 3. 缓存UI节点引用
 * 4. 设置UI交互监听
 */

import { EventBus } from '../../core/events/EventBus';
import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';
import type { UiRefs } from './types';
import { ReadinessService } from './ReadinessService';
import { ReadinessController } from './ReadinessController';
import { CharacterRegistry } from '@shares/character/CharacterRegistry';

export type UiScreenInstance = UiIndex_screen;

export class ReadinessUI {
  private uiScreen: UiScreenInstance | null = null;
  private uiRefs: UiRefs | null = null;
  private eventBus: EventBus;
  private service: ReadinessService;
  private controller: ReadinessController;
  private isInitialized: boolean = false;

  constructor() {
    this.eventBus = EventBus.instance;
    this.service = new ReadinessService();
    this.controller = new ReadinessController(this.service, this.eventBus);
  }

  /**
   * 初始化Readiness UI
   * @param uiScreen UiIndex_screen 实例
   */
  async initialize(uiScreen: UiScreenInstance): Promise<void> {
    if (this.isInitialized) {
      console.warn('[ReadinessUI] Already initialized');
      return;
    }

    try {
      console.log('[ReadinessUI] Initializing...');
      this.uiScreen = uiScreen;

      // 1. 缓存UI节点
      this.cacheUiNodes();

      // 2. 初始化角色数据
      const characters = CharacterRegistry.getAll();
      this.service.initCharacters(characters);

      // 3. 初始化Controller（传入UI引用）
      await this.controller.initialize(this.uiRefs);

      // 4. 设置事件监听器
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('[ReadinessUI] Initialized successfully');
    } catch (error) {
      console.error('[ReadinessUI] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 缓存所有UI节点（直接使用UiIndex_screen自动生成的属性）
   */
  private cacheUiNodes(): void {
    if (!this.uiScreen) {
      console.error('[ReadinessUI] uiScreen not initialized');
      return;
    }

    this.uiRefs = {
      // 根容器
      rootMiddle: this.uiScreen.uiBox_windowMiddleAnchor_readiness,
      rootDown: this.uiScreen.uiBox_readiness, // windowDownAnchor/readiness
      rootDownRight: this.uiScreen.uiBox_windowDownRightAnchor,

      // 角色展示区域
      characterPhotoFrame: this.uiScreen.uiImage_characterPhotoFrame,
      characterPortrait: this.uiScreen.uiImage_characterPortrait,
      characterIntroScroll: this.uiScreen.uiImage_characterIntroScroll,

      // 文本节点
      characterName: this.uiScreen.uiText_characterName,
      characterNickname: this.uiScreen.uiText_characterNickname,
      characterIntro: this.uiScreen.uiText_characterIntro,
      characterSpecialSkillTitle:
        this.uiScreen.uiText_characterSpecialSkillTitle,
      characterSkill1Intro: this.uiScreen.uiText_characterSkill1Intro,
      characterSkill2Intro: this.uiScreen.uiText_characterSkill2Intro,

      // 技能图标
      skill1image: this.uiScreen.uiImage_skill1Image,
      skill2image: this.uiScreen.uiImage_skill2Image,

      // 按钮
      turnUpScrollButton: this.uiScreen.uiImage_turnUpScrollButton,
      turnDownScrollButton: this.uiScreen.uiImage_turnDownScrollButton,
      turnCameraModeButton: this.uiScreen.uiImage_turnCameraModeButton,
      confirmSelection: this.uiScreen.uiImage_confirmSelection,
      cancelConfirmation: this.uiScreen.uiImage_cancelConfirmation,
      switchCharacter: this.uiScreen.uiImage_switchCharacter,

      // 计时与准备数
      timerText: this.uiScreen.uiText_timer,
      preparedCountBox: this.uiScreen.uiBox_preparedCount,
      preparedNumber: this.uiScreen.uiText_preparedNumber,
    };

    // 验证关键节点
    this.validateNodes();
  }

  /**
   * 验证关键节点是否存在
   */
  private validateNodes(): void {
    if (!this.uiRefs) {
      return;
    }

    const criticalNodes = [
      'rootMiddle',
      'characterPortrait',
      'characterIntroScroll',
      'characterName',
    ];

    criticalNodes.forEach((nodeName) => {
      if (!this.uiRefs![nodeName as keyof UiRefs]) {
        console.warn(`[ReadinessUI] Critical node missing: ${nodeName}`);
      }
    });
  }

  /**
   * 设置事件监听器
   * 监听Controller发出的事件，更新UI
   */
  private setupEventListeners(): void {
    // TODO: 根据需要添加事件监听
    // 例如：监听角色切换事件、状态变化事件等
    console.log('[ReadinessUI] Event listeners setup complete');
  }

  /**
   * 获取UI引用
   */
  getUiRefs(): UiRefs | null {
    return this.uiRefs;
  }

  // ==================== UI更新方法 ====================

  /**
   * 显示Readiness UI
   */
  show(): void {
    if (this.uiRefs?.rootMiddle) {
      this.uiRefs.rootMiddle.visible = true;
    }
    if (this.uiRefs?.rootDown) {
      this.uiRefs.rootDown.visible = true;
    }
    if (this.uiRefs?.rootDownRight) {
      this.uiRefs.rootDownRight.visible = true;
    }
    console.log('[ReadinessUI] Shown');
  }

  /**
   * 隐藏Readiness UI
   */
  hide(): void {
    if (this.uiRefs?.rootMiddle) {
      this.uiRefs.rootMiddle.visible = false;
    }
    if (this.uiRefs?.rootDown) {
      this.uiRefs.rootDown.visible = false;
    }
    if (this.uiRefs?.rootDownRight) {
      this.uiRefs.rootDownRight.visible = false;
    }
    console.log('[ReadinessUI] Hidden');
  }

  /**
   * 更新计时器文本
   */
  updateTimerText(text: string): void {
    if (this.uiRefs?.timerText) {
      this.uiRefs.timerText.textContent = text;
    }
  }

  /**
   * 更新准备人数文本
   */
  updatePreparedNumber(text: string): void {
    if (this.uiRefs?.preparedNumber) {
      this.uiRefs.preparedNumber.textContent = text;
    }
  }

  /**
   * 显示/隐藏按钮
   */
  setButtonVisible(
    buttonName: keyof Pick<
      UiRefs,
      'confirmSelection' | 'cancelConfirmation' | 'switchCharacter'
    >,
    visible: boolean
  ): void {
    const button = this.uiRefs?.[buttonName];
    if (button) {
      button.visible = visible;
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {}
}
