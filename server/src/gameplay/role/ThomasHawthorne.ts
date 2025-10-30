import { SurvivorRoleBase } from './SurvivorRoleBase';
import type { Ability, Perk } from '@shares/core/ExtraProperties';
import { Faction } from '@shares/core/Enum';
import { Logger } from '../../core/utils/Logger';

/**
 * 托马斯·霍桑 - 森林探险家的孩子
 * Thomas Hawthorne - The Forest Explorer's Child
 *
 * 特长：侦查、追踪、导航
 * 技能1：鹰眼 - 地图视野提升30%，高亮显示触发心跳距离的敌人
 * 技能2：追踪者 - 追踪时速度提升15%，不易发出移动噪音
 */
export class ThomasHawthorne extends SurvivorRoleBase {
  entity = 'player';
  codename = 'char_survivor_02';
  displayName = '托马斯·霍桑';
  title = '森林探险家的孩子';
  blurb = '对自然环境有敏锐感知，能轻易发现线索';

  // 追踪状态
  private isTracking: boolean = false;
  private detectedEnemies: Set<string> = new Set();

  constructor() {
    super();
    this.initializeRole();
  }

  baseStats = {
    maxHP: 100,
    moveSpeed: 0.05, // 稍快的基础速度
    visionRadius: 19.5, // 基础15 * 1.3 = 19.5
    noiseMultiplier: -0.1, // 更安静
  };

  signature = {
    baseNoise: 0.9, // 更安静
    baseLight: 1.0,
  };

  loadout = {
    actives: [this.getEagleEyeAbility()],
    passives: [this.getTrackerPerk()],
  };

  objectiveHooks = {
    // 搜索时：鹰眼效果提供额外视野和侦测
    onSearch: {
      revealRadius: 30, // 30米侦测半径
      stats: {
        visionRadius: 4.5, // +30%视野
      },
    },
    // 携带南瓜灯时：速度提升，噪音减少
    onCarryLantern: {
      stats: {
        moveSpeed: 0.15, // +15%速度
        noiseMultiplier: -0.2, // 减少20%噪音
      },
    },
  };

  economy = {
    backpackSlots: 4,
    carryPenalty: -0.1, // 较小的搬运惩罚
  };

  survivorParams = {
    search: {
      timeBase: 7, // 搜索稍快 7秒
      dropRates: {
        PumpkinSeed: 0.3,
        Wax: 0.25,
        CottonThread: 0.25, // 更容易找到线
      },
      revealChance: 0.1, // 更不易暴露
    },
    incubate: {
      timeBase: 30,
      coopBonusPerPlayer: 5,
      minTime: 15,
      qteWindowsBase: 3,
      failRollback: 0.3,
    },
    carve: {
      timePerPumpkin: 20,
      successRateBase: 0.8,
      onFailRefund: {
        Wax: 1,
        CottonThread: 1,
      },
    },
    waxAndWick: {
      timeBase: 15,
    },
    igniteAndCarry: {
      igniteTimeBase: 3,
      carryDebuff: -0.1, // 减速较小 10%
      selfNoiseAura: -0.15, // 更安静
    },
    altar: {
      perLanternCharge: 25,
      needed: 4,
      mode: 'Exorcise' as const,
      exorcise: { channelTime: 20 },
    },
  };

  /**
   * 技能1：鹰眼
   * Eagle Eye - 扩大视野并高亮敌人
   */
  private getEagleEyeAbility(): Ability {
    return {
      id: 'eagle_eye',
      name: '鹰眼',
      description: '地图视野提升30%，能在地图上高亮显示触发心跳距离的敌人',
      faction: Faction.Survivor,
      cooldown: 0, // 被动效果
      duration: -1, // 永久
      effects: {
        stats: {
          visionRadius: 4.5, // +30% of base 15 = +4.5
        },
        revealRadius: 30, // 30米侦测半径
      },
      tags: ['Passive', 'Vision', 'Recon'],
    };
  }

  /**
   * 技能2：追踪者
   * Tracker - 追踪时速度提升，减少噪音
   */
  private getTrackerPerk(): Perk {
    return {
      id: 'tracker',
      name: '追踪者',
      description:
        '在追踪南瓜灯携带者或怪物时，速度提升15%，并且不易发出移动噪音',
      passive: true,
      effects: {
        stats: {
          moveSpeed: 0.15, // +15%速度（追踪时）
          noiseMultiplier: -0.2, // 减少20%噪音
        },
      },
    };
  }

  /* =========================
   * 特殊技能实现
   * ========================= */

  /**
   * 重写视野半径计算，应用鹰眼效果
   */
  public override getVisionRadius(): number {
    return super.getVisionRadius() + 4.5; // +30%（基础15 * 0.3 = 4.5）
  }

  /**
   * 重写移动速度计算，应用追踪者效果
   */
  public override getMoveSpeed(): number {
    let speed = super.getMoveSpeed();

    // 追踪者：追踪时或携带南瓜灯时速度提升
    if (this.isTracking || this.isCarryingLantern) {
      speed *= 1.15; // +15%
      Logger.log(`[${this.codename}] Tracker bonus active: +15% speed`);
    }

    return speed;
  }

  /**
   * 开始追踪模式
   */
  public startTracking(): void {
    this.isTracking = true;
    Logger.log(`[${this.codename}] Tracking mode activated`);
  }

  /**
   * 停止追踪模式
   */
  public stopTracking(): void {
    this.isTracking = false;
    this.detectedEnemies.clear();
    Logger.log(`[${this.codename}] Tracking mode deactivated`);
  }

  /**
   * 鹰眼：侦测范围内的敌人
   * @param playerPosition 玩家位置
   * @param enemies 敌人列表
   * @returns 被侦测到的敌人ID列表
   */
  public detectEnemiesWithEagleEye(
    playerPosition: { x: number; y: number; z: number },
    enemies: Array<{
      position: { x: number; y: number; z: number };
      id: string;
    }>
  ): string[] {
    const detectionRange = 30; // 30米侦测半径
    const detected: string[] = [];

    enemies.forEach((enemy) => {
      const distance = this.calculateDistance(playerPosition, enemy.position);

      if (distance <= detectionRange) {
        detected.push(enemy.id);
        this.detectedEnemies.add(enemy.id);
        Logger.log(
          `[${this.codename}] Eagle Eye detected enemy: ${enemy.id} at ${distance.toFixed(1)}m`
        );
      }
    });

    return detected;
  }

  /**
   * 计算两点间距离
   */
  private calculateDistance(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number }
  ): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
        Math.pow(pos2.y - pos1.y, 2) +
        Math.pow(pos2.z - pos1.z, 2)
    );
  }

  /**
   * 获取当前侦测到的敌人
   */
  public getDetectedEnemies(): string[] {
    return Array.from(this.detectedEnemies);
  }

  /**
   * 移动噪音减少（追踪者天赋）
   */
  public getNoiseMultiplier(): number {
    let mult = this.baseStats.noiseMultiplier || 0;

    // 追踪者天赋：减少20%噪音
    mult -= 0.2;

    return mult;
  }

  /**
   * 重置追踪状态
   */
  public override reset(): void {
    super.reset();
    this.isTracking = false;
    this.detectedEnemies.clear();
  }
}

// 导出单例
export const thomasHawthorne = new ThomasHawthorne();
