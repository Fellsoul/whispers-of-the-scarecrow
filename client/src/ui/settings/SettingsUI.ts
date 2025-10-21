/**
 * Settings UI - 设置界面
 */

import { Animation } from '../Animation';
import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';

export type UiScreenInstance = UiIndex_screen;

export class SettingsUI {
  // 实现UIModule接口（可选的dispose方法）
  private uiScreen: UiScreenInstance | null = null;
  private isVisible: boolean = false;
  private isAnimating: boolean = false;
  private currentLanguage: 'zh-CN' | 'en-US' = 'zh-CN';

  /**
   * 初始化Settings UI
   */
  async initialize(uiScreen: UiScreenInstance): Promise<void> {
    console.log('[SettingsUI] Initializing...');

    this.uiScreen = uiScreen;

    // 检查必需的UI元素是否存在
    const settingsContainer = this.getSettingsContainer();
    const settingsBg = this.getSettingsBg();
    const windowRightAnchor = this.getWindowRightAnchor();

    if (!settingsContainer) {
      console.error('[SettingsUI] settingsContainer not found!');
    }
    if (!settingsBg) {
      console.error('[SettingsUI] settingsBg not found!');
    }
    if (!windowRightAnchor) {
      console.error('[SettingsUI] windowRightAnchor not found!');
    }

    // 初始化settingsBg位置和尺寸
    if (settingsBg && windowRightAnchor) {
      // 设置尺寸（如果宽度为0）
      if (settingsBg.size && settingsBg.size.offset.x === 0) {
        const bgWidth = screenWidth * 0.15; // 屏幕宽度的15%
        settingsBg.size.offset.x = bgWidth;
        console.log(`[SettingsUI] Initialized settingsBg width: ${bgWidth}`);
      }

      // 初始位置：在右侧外面（x = settingsBg的宽度）
      const bgWidth = settingsBg.size?.offset?.x || 0;
      settingsBg.position.offset.x = bgWidth;
      settingsBg.visible = false; // 初始隐藏，打开时才显示
      settingsBg.imageOpacity = 1; // 确保不透明
      console.log(
        `[SettingsUI] Initialized settingsBg position: x=${settingsBg.position.offset.x}`
      );
      console.log(
        `[SettingsUI] Initialized settingsBg size: ${settingsBg.size?.offset?.x} x ${settingsBg.size?.offset?.y}`
      );
    }

    // 初始隐藏settings容器
    if (settingsContainer) {
      settingsContainer.visible = false;
      console.log('[SettingsUI] settingsContainer hidden');
    }

    // 初始化语言显示
    this.updateLanguageDisplay();

    console.log('[SettingsUI] Initialized successfully');
  }

  /**
   * 打开Settings界面
   */
  async open(): Promise<void> {
    if (this.isAnimating || this.isVisible) {
      console.log('[SettingsUI] Already open or animating');
      return;
    }

    console.log('[SettingsUI] Opening settings...');
    this.isAnimating = true;

    try {
      const settingsContainer = this.getSettingsContainer();
      const settingsBg = this.getSettingsBg();
      const windowRightAnchor = this.getWindowRightAnchor();

      if (!settingsContainer || !settingsBg || !windowRightAnchor) {
        console.error('[SettingsUI] Missing required UI elements');
        return;
      }

      // 设置settingsBg尺寸（如果宽度为0）
      if (settingsBg.size && settingsBg.size.offset.x === 0) {
        const bgWidth = screenWidth * 0.15;
        settingsBg.size.offset.x = bgWidth;
        console.log(`[SettingsUI] Set settingsBg width to: ${bgWidth}`);
      }

      // 获取settingsBg的宽度
      const bgWidth = settingsBg.size?.offset?.x || 0;

      // 设置初始位置：在右侧外面（正值，在窗口外）
      const startX = bgWidth;

      // 目标位置：0（完全进入视野）
      const targetX = 0;

      // 先设置位置和可见性
      settingsBg.position.offset.x = startX;
      settingsBg.visible = true;
      settingsBg.imageOpacity = 1; // 确保图片不透明
      settingsBg.zIndex = 10; // 设置更低的层级

      console.log(
        `[SettingsUI] settingsBg initial zIndex: ${settingsBg.zIndex}`
      );

      // 检查并设置windowRightAnchor的zIndex
      console.log(
        `[SettingsUI] windowRightAnchor zIndex: ${windowRightAnchor.zIndex}`
      );
      if (windowRightAnchor.zIndex > 10) {
        console.log(
          `[SettingsUI] windowRightAnchor zIndex is too high (${windowRightAnchor.zIndex}), setting to 10`
        );
        windowRightAnchor.zIndex = 1;
      }

      // 设置settings容器的层级和点击行为
      settingsContainer.zIndex = 1;

      // 确保settings容器不会阻挡点击
      if ('pointerEventBehavior' in settingsContainer) {
        (
          settingsContainer as UiBox & { pointerEventBehavior: number }
        ).pointerEventBehavior = 1; // DISABLE: 不响应但不阻挡
      }

      // 显示容器和所有子元素
      settingsContainer.visible = true;

      if (this.uiScreen) {
        const languageTitle = this.uiScreen.uiText_languageTitle;
        const languageBox = this.getLanguageBox();
        const settingsTitle = this.uiScreen.uiText_settingsTitle;
        const returnButton = this.getReturnButton();

        if (languageTitle) {
          languageTitle.visible = true;
        }
        if (languageBox) {
          languageBox.visible = true;
          // languageBox需要可以点击
        }
        if (settingsTitle) {
          settingsTitle.visible = true;
        }
        if (returnButton) {
          returnButton.visible = true;
          // returnButton需要可以点击
        }
      }

      // settingsBg本身设置为不响应点击（图片作为背景）
      if ('pointerEventBehavior' in settingsBg) {
        (
          settingsBg as UiImage & { pointerEventBehavior: number }
        ).pointerEventBehavior = 1; // DISABLE: 不响应但不阻挡
      }

      // 检查bookIcon的zIndex作为参考
      const bookIcon = this.uiScreen?.uiImage_bookIcon;
      if (bookIcon) {
        console.log(
          `[SettingsUI] For reference - bookIcon zIndex: ${bookIcon.zIndex}`
        );
      }

      console.log(
        `[SettingsUI] Opening animation: x from ${startX} to ${targetX}`
      );
      console.log(
        `[SettingsUI] settingsBg width: ${bgWidth}, visible: ${settingsBg.visible}, opacity: ${settingsBg.imageOpacity}`
      );
      console.log(
        `[SettingsUI] settingsBg position: (${settingsBg.position.offset.x}, ${settingsBg.position.offset.y})`
      );
      console.log(
        `[SettingsUI] settingsBg size: (${settingsBg.size?.offset?.x}, ${settingsBg.size?.offset?.y})`
      );

      // 播放滑入动画
      await Animation.animatePosition(
        settingsBg,
        targetX,
        settingsBg.position.offset.y,
        400
      );

      // 动画后再次确保zIndex正确（检查是否被改变）
      console.log(
        `[SettingsUI] settingsBg zIndex after animation: ${settingsBg.zIndex}`
      );
      if (settingsBg.zIndex !== 0) {
        console.warn(
          `[SettingsUI] zIndex changed from 10 to ${settingsBg.zIndex}, resetting...`
        );
        settingsBg.zIndex = 0;
      }

      this.isVisible = true;
      console.log('[SettingsUI] Settings opened');
    } catch (error) {
      console.error('[SettingsUI] Error opening settings:', error);
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 关闭Settings界面
   */
  async close(): Promise<void> {
    if (this.isAnimating || !this.isVisible) {
      console.log('[SettingsUI] Already closed or animating');
      return;
    }

    console.log('[SettingsUI] Closing settings...');
    this.isAnimating = true;

    try {
      const settingsBg = this.getSettingsBg();

      if (!settingsBg) {
        console.error('[SettingsUI] Missing required UI elements');
        return;
      }

      // 获取settingsBg的宽度
      const bgWidth = settingsBg.size?.offset?.x || 0;

      // 滑出到右侧外面
      const endX = bgWidth;

      console.log(
        `[SettingsUI] Closing animation: x from ${settingsBg.position.offset.x} to ${endX}`
      );

      await Animation.animatePosition(
        settingsBg,
        endX,
        settingsBg.position.offset.y,
        400
      );

      // 隐藏
      this.hideSettings();

      this.isVisible = false;
      console.log('[SettingsUI] Settings closed');
    } catch (error) {
      console.error('[SettingsUI] Error closing settings:', error);
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 切换语言
   */
  toggleLanguage(): void {
    this.currentLanguage = this.currentLanguage === 'zh-CN' ? 'en-US' : 'zh-CN';
    this.updateLanguageDisplay();
    console.log('[SettingsUI] Language switched to:', this.currentLanguage);
  }

  /**
   * 获取当前语言
   */
  getCurrentLanguage(): 'zh-CN' | 'en-US' {
    return this.currentLanguage;
  }

  /**
   * 更新语言显示
   */
  private updateLanguageDisplay(): void {
    const languageBox = this.getLanguageBox();
    if (languageBox) {
      languageBox.textContent =
        this.currentLanguage === 'zh-CN' ? '中文' : 'English';
    }
  }

  /**
   * 隐藏Settings界面
   */
  private hideSettings(): void {
    const settingsContainer = this.getSettingsContainer();
    if (settingsContainer) {
      settingsContainer.visible = false;
    }
  }

  /**
   * 获取windowRightAnchor
   */
  private getWindowRightAnchor(): UiBox | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiBox_windowRightAnchor || null;
  }

  /**
   * 获取settings容器
   */
  private getSettingsContainer(): UiBox | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiBox_settings || null;
  }

  /**
   * 获取settingsBg
   */
  private getSettingsBg(): UiImage | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiImage_settingsBg || null;
  }

  /**
   * 获取languageBox
   */
  private getLanguageBox(): UiText | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiText_languageBox || null;
  }

  /**
   * 获取returnButton
   */
  getReturnButton(): UiImage | null {
    if (!this.uiScreen) {
      return null;
    }
    return (
      this.uiScreen.uiImage_windowRightAnchor_settings_returnButton || null
    );
  }

  /**
   * 获取settingIcon
   */
  getSettingIcon(): UiImage | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiImage_settingIcon || null;
  }

  /**
   * 清理资源（实现UIModule接口）
   */
  dispose?(): void {
    this.uiScreen = null;
    this.isVisible = false;
    this.isAnimating = false;
    console.log('[SettingsUI] Disposed');
  }
}
