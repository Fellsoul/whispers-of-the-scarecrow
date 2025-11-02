import type { IItem } from '@shares/item/IItem';
import type { CCType, DamageType, ObjectiveTag, NoiseTag } from '@shares/core/Enum';
import type { EffectBundle, Seconds, Meters } from '@shares/core/General';

/**
 * 互动惩罚配置
 * Interaction Penalty Configuration
 */
export interface IQtePenalty {
  /** 控制类型惩罚（使用现有的 CCType）/ Control Type Penalty */
  ccType?: CCType;
  
  /** 伤害类型惩罚 / Damage Type Penalty */
  damageType?: DamageType;
  
  /** 伤害值（如果有伤害）/ Damage Amount (if applicable) */
  damageAmount?: number;
  
  /** 惩罚持续时间（秒）/ Penalty Duration (seconds) */
  duration: Seconds;
  
  /** 是否高亮显示玩家（Reveal）/ Whether to highlight player (Reveal) */
  highlightPlayer: boolean;
  
  /** 高亮惩罚时间（秒）/ Highlight Duration (seconds) */
  highlightDuration: Seconds;
  
  /** 额外效果（可选）/ Additional Effects (optional) */
  effects?: EffectBundle;
}

/**
 * 互动完成事件配置
 * Interaction Complete Event Configuration
 * 
 * 使用通用事件名称，避免预定义枚举
 * Uses generic event names to avoid predefined enums
 */
export interface IQteCompleteEvent {
  /** 事件名称（自定义字符串）/ Event Name (custom string) */
  eventName: string;
  
  /** 事件数据（事件特定的载荷）/ Event Data (event-specific payload) */
  eventData?: Record<string, unknown>;
}

/**
 * QTE 可互动实体接口
 * QTE Interactive Entity Interface
 * 
 * 定义了需要 QTE 判定的可互动实体的所有属性
 * Defines all properties for interactive entities that require QTE judgment
 */
export interface IQteObject {
  /** 
   * 实体唯一标识符 
   * Entity Unique Identifier 
   */
  id: string;

  /** 
   * 实体名称（用于调试和日志）
   * Entity Name (for debugging and logging) 
   */
  name: string;

  /** 
   * 目标环节标签（关联到游戏流程）
   * Objective Tag (links to game flow)
   * 如 Search, Incubate, Carve, Altar 等
   */
  objectiveTag: ObjectiveTag;

  /** 
   * 绑定的 EntityNode（运行时设置）
   * Bound EntityNode (set at runtime)
   */
  entityNode?: unknown; // EntityNode type from server

  /** 
   * 完成互动所需基础时长（秒）
   * Base Duration Required for Interaction (seconds)
   */
  baseDuration: Seconds;

  /** 
   * 互动惩罚配置
   * Interaction Penalty Configuration
   */
  penalty: IQtePenalty;

  /** 
   * QTE 基础触发次数（0 则不出现 QTE 判定）
   * Base QTE Trigger Count (0 means no QTE judgment)
   */
  qteCount: number;

  /** 
   * QTE 难度系数（0.0 - 1.0）
   * QTE Difficulty Coefficient (0.0 - 1.0)
   * 越高越难，影响成功判定的时间窗口
   * Higher is harder, affects success judgment time window
   */
  qteDifficulty?: number;

  /** 
   * 互动所需放入物品列表（物品 ID）
   * Required Items for Interaction (item IDs)
   * 空数组表示无需物品
   * Empty array means no items required
   */
  requiredItems: string[];

  /** 
   * 互动产出物品（物品 ID）
   * Outcome Item from Interaction (item ID)
   * null 表示无产出或随机产出
   * null means no outcome or random outcome
   */
  outcomeItem: string | null;

  /** 
   * 互动完成触发事件
   * Event Triggered on Interaction Complete
   * null 表示无事件
   * null means no event
   */
  completeEvent: IQteCompleteEvent | null;

  /** 
   * 互动噪音标签列表
   * Noise Tags for Interaction
   * 使用现有的 NoiseTag 枚举
   */
  noiseTags: NoiseTag[];

  /** 
   * 互动基础噪音强度（0.0 - 1.0）
   * Base Noise Level for Interaction (0.0 - 1.0)
   * 
   * 0.0 = 完全静音
   * 0.5 = 中等噪音
   * 1.0 = 极大噪音
   */
  baseNoiseLevel: number;

  /** 
   * 是否可重复互动
   * Whether Interaction is Repeatable
   * true = 可重复使用，false = 一次性
   * true = reusable, false = one-time
   */
  repeatable?: boolean;

  /** 
   * 冷却时间（秒）
   * Cooldown Time (seconds)
   * 仅在 repeatable = true 时有效
   * Only valid when repeatable = true
   */
  cooldown?: Seconds;

  /** 
   * 互动范围半径（米）
   * Interaction Range Radius (meters)
   * 玩家需要在此范围内才能互动
   * Player must be within this range to interact
   */
  interactionRadius?: Meters;

  /** 
   * i18n 显示名称键
   * i18n Display Name Key
   */
  displayNameKey?: string;

  /** 
   * i18n 互动提示键
   * i18n Interaction Hint Key
   */
  interactionHintKey?: string;

  /** 
   * 是否允许缓存进度（断点续传）
   * Whether to Allow Progress Caching (Resume from Checkpoint)
   * 
   * true = 中途取消后可以从之前的进度继续
   * false = 每次重新开始都从 0% 开始
   * 
   * 默认: true
   * Default: true
   */
  allowProgressCache?: boolean;
}

/**
 * QTE 互动状态
 * QTE Interaction State
 */
export interface IQteObjectState {
  /** 对象 ID / Object ID */
  objectId: string;

  /** 当前是否被互动 / Currently Being Interacted */
  isInteracting: boolean;

  /** 当前互动的玩家 ID / Current Interacting Player ID */
  interactingPlayerId: string | null;

  /** 互动开始时间（时间戳）/ Interaction Start Time (timestamp) */
  startTime: number | null;

  /** 已完成的 QTE 次数 / Completed QTE Count */
  completedQteCount: number;

  /** 是否在冷却中 / Is in Cooldown */
  isOnCooldown: boolean;

  /** 冷却结束时间（时间戳）/ Cooldown End Time (timestamp) */
  cooldownEndTime: number | null;

  /** 已使用次数（如果是一次性互动）/ Used Count (if one-time interaction) */
  usedCount: number;
}

