/**
 * Settings UI 事件定义
 */

/**
 * Settings UI 事件类型
 */
export const SettingsEvents = {
  /** 打开Settings界面 */
  OPEN: 'settings:open',
  /** 关闭Settings界面 */
  CLOSE: 'settings:close',
  /** 切换语言 */
  CHANGE_LANGUAGE: 'settings:change_language',
} as const;

/**
 * 切换语言事件数据
 */
export interface ChangeLanguageEventData {
  language: 'zh-CN' | 'en-US';
}
