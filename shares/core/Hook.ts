import type { EffectBundle, Ratio } from './General';
import type { ObjectiveTag } from './Enum';
import type { Seconds } from './General';

/* =========================
 * 运行时挂钩（接口钩子，不含实现）
 * ========================= */
export interface ObjectiveHooks {
  /** 不同环节的局部修正（叠加到 EffectBundle） */
  onSearch?: EffectBundle & { premiumSeedChance?: Ratio }; // 优质种子概率加成（植物学家专属）
  onIncubate?: EffectBundle & { qteBonus?: Ratio; premiumSeedTimeReduction?: Ratio }; // QTE 成功窗增益 + 优质种子时间减免
  onCarve?: EffectBundle;
  onWaxAndWick?: EffectBundle;
  onIgnite?: EffectBundle;
  onCarryLantern?: EffectBundle;
  onAltar?: EffectBundle;

  /** 监管者侧 */
  onPatrol?: EffectBundle;
  onHunt?: EffectBundle;
  onDownAndBind?: EffectBundle & { bindWindowBonus?: Seconds };
  onSabotage?: EffectBundle;
  onGateKeep?: EffectBundle;
}

export interface SignatureProfile {
  /** 角色在不同动作下的噪声/光学特征倍率（覆盖/相乘） */
  baseNoise: Ratio;
  baseLight: Ratio;
  modifiers?: Partial<Record<ObjectiveTag, { noise?: Ratio; light?: Ratio }>>;
}
