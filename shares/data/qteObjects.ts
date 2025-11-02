import type { IQteObject, IQteObjectState } from '../gameplay/qteObject/IQteObject';
import { CCType, DamageType, ObjectiveTag, NoiseTag } from '@shares/core/Enum';

/**
 * QTE 对象配置示例
 * QTE Object Configuration Examples
 * 
 * 这个文件提供了常见 QTE 互动对象的配置示例
 * This file provides configuration examples for common QTE interactive objects
 */

/**
 * 示例 1: 搜索箱子（简单互动，无 QTE）
 * Example 1: Search Chest (Simple interaction, no QTE)
 */
export const DEFAULT_QTE_OBJECT_CONFIG: Partial<IQteObject> = {
  id: '',
  name: '',
  objectiveTag: ObjectiveTag.Search,
  baseDuration: 0,
  qteCount: 0,
  requiredItems: [],
  outcomeItem: null,
  completeEvent: null,
  noiseTags: [],
  baseNoiseLevel: 0,
  repeatable: false,
  interactionRadius: 0,
  displayNameKey: '',
  interactionHintKey: '',
};

export const DEFAULT_QTE_OBJECT_STATE: Partial<IQteObjectState> = {
  objectId: '',
  isInteracting: false,
  interactingPlayerId: null,
  startTime: null,
  completedQteCount: 0,
  isOnCooldown: false,
  cooldownEndTime: null,
  usedCount: 0,
};

export const searchChestExample: Partial<IQteObject> = {
  id: 'chest_01',
  name: 'Wooden Chest',
  objectiveTag: ObjectiveTag.Search,
  baseDuration: 3000.0, // 3 秒
  qteCount: 0, // 无 QTE 判定
  penalty: {
    duration: 0,
    highlightPlayer: false,
    highlightDuration: 0,
  },
  requiredItems: [], // 无需物品
  outcomeItem: null, // 由服务端随机决定
  completeEvent: {
    eventName: 'spawn_item',
    eventData: { itemPool: 'common_chest' },
  },
  noiseTags: [NoiseTag.SearchRustle],
  baseNoiseLevel: 0.2, // 轻微噪音
  repeatable: false,
  interactionRadius: 2.0,
  displayNameKey: 'qte:chest.name',
  interactionHintKey: 'qte:chest.hint',
};

/**
 * 示例 2: 催生孵化器（复杂互动，有 QTE）
 * Example 2: Incubate (Complex interaction, with QTE)
 */
export const incubateExample: Partial<IQteObject> = {
  id: 'incubator_01',
  name: 'Incubator',
  objectiveTag: ObjectiveTag.Incubate,
  baseDuration: 20000.0, // 10 秒
  qteCount: 3, // 需要完成 3 次 QTE
  qteDifficulty: 0.6, // 中等难度
  penalty: {
    ccType: CCType.Stun,
    damageType: DamageType.Physical,
    damageAmount: 10,
    duration: 5.0, // 5 秒眩晕
    highlightPlayer: true, // 失败会高亮
    highlightDuration: 8.0, // 8 秒高亮
  },
  requiredItems: ['item_pumpkin_seed'], // 需要南瓜种子
  outcomeItem: 'item_raw_pumpkin', // 产出生南瓜
  completeEvent: {
    eventName: 'incubate_complete',
    eventData: {
      progressContribution: 1,
    },
  },
  noiseTags: [NoiseTag.IncubatorPulse],
  baseNoiseLevel: 0.8, // 高噪音
  repeatable: false,
  interactionRadius: 2.5,
  displayNameKey: 'qte:incubator.name',
  interactionHintKey: 'qte:incubator.hint',
};

/**
 * 示例 3: 雕刻南瓜（需要材料）
 * Example 3: Carve Pumpkin (requires materials)
 */
export const carvePumpkinExample: Partial<IQteObject> = {
  id: 'carve_table_01',
  name: 'Carving Table',
  objectiveTag: ObjectiveTag.Carve,
  baseDuration: 25000.0, // 5 秒
  qteCount: 0, // 1 次 QTE
  qteDifficulty: 0.3, // 简单难度
  penalty: {
    ccType: CCType.Slow,
    duration: 3.0,
    highlightPlayer: false,
    highlightDuration: 0,
    effects: {
      stats: {
        moveSpeed: -0.2, // 减速 20%
      },
    },
  },
  requiredItems: ['item_raw_pumpkin'], // 需要生南瓜
  outcomeItem: 'item_carved_pumpkin', // 产出雕刻好的南瓜
  completeEvent: {
    eventName: 'carve_complete',
    eventData: { progressContribution: 1 },
  },
  noiseTags: [NoiseTag.CarveChip],
  baseNoiseLevel: 0.3,
  repeatable: true,
  cooldown: 30.0, // 30 秒冷却
  interactionRadius: 2.0,
  displayNameKey: 'qte:carve_table.name',
  interactionHintKey: 'qte:carve_table.hint',
};

/**
 * 示例 4: 救援队友（高风险互动）
 * Example 4: Rescue Teammate (high-risk interaction)
 */
export const rescueTeammateExample: Partial<IQteObject> = {
  id: 'hook_rescue_01',
  name: 'Rescue Hook',
  objectiveTag: ObjectiveTag.Rescue,
  baseDuration: 8.0, // 8 秒
  qteCount: 0, // 2 次 QTE
  qteDifficulty: 0.7, // 困难
  penalty: {
    ccType: CCType.Stun,
    damageType: DamageType.Physical,
    damageAmount: 15,
    duration: 4.0, // 4 秒眩晕
    highlightPlayer: true, // 失败会被高亮
    highlightDuration: 10.0, // 10 秒高亮
  },
  requiredItems: [],
  outcomeItem: null,
  completeEvent: {
    eventName: 'teammate_rescued',
    eventData: {
      rescuedPlayerId: 'placeholder', // 运行时设置
    },
  },
  noiseTags: [NoiseTag.RescueAlarm],
  baseNoiseLevel: 0.9, // 极高噪音
  repeatable: false,
  interactionRadius: 2.0,
  displayNameKey: 'qte:hook.rescue_name',
  interactionHintKey: 'qte:hook.rescue_hint',
};

/**
 * 示例 5: 打开保险箱（需要密码/工具）
 * Example 5: Open Safe (requires code/tools)
 */
export const openSafeExample: Partial<IQteObject> = {
  id: 'safe_01',
  name: 'Safe',
  baseDuration: 15000.0, // 15 秒
  qteCount: 5, // 5 次 QTE（模拟破解）
  qteDifficulty: 0.8, // 非常困难
  penalty: {
    effects: {
      stats: {
        visionRadius: -0.2, // 减少 20% 视野
      },
    },
    duration: 6.0,
    highlightPlayer: true,
    highlightDuration: 5.0,
  },
  requiredItems: [], // 可选：需要撬锁工具
  outcomeItem: null, // 高价值物品
  completeEvent: {
    eventName: 'spawn_item',
    eventData: { itemPool: 'rare_safe' },
  },
  baseNoiseLevel: 0.4,
  repeatable: false,
  interactionRadius: 1.5,
  displayNameKey: 'qte:safe.name',
  interactionHintKey: 'qte:safe.hint',
};

/**
 * ========== 实际游戏 QTE 对象配置 ==========
 * Actual Game QTE Object Configurations
 */

/**
 * 干草垛 - 搜索材料
 * Straw Heap - Search for materials
 */
export const QTE_STRAW_HEAP: Partial<IQteObject> = {
  id: 'qte_straw_heap',
  name: 'Straw Heap',
  objectiveTag: ObjectiveTag.Search,
  baseDuration: 30000.0, // 4 秒
  qteCount: 0, // 0 次 QTE（只需点击，无需 QTE 判定）
  qteDifficulty: 0.3, // 简单
  penalty: {
    duration: 2.0,
    highlightPlayer: false,
    highlightDuration: 0,
  },
  requiredItems: [], // 无需物品
  outcomeItem: null, // 随机产出（50%棉线，50%南瓜种子，种子有概率为优质）
  completeEvent: {
    eventName: 'search_complete',
    eventData: { progressContribution: 1 },
  },
  noiseTags: [NoiseTag.SearchRustle],
  baseNoiseLevel: 0.3,
  repeatable: true, // 允许重复搜索
  cooldown: 30000, // 30秒冷却时间
  allowProgressCache: false, // 不允许断点续传，每次从头开始
  interactionRadius: 2.5,
  displayNameKey: 'qte:strawHeap.name',
  interactionHintKey: 'qte:strawHeap.hint',
};

/**
 * 温室 - 催生南瓜
 * Greenhouse - Incubate pumpkin
 */
export const QTE_GREENHOUSE: Partial<IQteObject> = {
  id: 'qte_greenhouse',
  name: 'Greenhouse',
  objectiveTag: ObjectiveTag.Incubate,
  baseDuration: 40000.0, // 8 秒
  qteCount: 0, // 2 次 QTE
  qteDifficulty: 0.5, // 中等
  penalty: {
    ccType: CCType.Slow,
    duration: 3.0,
    highlightPlayer: true,
    highlightDuration: 5.0,
    effects: {
      stats: {
        moveSpeed: -0.3, // 减速 30%
      },
    },
  },
  requiredItems: ['item_pumpkin_seed'],
  outcomeItem: 'item_raw_pumpkin',
  completeEvent: {
    eventName: 'incubate_complete',
    eventData: { progressContribution: 1 },
  },
  noiseTags: [NoiseTag.IncubatorPulse],
  baseNoiseLevel: 0.6,
  repeatable: true,
  cooldown: 45.0, // 45 秒冷却
  interactionRadius: 2.5,
  displayNameKey: 'qte:greenhouse.name',
  interactionHintKey: 'qte:greenhouse.hint',
};

/**
 * 雕刻台 - 雕刻南瓜
 * Carving Table - Carve pumpkin
 */
export const QTE_CARVE_TABLE: Partial<IQteObject> = {
  id: 'qte_carve_table',
  name: 'Carving Table',
  objectiveTag: ObjectiveTag.Carve,
  baseDuration: 15000.0, // 6 秒
  qteCount: 0, // 2 次 QTE
  qteDifficulty: 0.4, // 简单-中等
  penalty: {
    ccType: CCType.Slow,
    duration: 2.5,
    highlightPlayer: false,
    highlightDuration: 0,
    effects: {
      stats: {
        moveSpeed: -0.2,
      },
    },
  },
  requiredItems: ['item_raw_pumpkin'],
  outcomeItem: 'item_carved_pumpkin',
  completeEvent: {
    eventName: 'carve_complete',
    eventData: { progressContribution: 1 },
  },
  noiseTags: [NoiseTag.CarveChip],
  baseNoiseLevel: 0.4,
  repeatable: true,
  cooldown: 30.0,
  interactionRadius: 2.0,
  displayNameKey: 'qte:carveTable.name',
  interactionHintKey: 'qte:carveTable.hint',
};

/**
 * 熬蜡炉 - 制作蜡烛芯
 * Wax Pot - Make candle wick
 */
export const QTE_WAX_POT: Partial<IQteObject> = {
  id: 'qte_wax_pot',
  name: 'Wax Pot',
  objectiveTag: ObjectiveTag.WaxAndWick,
  baseDuration: 30000.0, // 7 秒
  qteCount: 0, // 2 次 QTE
  qteDifficulty: 0.45,
  penalty: {
    ccType: CCType.Stun,
    damageType: DamageType.Environment,
    damageAmount: 5,
    duration: 2.0,
    highlightPlayer: true,
    highlightDuration: 4.0,
  },
  requiredItems: ['item_wax', 'item_cotton_thread'],
  outcomeItem: 'item_candle',
  completeEvent: {
    eventName: 'wax_complete',
    eventData: { progressContribution: 1 },
  },
  noiseTags: [NoiseTag.WaxBubble],
  baseNoiseLevel: 0.5,
  repeatable: true,
  cooldown: 40.0,
  interactionRadius: 2.0,
  displayNameKey: 'qte:waxPot.name',
  interactionHintKey: 'qte:waxPot.hint',
};

/**
 * 点火台 - 点燃南瓜灯
 * Light Table - Ignite lantern
 */
export const QTE_LIGHT_TABLE: Partial<IQteObject> = {
  id: 'qte_light_table',
  name: 'Light Table',
  objectiveTag: ObjectiveTag.Ignite,
  baseDuration: 20000.0, // 5 秒
  qteCount: 0, // 1 次 QTE
  qteDifficulty: 0.35,
  penalty: {
    ccType: CCType.Stun,
    damageType: DamageType.Environment,
    damageAmount: 8,
    duration: 1.5,
    highlightPlayer: true,
    highlightDuration: 6.0,
  },
  requiredItems: ['item_carved_pumpkin', 'item_candle'],
  outcomeItem: 'item_pumpkin_lantern',
  completeEvent: {
    eventName: 'ignite_complete',
    eventData: { progressContribution: 1 },
  },
  noiseTags: [NoiseTag.IgniteFlare],
  baseNoiseLevel: 0.7,
  repeatable: true,
  cooldown: 35.0,
  interactionRadius: 2.0,
  displayNameKey: 'qte:lightTable.name',
  interactionHintKey: 'qte:lightTable.hint',
};

/**
 * 祭台 - 献祭南瓜灯
 * Altar - Sacrifice pumpkin lanterns
 */
export const QTE_ALTAR: Partial<IQteObject> = {
  id: 'qte_altar',
  name: 'Altar',
  objectiveTag: ObjectiveTag.Altar,
  baseDuration: 20000.0, // 20 秒
  qteCount: 0, // 无 QTE 判定
  penalty: undefined,
  requiredItems: ['item_pumpkin_lantern'],
  outcomeItem: null, // 无产出物品
  completeEvent: {
    eventName: 'altar:sacrifice_complete',
    eventData: { progressContribution: 1 },
  },
  noiseTags: [],
  baseNoiseLevel: 0.0, // 无噪音
  repeatable: true, // 可重复献祭
  cooldown: 0, // 无冷却
  interactionRadius: 3.0,
  displayNameKey: 'qte:altar.name',
  interactionHintKey: 'qte:altar.hint',
  allowProgressCache: false, // 不允许缓存进度
};

/**
 * QTE 配置映射表
 * QTE Configuration Map
 */
export const QTE_CONFIG_MAP: Record<string, Partial<IQteObject>> = {
  StrawHeapInteract: QTE_STRAW_HEAP,
  MicroGreenhouse: QTE_GREENHOUSE,
  carve_table: QTE_CARVE_TABLE,
  waxPot: QTE_WAX_POT,
  light_table: QTE_LIGHT_TABLE,
  Altar: QTE_ALTAR,
};

