import type { Ability, Perk, Talent } from '../core/ExtraProperties';
import type { Faction } from '../core/Enum';
import type { StatBlock } from '../core/General';
import type { SignatureProfile } from '../core/Hook';
import type { ObjectiveHooks } from '../core/Hook';
import type { ObjectiveTag } from '../core/Enum';
import type { Ratio } from '../core/General';

/* =========================
 * 装备槽 / 出生配置
 * ========================= */
export interface Loadout {
  /** 主动技能（键位/冷却由 Ability 决定） */
  actives: Ability[]; // 建议 2–3 个
  /** 被动/天赋（常驻） */
  passives: (Perk | Talent)[];
  /** 终极技（可选） */
  ultimate?: Ability;
}

/* =========================
 * 角色基类
 * ========================= */
export interface BaseRole {
  faction: Faction;
  codename: string; // 唯一代号（英文/下划线/驼峰）
  displayName: string; // 展示名（欧洲风格）
  title?: string; // 称号：如“XXX的孩子：YYY”
  blurb?: string; // 简短说明（可用于卡片）
  baseStats?: StatBlock; // 角色基础数值
  signature?: SignatureProfile; // 噪声/光学签名
  loadout: Loadout; // 技能与被动组合
  objectiveHooks?: ObjectiveHooks; // 各环节定制加成
  /** 资源/经济侧默认参数（如携带容量、默认工具效率等） */
  economy?: {
    backpackSlots?: number;
    carryPenalty?: Ratio; // 默认搬运减速（如 -0.15）
    toolAffinity?: Partial<Record<ObjectiveTag, Ratio>>; // 工具熟练度
  };
}
