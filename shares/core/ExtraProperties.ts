import type { Faction, ObjectiveTag } from './Enum';
import type { EffectBundle, CostTable, Seconds, Meters } from './General';

/* =========================
 * 技能/天赋/被动
 * ========================= */
export interface Ability {
  id: string;
  name: string;
  description: string;
  faction?: Faction; // 若技能阵营限定
  duration?: Seconds;
  cooldown?: Seconds;
  channelTime?: Seconds; // 引导型技能
  charges?: number; // 可充能次数
  effects?: EffectBundle;
  objectiveTags?: ObjectiveTag[]; // 作用的流程环节
  tags?: string[]; // 关键词：Recon/CC/Chase/Zone/Heal 等
  cost?: CostTable;
  radius?: Meters; // 范围技能可用
  maxTargets?: number;
  lineOfSightRequired?: boolean;
  breakOnDamage?: boolean; // 施放被打断
}

export interface Perk {
  id: string;
  name: string;
  description: string;
  passive: true;
  effects?: EffectBundle; // 被动效果（常驻）
}

export interface Talent {
  id: string;
  name: string;
  description: string;
  passive?: boolean;
  effects?: EffectBundle;
}
