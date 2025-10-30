import { SurvivorRoleBase } from './SurvivorRoleBase';
import type { Ability, Perk } from '@shares/core/ExtraProperties';
import { Faction } from '@shares/core/Enum';
import { Logger } from '../../core/utils/Logger';

/**
 * 莉莉安·诺布尔 - 古代文学家的孩子
 * Lilian Noble - The Ancient Scholar's Child
 *
 * 特长：祭坛操作、古代符文
 * 技能1：古知者 - 祭台充能速度提升25%，6%几率瞬间完成交互
 * 技能2：远古回响 - 祭坛附近视野扩大20%，高亮显示敌人
 */
export class LilianNoble extends SurvivorRoleBase {
  entity = 'player';
  codename = 'char_survivor_03';
  displayName = '莉莉安·诺布尔';
  title = '古代文学家的孩子';
  blurb = '对古代仪式有深入研究，能解读古老祭台';

  // 古代祝福概率
  private readonly ANCIENT_BLESSING_CHANCE = 0.06; // 6%
  private isNearAltar: boolean = false;
  private altarBlessingCount: number = 0;

  constructor() {
    super();
    this.initializeRole();
  }

  baseStats = {
    maxHP: 100,
    moveSpeed: 0,
    visionRadius: 15,
    noiseMultiplier: 0,
  };

  signature = {
    baseNoise: 1.0,
    baseLight: 1.0,
  };

  loadout = {
    actives: [this.getAncientKnowledgeAbility()],
    passives: [this.getAncientEchoesPerk()],
  };

  objectiveHooks = {
    // 祭坛操作：充能速度提升25%，视野扩大
    onAltar: {
      altarChargeRate: 0.25, // +25%充能速度
      revealRadius: 20, // 20米范围内高亮敌人
      stats: {
        visionRadius: 3, // +20%视野（基础15 * 0.2 = 3）
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
        Wax: 0.3, // 更容易找到蜡
        CottonThread: 0.2,
      },
      revealChance: 0.15,
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
      timeBase: 13, // 稍快 13秒
    },
    igniteAndCarry: {
      igniteTimeBase: 3,
      carryDebuff: -0.15,
      selfNoiseAura: 0,
    },
    altar: {
      perLanternCharge: 31.25, // 25 * 1.25 = 31.25% per lantern
      needed: 4,
      mode: 'Exorcise' as const,
      exorcise: { channelTime: 16 }, // 20 * 0.8 = 16秒（25%加速）
    },
  };

  /**
   * 技能1：古知者
   * Ancient Knowledge - 提升祭台充能速度，有概率触发祝福
   */
  private getAncientKnowledgeAbility(): Ability {
    return {
      id: 'ancient_knowledge',
      name: '古知者',
      description:
        '祭台充能速度提升25%，专注鉴定成功后有6%的几率触发古代祝福，瞬间完成交互事件',
      faction: Faction.Survivor,
      cooldown: 0, // 被动效果
      effects: {
        altarChargeRate: 0.25, // +25%充能速度
      },
      tags: ['Passive', 'Altar', 'Blessing'],
    };
  }

  /**
   * 技能2：远古回响
   * Ancient Echoes - 祭坛附近增强感知
   */
  private getAncientEchoesPerk(): Perk {
    return {
      id: 'ancient_echoes',
      name: '远古回响',
      description: '在祭坛附近时，地图扩大20%视野，并且高光显示视野内的敌人',
      passive: true,
      effects: {
        stats: {
          visionRadius: 3, // +20% of base 15 = +3 (when near altar)
        },
        revealRadius: 20, // 20米范围内生效
      },
    };
  }

  /* =========================
   * 特殊技能实现
   * ========================= */

  /**
   * 重写祭坛充能，添加古代祝福触发
   */
  public override chargeAltar(): number {
    // 检查是否触发古代祝福
    if (this.tryAncientBlessing()) {
      Logger.log(
        `[${this.codename}] ✨ ANCIENT BLESSING TRIGGERED! Instant completion!`
      );
      this.altarBlessingCount++;
      return 100; // 瞬间完成，返回100%充能
    }

    // 正常充能，应用古知者加成
    return super.chargeAltar();
  }

  /**
   * 尝试触发古代祝福
   */
  private tryAncientBlessing(): boolean {
    return Math.random() < this.ANCIENT_BLESSING_CHANCE;
  }

  /**
   * 设置是否在祭坛附近（外部调用）
   */
  public setNearAltar(
    playerPosition: { x: number; y: number; z: number },
    altarPosition: { x: number; y: number; z: number }
  ): void {
    const distance = this.calculateDistance(playerPosition, altarPosition);
    this.isNearAltar = distance <= 20; // 20米范围

    if (this.isNearAltar) {
      Logger.log(`[${this.codename}] Near altar, Ancient Echoes active`);
    }
  }

  /**
   * 重写视野计算，在祭坛附近提供加成
   */
  public override getVisionRadius(): number {
    let vision = super.getVisionRadius();

    // 远古回响：祭坛附近视野+20%
    if (this.isNearAltar) {
      vision *= 1.2;
      Logger.log(`[${this.codename}] Ancient Echoes: +20% vision near altar`);
    }

    return vision;
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
   * 获取古代祝福触发次数统计
   */
  public getAncientBlessingCount(): number {
    return this.altarBlessingCount;
  }

  /**
   * 检查是否在祭坛附近（远古回响效果范围）
   */
  public checkAncientEchoesRange(distanceToAltar: number): boolean {
    return distanceToAltar <= 20;
  }

  /**
   * 重置状态
   */
  public override reset(): void {
    super.reset();
    this.isNearAltar = false;
    this.altarBlessingCount = 0;
  }
}

// 导出单例
export const lilianNoble = new LilianNoble();
