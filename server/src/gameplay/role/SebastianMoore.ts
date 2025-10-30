import { SurvivorRoleBase } from './SurvivorRoleBase';
import type { Ability, Perk } from '@shares/core/ExtraProperties';
import { Faction } from '@shares/core/Enum';
import { Logger } from '../../core/utils/Logger';

/**
 * 塞巴斯蒂安·莫尔 - 怪物学家的孩子
 * Sebastian Moore - The Monster Scholar's Child
 *
 * 特长：战斗生存、闪躲、药水制作
 * 技能1：条件反射 - 怪物攻击时20%几率闪躲，闪躲失败速度提升20%（10秒）
 * 技能2：药水大师 - 每100秒饮用药水，解除所有负面Buff
 */
export class SebastianMoore extends SurvivorRoleBase {
  entity = 'player';
  codename = 'char_survivor_04';
  displayName = '塞巴斯蒂安·莫尔';
  title = '怪物学家的孩子';
  blurb = '对怪物行为模式有深刻理解，能使用药水自保';

  // 技能常量
  private readonly DODGE_CHANCE = 0.2; // 20%闪躲几率
  private readonly DODGE_FAIL_SPEED_BOOST = 0.2; // 闪躲失败后20%速度提升
  private readonly SPEED_BOOST_DURATION = 10000; // 10秒

  // 内部状态追踪
  private lastPotionTime: number = 0;
  private readonly potionCooldown: number = 100000; // 100秒
  private dodgeSpeedBoostActive: boolean = false;
  private dodgeSpeedBoostEndTime: number = 0;
  private totalDodges: number = 0;
  private totalPotionsUsed: number = 0;

  constructor() {
    super();
    this.initializeRole();
  }

  baseStats = {
    maxHP: 110, // 稍高的生命值
    moveSpeed: 0,
    visionRadius: 15,
    noiseMultiplier: 0,
    fearResist: 0.15, // 15%恐惧抗性
  };

  signature = {
    baseNoise: 1.0,
    baseLight: 1.0,
  };

  loadout = {
    actives: [this.getReflexesAbility(), this.getPotionMasterAbility()],
    passives: [this.getMonsterKnowledgePerk()],
  };

  objectiveHooks = {
    // 雕刻时：较高成功率和怪物抗性
    onCarve: {
      carveSuccess: 0.05, // +5%成功率
      stats: {
        fearResist: 0.15,
        dmgResist: {
          Physical: 0.05,
        },
      },
    },
  };

  economy = {
    backpackSlots: 4,
    carryPenalty: -0.15,
  };

  survivorParams = {
    search: {
      timeBase: 8,
      dropRates: {
        PumpkinSeed: 0.3,
        Wax: 0.25,
        CottonThread: 0.2,
      },
      revealChance: 0.12, // 更谨慎，较低暴露率
      emits: [],
    },
    incubate: {
      timeBase: 30,
      coopBonusPerPlayer: 5,
      minTime: 15,
      qteWindowsBase: 3,
      failRollback: 0.3,
      emitsOnFail: [],
    },
    carve: {
      timePerPumpkin: 20,
      successRateBase: 0.85, // 较高成功率 85%
      onFailRefund: {
        Wax: 1,
        CottonThread: 1,
      },
      emits: [],
    },
    waxAndWick: {
      timeBase: 15,
    },
    igniteAndCarry: {
      igniteTimeBase: 3,
      carryDebuff: -0.15,
      selfNoiseAura: 0,
      emits: [],
    },
    altar: {
      perLanternCharge: 25,
      needed: 4,
      mode: 'Exorcise' as const,
      exorcise: { channelTime: 20 },
    },
  };

  /**
   * 技能1：条件反射
   * Reflexes - 闪躲攻击或获得速度提升
   */
  private getReflexesAbility(): Ability {
    return {
      id: 'reflexes',
      name: '条件反射',
      description:
        '怪物攻击时，有20%几率闪躲；如果闪躲失败，速度提升20%，持续10秒',
      faction: Faction.Survivor,
      cooldown: 0, // 被动触发
      duration: 10, // 速度提升持续10秒
      effects: {
        stats: {
          moveSpeed: 0.2, // +20%速度（闪躲失败后）
        },
      },
      tags: ['Defensive', 'Dodge', 'SpeedBoost'],
    };
  }

  /**
   * 技能2：药水大师
   * Potion Master - 定期解除负面效果
   */
  private getPotionMasterAbility(): Ability {
    return {
      id: 'potion_master',
      name: '药水大师',
      description: '每100秒饮用下一瓶自制特效药水，解除所有负面Buff',
      faction: Faction.Survivor,
      cooldown: 100, // 100秒冷却
      channelTime: 2, // 饮用需要2秒
      effects: {
        healInstant: 20, // 恢复20点生命
      },
      tags: ['Heal', 'Cleanse', 'Utility'],
    };
  }

  /**
   * 被动：怪物知识
   * Monster Knowledge - 对怪物的额外抗性
   */
  private getMonsterKnowledgePerk(): Perk {
    return {
      id: 'monster_knowledge',
      name: '怪物知识',
      description: '对怪物效果有额外抗性',
      passive: true,
      effects: {
        stats: {
          fearResist: 0.15, // 15%恐惧抗性
          dmgResist: {
            Physical: 0.05, // 5%物理伤害减免
          },
        },
      },
    };
  }

  /* =========================
   * 特殊技能实现
   * ========================= */

  /**
   * 重写受伤逻辑，添加条件反射闪躲
   */
  protected override onBeforeTakeDamage(
    damage: number,
    _damageType?: string
  ): number {
    // 尝试闪躲
    const dodgeSuccess = Math.random() < this.DODGE_CHANCE;

    if (dodgeSuccess) {
      Logger.log(
        `[${this.codename}] ⚡ DODGE SUCCESS! Avoided ${damage} damage!`
      );
      this.totalDodges++;
      return 0; // 完全闪躲
    } else {
      // 闪躲失败，激活速度提升
      this.activateDodgeSpeedBoost();
      Logger.log(
        `[${this.codename}] Dodge failed, speed boost activated for 10s`
      );
      return damage;
    }
  }

  /**
   * 激活闪躲失败后的速度提升
   */
  private activateDodgeSpeedBoost(): void {
    this.dodgeSpeedBoostActive = true;
    this.dodgeSpeedBoostEndTime = Date.now() + this.SPEED_BOOST_DURATION;
  }

  /**
   * 检查速度提升是否激活
   */
  private isSpeedBoostActive(): boolean {
    if (
      this.dodgeSpeedBoostActive &&
      Date.now() < this.dodgeSpeedBoostEndTime
    ) {
      return true;
    }
    if (this.dodgeSpeedBoostActive) {
      this.dodgeSpeedBoostActive = false;
    }
    return false;
  }

  /**
   * 重写移动速度计算，应用速度提升
   */
  public override getMoveSpeed(): number {
    let speed = super.getMoveSpeed();

    // 闪躲失败后的速度提升
    if (this.isSpeedBoostActive()) {
      speed *= 1 + this.DODGE_FAIL_SPEED_BOOST;
      Logger.log(
        `[${this.codename}] Speed boost active: +${this.DODGE_FAIL_SPEED_BOOST * 100}%`
      );
    }

    return speed;
  }

  /**
   * 药水大师：使用药水
   * @returns 是否成功使用
   */
  public usePotionMaster(): boolean {
    if (!this.canUsePotionAbility()) {
      Logger.log(
        `[${this.codename}] Potion on cooldown: ${this.getPotionCooldownRemaining()}s remaining`
      );
      return false;
    }

    Logger.log(`[${this.codename}] 🧪 Using Potion Master!`);

    // 清除所有Debuff
    this.clearAllDebuffs();

    // 恢复生命值
    this.heal(20);

    this.lastPotionTime = Date.now();
    this.totalPotionsUsed++;

    Logger.log(
      `[${this.codename}] Potion used successfully (Total used: ${this.totalPotionsUsed})`
    );
    return true;
  }

  /**
   * 检查是否可以使用药水
   */
  private canUsePotionAbility(): boolean {
    const currentTime = Date.now();
    return currentTime - this.lastPotionTime >= this.potionCooldown;
  }

  /**
   * 获取药水剩余冷却时间（秒）
   */
  public getPotionCooldownRemaining(): number {
    const elapsed = Date.now() - this.lastPotionTime;
    const remaining = Math.max(0, this.potionCooldown - elapsed);
    return Math.ceil(remaining / 1000);
  }

  /**
   * 获取闪躲统计
   */
  public getTotalDodges(): number {
    return this.totalDodges;
  }

  /**
   * 获取药水使用统计
   */
  public getTotalPotionsUsed(): number {
    return this.totalPotionsUsed;
  }

  /**
   * 重置所有内部状态
   */
  public override reset(): void {
    super.reset();
    this.lastPotionTime = 0;
    this.dodgeSpeedBoostActive = false;
    this.dodgeSpeedBoostEndTime = 0;
    this.totalDodges = 0;
    this.totalPotionsUsed = 0;
  }
}

// 导出单例
export const sebastianMoore = new SebastianMoore();
