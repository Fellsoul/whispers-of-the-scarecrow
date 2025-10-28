import type { Character } from '@shares/character/Character';

/**
 * Readiness阶段枚举
 */
export enum ReadinessPhase {
  /** 空闲状态 */
  Idle = 'Idle',
  /** 展示卷轴 */
  ShowingScroll = 'ShowingScroll',
  /** 选择中 */
  Choosing = 'Choosing',
  /** 已确认 */
  Confirmed = 'Confirmed',
  /** 倒计时中 */
  Countdown = 'Countdown',
  /** 锁定（游戏即将开始） */
  Locked = 'Locked',
}

/**
 * Readiness状态接口
 */
export interface ReadinessState {
  /** 当前阶段 */
  phase: ReadinessPhase;
  /** 当前选择的角色索引 */
  currentIndex: number;
  /** 是否已准备 */
  isReady: boolean;
  /** 总玩家数 */
  totalPlayers: number;
  /** 已准备玩家数 */
  preparedPlayers: number;
  /** 倒计时秒数 */
  countdownSec: number | null;
  /** 是否所有人已传送就位 */
  isAllTeleported: boolean;
}

/**
 * UI节点引用接口
 */
export interface UiRefs {
  // 根容器
  rootMiddle: UiBox | null;
  rootDown: UiBox | null;
  rootDownRight: UiBox | null;

  // 角色展示区域
  characterPhotoFrame: UiImage | null;
  characterPortrait: UiImage | null;
  characterIntroScroll: UiImage | null;

  // 文本节点
  characterName: UiText | null;
  characterNickname: UiText | null;
  characterIntro: UiText | null;
  characterSpecialSkillTitle: UiText | null;
  characterSkill1Intro: UiText | null;
  characterSkill2Intro: UiText | null;

  // 技能图标
  skill1image: UiImage | null;
  skill2image: UiImage | null;

  // 按钮（在客户端中按钮通常是UiImage）
  turnUpScrollButton: UiImage | null;
  turnDownScrollButton: UiImage | null;
  turnCameraModeButton: UiImage | null;
  confirmSelection: UiImage | null;
  cancelConfirmation: UiImage | null;
  switchCharacter: UiImage | null;

  // 计时与准备数
  timerText: UiText | null;
  preparedCountBox: UiBox | null;
  preparedNumber: UiText | null;
}

/**
 * 滚动方向
 */
export type ScrollDirection = 'next' | 'prev';

/**
 * 动画配置
 */
export interface AnimationConfig {
  /** 滑动持续时间（毫秒） */
  durationSlide: number;
  /** 缓动函数 */
  easing: string;
  /** 离屏X坐标偏移量 */
  offscreenX: number;
}
