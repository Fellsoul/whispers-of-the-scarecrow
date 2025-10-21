/**
 * Settings Controller - 设置界面控制器
 */

import { EventBus } from '../../core/events/EventBus';
import type { SettingsUI } from './SettingsUI';
import { SettingsEvents, type ChangeLanguageEventData } from './events';

export class SettingsController {
  private settingsUI: SettingsUI;
  private eventBus: EventBus;

  constructor(settingsUI: SettingsUI) {
    this.settingsUI = settingsUI;
    this.eventBus = EventBus.instance;
  }

  /**
   * 初始化控制器，设置事件监听
   */
  initialize(): void {
    console.log('[SettingsController] Initializing...');

    // 监听打开事件
    this.eventBus.on(SettingsEvents.OPEN, this.handleOpen.bind(this));

    // 监听关闭事件
    this.eventBus.on(SettingsEvents.CLOSE, this.handleClose.bind(this));

    // 设置UI元素的点击事件
    this.setupClickHandlers();

    console.log('[SettingsController] Initialized');
  }

  /**
   * 设置点击事件处理
   */
  private setupClickHandlers(): void {
    // settingIcon 点击 - 打开Settings
    const settingIcon = this.settingsUI.getSettingIcon();
    if (settingIcon) {
      settingIcon.events.on('pointerdown', () => {
        console.log('[SettingsController] SettingIcon clicked');
        this.eventBus.emit(SettingsEvents.OPEN, {});
      });
      console.log('[SettingsController] SettingIcon click handler registered');
    }

    // returnButton 点击 - 关闭Settings
    const returnButton = this.settingsUI.getReturnButton();
    if (returnButton) {
      returnButton.events.on('pointerdown', () => {
        console.log('[SettingsController] ReturnButton clicked');
        this.eventBus.emit(SettingsEvents.CLOSE, {});
      });
      console.log('[SettingsController] ReturnButton click handler registered');
    }

    // languageBox 点击 - 切换语言
    const languageBox = this.settingsUI['getLanguageBox']();
    if (languageBox) {
      languageBox.events.on('pointerdown', () => {
        console.log('[SettingsController] LanguageBox clicked');
        this.handleLanguageToggle();
      });
      console.log('[SettingsController] LanguageBox click handler registered');
    }
  }

  /**
   * 处理打开事件
   */
  private async handleOpen(): Promise<void> {
    console.log('[SettingsController] Handling open event');
    await this.settingsUI.open();
  }

  /**
   * 处理关闭事件
   */
  private async handleClose(): Promise<void> {
    console.log('[SettingsController] Handling close event');
    await this.settingsUI.close();
  }

  /**
   * 处理语言切换
   */
  private handleLanguageToggle(): void {
    this.settingsUI.toggleLanguage();

    const newLanguage = this.settingsUI.getCurrentLanguage();
    const eventData: ChangeLanguageEventData = {
      language: newLanguage,
    };

    // 发送语言切换事件
    this.eventBus.emit(SettingsEvents.CHANGE_LANGUAGE, eventData);

    console.log('[SettingsController] Language changed to:', newLanguage);
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.eventBus.off(SettingsEvents.OPEN, this.handleOpen.bind(this));
    this.eventBus.off(SettingsEvents.CLOSE, this.handleClose.bind(this));
    console.log('[SettingsController] Destroyed');
  }
}
