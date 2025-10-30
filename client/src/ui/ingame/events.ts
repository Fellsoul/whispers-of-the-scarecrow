/**
 * 游戏中UI事件定义
 */

/**
 * 玩家状态数据（从服务端接收）
 */
export interface PlayerProfileData {
  userId: string;
  playerName: string;
  avatar?: string; // 玩家头像
  characterId: string;
  currentHP: number;
  maxHP: number;
  isAlive: boolean;
  isReady?: boolean; // 是否已确认选择（Readiness场景）
  carryingItem?: string;
  statusEffects?: string[];
}

/**
 * 游戏内profile事件
 */
export const INGAME_PROFILE_UPDATE = 'ingame:profile:update';
export const INGAME_PROFILES_BATCH = 'ingame:profiles:batch';
export const INGAME_PROFILE_REMOVE = 'ingame:profile:remove';
export const INGAME_PROFILES_REQUEST = 'ingame:profiles:request';
export const INGAME_PROFILE_READY = 'ingame:profile:ready';
