import type { BaseRole } from './BaseRole';
import type { Faction } from '../core/Enum';
import type { Seconds } from '../core/General';
import type { Ratio } from '../core/General';
import type { NoiseTag } from '../core/Enum';
import type { Meters } from '../core/General';

/* =========================
 * 监管者接口（选人即套用）
 * ========================= */
export interface OverseerRole extends BaseRole {
  faction: Faction.Overseer;

  overseerParams: {
    patrol: {
      senseRadius: Meters; // 巡逻感知半径（综合）
      listenTags: NoiseTag[]; // 重点监听的噪声
      breadcrumbDecay: Seconds; // 线索衰减时长（足迹/声纹）
    };
    hunt: {
      baseTTK: Seconds; // 基础接近时间预估（供AI/提示）
      chaseSpeedBonus?: Ratio; // 通常追击加成
      recommendedCombo?: string[]; // 组合技建议（UI/教程用）
    };
    downAndBind: {
      downTime: Seconds; // 击倒时间
      bindWindow: Seconds; // 束缚窗口
      rescueAlarmOnHelp: boolean; // 解救是否触发警报
    };
    sabotage: {
      timeBase: Seconds; // 破坏一次耗时
      damageUnit: number; // 对目标耐久的伤害单位
      progressDelay: Seconds; // 对祭台/目标的延滞时间
      emits?: NoiseTag[];
    };
    gateKeep: {
      routes: string[]; // 常用巡守线路名
      kitAdvice?: string[]; // 门口决战推荐配置
    };
  };
}
