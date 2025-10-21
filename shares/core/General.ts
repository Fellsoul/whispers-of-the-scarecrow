import type { CCType, DamageType, NoiseTag } from './Enum';

/**
 * 幽冥稻草：Whispers of the Scarecrow
 * —— 仅数据接口（求生者 / 监管者），可直接用于“选人即套用”的运行时装配。
 * 说明：
 * - 所有百分比用小数表示（+20% = 0.20, -15% = -0.15）
 * - 不含实现与示例对象；仅契约。
 */

export type Seconds = number;
export type Ratio = number; // 0.20=+20%
export type Meters = number;

/* =========================
 * 通用：数值包（可叠加）
 * ========================= */
export interface StatBlock {
  maxHP?: number; // 生命上限
  moveSpeed?: Ratio; // 移动速度
  carrySpeed?: Ratio; // 搬运速度（负重）
  visionRadius?: Meters; // 视野/感知半径
  noiseMultiplier?: Ratio; // 自身噪声系数（<0 更安静）
  lightSignature?: Ratio; // 光学显形系数
  fearResist?: Ratio; // 恐惧抗性
  ccResist?: Partial<Record<CCType, Ratio>>; // 控场抗性细分
  dmgResist?: Partial<Record<DamageType, Ratio>>; // 伤害减免
}

export interface EffectBundle {
  // 通用加成
  stats?: StatBlock;

  // 生产/目标环节修正
  searchTimeMult?: Ratio; // 搜索耗时缩放
  searchDropMult?: Ratio; // 掉落率提升
  incubateFailMult?: Ratio; // 催生失败率缩放
  incubateTimeMult?: Ratio; // 催生时间缩放
  carveSuccess?: Ratio; // 雕刻成功率加成
  carveTimeMult?: Ratio; // 雕刻时间缩放
  waxTimeMult?: Ratio; // 熬蜡装芯时间缩放
  igniteTimeMult?: Ratio; // 点火时间缩放
  carryDebuffMult?: Ratio; // 搬运减速缩放
  lanternDurability?: Ratio; // 南瓜灯耐久/被破坏阈值
  altarChargeRate?: Ratio; // 祭台充能速度
  altarEfficiency?: Ratio; // 祭台充能效率
  escapeSpeed?: Ratio; // 逃生阶段速度

  // 战斗/控制/信息
  revealRadius?: Meters; // 侦测/显形半径
  stealthBonus?: Ratio; // 隐身/隐匿强度
  disableDuration?: Seconds; // 令对手“Suppress”的时长
  healInstant?: number; // 立即治疗值
  healHoT?: { tick: number; interval: Seconds; duration: Seconds };

  // 噪声与可探测特征
  emitsNoise?: NoiseTag[]; // 触发时附带的噪声标签
  revealOnCast?: boolean; // 释放会显形
}

export type CostTable = Partial<{
  stamina: number; // 体力消耗（若有体力系统）
  charges: number; // 次数
  cooldown: Seconds; // 冷却时间（覆盖/附加）
  resources: Record<string, number>; // 任意资源货币表
}>;
