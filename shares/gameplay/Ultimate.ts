import type { Faction } from '../core/Enum';
import type { StatBlock } from '../core/General';
import type { ObjectiveHooks } from '../core/Hook';
import type { SignatureProfile } from '../core/Hook';
import type { SurvivorRole } from './Survivor';
import type { OverseerRole } from './Overseer';
import type { EffectBundle } from '../core/General';
import type { Seconds } from '../core/General';
import type { Ratio } from '../core/General';
import type { Meters } from '../core/General';
import type { Loadout } from './BaseRole';

/* =========================
 * 运行时合成（可选辅助接口）
 * —— 引擎可在“选人”后生成一份最终数值
 * ========================= */
export interface RuntimeMergedStats {
  roleId: string;
  faction: Faction;
  finalStats: Required<StatBlock>; // 合并 baseStats + 被动 + 临时
  hooks: Required<ObjectiveHooks>; // 全部环节的最终修正
  signature: Required<SignatureProfile>; // 最终探测特征
  loadout: Loadout; // 技能冷却/充能等已归并
}

/* =========================
 * 工厂函数的签名（仅契约，非实现）
 * ========================= */
export interface RoleApplier {
  /** 选中某个角色后，将其数据与地图/模式基础数值合并为运行时配置 */
  applyRole(
    role: SurvivorRole | OverseerRole,
    baseEnv: {
      mapModifiers?: EffectBundle; // 地图/模式整体加成
      globalCaps?: Partial<{
        minCooldown: Seconds;
        maxVision: Meters;
        minCarryDebuff: Ratio;
      }>;
    }
  ): RuntimeMergedStats;
}
