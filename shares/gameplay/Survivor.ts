import type { BaseRole } from './BaseRole';
import type { Faction } from '../core/Enum';
import type { Seconds } from '../core/General';
import type { Ratio } from '../core/General';
import type { NoiseTag } from '../core/Enum';

/* =========================
 * 求生者接口（选人即套用）
 * ========================= */
export interface SurvivorRole extends BaseRole {
  faction: Faction.Survivor;

  /* 求生流程相关的明确参数（用于数值策划直连） */
  survivorParams: {
    search: {
      timeBase: Seconds; // 单次搜索基础时长
      dropRates: Partial<
        Record<'PumpkinSeed' | 'Wax' | 'CottonThread', number>
      >; // 掉率
      revealChance: number; // 惊乌/外泄概率
      emits?: NoiseTag[];
    };
    incubate: {
      timeBase: Seconds; // 单颗或单批基础时间
      coopBonusPerPlayer: Seconds; // 多人协作每人缩短
      minTime: Seconds; // 下限
      qteWindowsBase: number; // QTE 次数
      failRollback: Ratio; // 失败回退
      emitsOnFail?: NoiseTag[];
    };
    carve: {
      timePerPumpkin: Seconds;
      successRateBase: Ratio;
      onFailRefund?: Partial<Record<'Wax' | 'CottonThread', number>>;
      emits?: NoiseTag[];
    };
    waxAndWick: {
      timeBase: Seconds;
    };
    igniteAndCarry: {
      igniteTimeBase: Seconds;
      carryDebuff: Ratio; // 例：-0.15
      selfNoiseAura?: Ratio; // 负值=更安静
      emits?: NoiseTag[];
    };
    altar: {
      perLanternCharge: number;
      needed: number; // 需求数量（胜利阈值）
      mode: 'Exorcise' | 'EscapeDoor'; // 地图终局模式（可由地图逻辑覆盖）
      exorcise?: { channelTime: Seconds };
      escapeDoor?: { countdown: Seconds };
    };
  };
}
