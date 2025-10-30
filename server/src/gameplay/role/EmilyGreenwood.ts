import { SurvivorRoleBase } from './SurvivorRoleBase';
import type { Ability, Perk } from '@shares/core/ExtraProperties';
import { Faction } from '@shares/core/Enum';
import { Logger } from '../../core/utils/Logger';

/**
 * 艾米莉·格林伍德 - 植物学家的孩子
 * Emily Greenwood - The Botanist's Child
 *
 * 特长：种植、培育、温室操作
 * 技能1：绿手指 - 种子寻找概率提升30%，成熟时间缩短20%
 * 技能2：自然亲和 - 在温室种植南瓜时，缩小30%的概率触发专注检定
 */
export class EmilyGreenwood extends SurvivorRoleBase {
  entity = 'player';
  codename = 'char_survivor_01';
  displayName = '艾米莉·格林伍德';
  title = '植物学家的孩子';
  blurb = '对植物生长有着独特见解，能轻易识别优质种子';

  // 种子品质追踪
  private seedQualityBonus: number = 1.2;

  constructor() {
    super();
    this.initializeRole();
  }

  baseStats = {
    maxHP: 100,
    moveSpeed: 0, // 基准速度
    visionRadius: 15,
    noiseMultiplier: 0,
  };

  signature = {
    baseNoise: 1.0,
    baseLight: 1.0,
  };

  loadout = {
    actives: [this.getGreenThumbAbility()],
    passives: [this.getNatureAffinityPerk()],
  };

  objectiveHooks = {
    // 搜索时的加成：种子寻找概率提升30%
    onSearch: {
      searchDropMult: 0.3, // +30%掉落率
    },
    // 催生时的加成：成熟时间缩短20%
    onIncubate: {
      incubateTimeMult: -0.2, // 减少20%时间
      qteBonus: 0.3, // 减少30% QTE触发概率（自然亲和）
    },
  };

  economy = {
    backpackSlots: 4,
    carryPenalty: -0.15,
  };

  survivorParams = {
    search: {
      timeBase: 8, // 基础搜索时间8秒
      dropRates: {
        PumpkinSeed: 0.35, // 基础掉率35%，技能后45.5%
        Wax: 0.25,
        CottonThread: 0.2,
      },
      revealChance: 0.15, // 15%概率惊乌
    },
    incubate: {
      timeBase: 30, // 基础催生时间30秒
      coopBonusPerPlayer: 5, // 每人缩短5秒
      minTime: 15, // 最短15秒
      qteWindowsBase: 3, // 3次QTE
      failRollback: 0.3, // 失败回退30%
    },
    carve: {
      timePerPumpkin: 20, // 每个南瓜20秒
      successRateBase: 0.8, // 80%成功率
      onFailRefund: {
        Wax: 1,
        CottonThread: 1,
      },
    },
    waxAndWick: {
      timeBase: 15, // 15秒
    },
    igniteAndCarry: {
      igniteTimeBase: 3, // 点火3秒
      carryDebuff: -0.15, // 减速15%
      selfNoiseAura: 0,
    },
    altar: {
      perLanternCharge: 25, // 每个南瓜灯充能25%
      needed: 4, // 需要4个
      mode: 'Exorcise' as const,
      exorcise: { channelTime: 20 },
    },
  };

  /**
   * 技能1：绿手指
   * Green Thumb - 提升种子寻找和品质
   */
  private getGreenThumbAbility(): Ability {
    return {
      id: 'green_thumb',
      name: '绿手指',
      description: '种子寻找概率提升30%，找到的种子品质更高，成熟时间缩短20%',
      faction: Faction.Survivor,
      cooldown: 0, // 被动效果
      effects: {
        searchDropMult: 0.3,
        incubateTimeMult: -0.2,
      },
      tags: ['Passive', 'Search', 'Incubate'],
    };
  }

  /**
   * 技能2：自然亲和
   * Nature's Affinity - 减少温室QTE触发概率
   */
  private getNatureAffinityPerk(): Perk {
    return {
      id: 'nature_affinity',
      name: '自然亲和',
      description: '在温室种植南瓜时，缩小30%的概率触发专注检定',
      passive: true,
      effects: {
        incubateFailMult: -0.3, // 减少30%失败概率
      },
    };
  }

  /* =========================
   * 特殊技能实现
   * ========================= */

  /**
   * 重写搜索完成逻辑，添加绿手指效果
   */
  public override completeSearch(
    itemType: 'PumpkinSeed' | 'Wax' | 'CottonThread'
  ): boolean {
    const success = super.completeSearch(itemType);

    // 绿手指：找到种子时品质更高
    if (success && itemType === 'PumpkinSeed') {
      Logger.log(
        `[${this.codename}] Green Thumb: Found high-quality seed (${this.seedQualityBonus}x quality)`
      );
      // 这里可以触发额外的逻辑，比如标记种子品质
    }

    return success;
  }

  /**
   * 重写QTE逻辑，添加自然亲和效果
   */
  public override performQTE(): boolean {
    // 自然亲和：减少30%触发难QTE的概率
    const success = super.performQTE();

    if (success) {
      Logger.log(`[${this.codename}] Nature's Affinity helped with QTE`);
    }

    return success;
  }

  /**
   * 获取种子品质加成
   */
  public getSeedQualityBonus(): number {
    return this.seedQualityBonus;
  }

  /**
   * 特殊能力：催生加速（被动生效）
   * 已在objectiveHooks中定义，这里提供查询接口
   */
  public getIncubateSpeedBonus(): number {
    return 0.2; // 20%加速
  }
}

// 导出单例
export const emilyGreenwood = new EmilyGreenwood();
