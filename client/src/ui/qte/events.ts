/**
 * QTE UI 事件定义
 * QTE UI Event Definitions
 */

export interface QteStartData {
  objectId: string;
  objectName: string;
  totalDuration: number; // 总时长（秒）
  fillRate: number; // 填充速度（每秒填充的百分比，例如 0.2 表示每秒填充 20%）
  qteCount: number; // QTE 次数
  resumeProgress?: number; // 恢复的进度（0.0 - 1.0）
}

export interface QteProgressData {
  objectId: string;
  progress: number; // 0.0 - 1.0
  elapsedTime: number; // 已用时间（秒）
  totalDuration: number; // 总时长（秒）
}

export interface QteCompleteData {
  objectId: string;
  success: boolean;
}

export interface QteCancelData {
  objectId: string;
  savedProgress?: number; // 保存的进度（0.0 - 1.0）
}

export interface QteQteTriggeredData {
  objectId: string;
  qteIndex: number; // 第几次 QTE（从 0 开始）
  totalQteCount: number;
}

/**
 * QTE 事件名称
 */
export const QTE_START = 'qte:start';
export const QTE_PROGRESS = 'qte:progress';
export const QTE_COMPLETE = 'qte:complete';
export const QTE_CANCEL = 'qte:cancel';
export const QTE_QTE_TRIGGERED = 'qte:qte:triggered';

