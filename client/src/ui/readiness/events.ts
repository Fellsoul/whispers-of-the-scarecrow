/**
 * Readiness 事件定义
 */

// ==================== 前端内部事件 ====================

/** UI事件：滚动到下一个角色 */
export const UI_SCROLL_NEXT = 'ui:readiness:scroll:next';

/** UI事件：滚动到上一个角色 */
export const UI_SCROLL_PREV = 'ui:readiness:scroll:prev';

/** UI事件：切换相机模式 */
export const UI_TOGGLE_CAMERA_MODE = 'ui:readiness:toggle:camera';

/** UI事件：确认选择 */
export const UI_CONFIRM_SELECTION = 'ui:readiness:confirm';

/** UI事件：取消确认 */
export const UI_CANCEL_CONFIRMATION = 'ui:readiness:cancel';

/** UI事件：切换角色 */
export const UI_SWITCH_CHARACTER = 'ui:readiness:switch';

/** UI事件：进入卷轴视图 */
export const UI_ENTER_SCROLL_VIEW = 'ui:readiness:enter:scroll';

/** UI事件：离开卷轴视图 */
export const UI_LEAVE_SCROLL_VIEW = 'ui:readiness:leave:scroll';

// ==================== 前后端通信事件 ====================

/** 网关事件：玩家准备状态（C->S） */
export const GW_READINESS_PLAYER_STATE = 'readiness:player:state';

/** 网关事件：请求相机重置（C->S） */
export const GW_REQUEST_CAMERA_RESET = 'readiness:camera:reset';

/** 网关事件：请求切换角色视角（C->S） */
export const GW_REQUEST_CHARACTER_VIEW = 'readiness:camera:character';

/** 网关事件：准备快照（S->C） */
export const GW_READINESS_SNAPSHOT = 'readiness:snapshot';

/** 网关事件：强制准备开始（S->C） */
export const GW_FORCE_READY_START = 'readiness:force:start';

// ==================== 事件载荷类型 ====================

/**
 * 玩家准备状态载荷
 */
export interface PlayerStatePayload {
  isReady: boolean;
  characterId: string;
}

/**
 * 相机重置请求载荷
 */
export interface CameraResetPayload {
  playerId: string;
}

/**
 * 切换角色视角请求载荷
 */
export interface CharacterViewPayload {
  characterIndex: number;
  isOverseer?: boolean;
}

/**
 * 准备快照载荷（服务端推送）
 */
export interface ReadinessSnapshotPayload {
  /** 总玩家数 */
  totalPlayers: number;
  /** 已准备玩家数 */
  preparedPlayers: number;
  /** 是否所有人已传送就位 */
  isAllTeleported: boolean;
  /** 倒计时秒数（null表示未开始） */
  countdownSec: number | null;
  /** 是否强制开始 */
  forceStart: boolean;
}

/**
 * 强制准备开始载荷
 */
export interface ForceReadyStartPayload {
  /** 游戏即将开始 */
  gameStarting: true;
}

/**
 * 镜头切换完成载荷（服务端推送）
 */
export interface CameraCompletePayload {
  /** 角色索引 */
  characterIndex: number;
  /** 是否是Overseer角色 */
  isOverseer: boolean;
}
