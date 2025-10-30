import type { SurvivorRole as ISurvivorRole } from '@shares/gameplay/Survivor';
import type { BaseRole } from '@shares/gameplay/BaseRole';
import type { Ability, Perk } from '@shares/core/ExtraProperties';
import { Faction } from '@shares/core/Enum';
import type { StatBlock } from '@shares/core/General';
import { Logger } from '../../core/utils/Logger';

/**
 * 幸存者角色抽象基类
 * 包含所有幸存者共有的游戏逻辑实现
 */
export abstract class SurvivorRoleBase implements ISurvivorRole, BaseRole {
  // 基础属性（子类需要实现）
  abstract entity: string;
  abstract codename: string;
  abstract displayName: string;
  abstract title?: string;
  abstract blurb?: string;

  // 阵营固定为幸存者
  faction = Faction.Survivor as Faction.Survivor;

  // 子类需要定义的属性
  abstract baseStats: StatBlock;
  abstract signature: { baseNoise: number; baseLight: number };
  abstract loadout: { actives: Ability[]; passives: Perk[] };
  abstract survivorParams: ISurvivorRole['survivorParams'];

  // 可选的钩子和经济系统
  objectiveHooks?: ISurvivorRole['objectiveHooks'];
  economy?: BaseRole['economy'];

  // 运行时状态
  protected currentHP: number = 100;
  protected maxHP: number = 100;
  protected isInjured: boolean = false;
  protected isDowned: boolean = false;
  protected isCarryingLantern: boolean = false;
  protected activeDebuffs: Set<string> = new Set();
  protected activeBuffs: Set<string> = new Set();

  /**
   * 初始化角色（子类在构造函数中调用）
   */
  protected initializeRole(): void {
    this.maxHP = this.baseStats.maxHP || 100;
    this.currentHP = this.maxHP;
  }

  /* =========================
   * 生命与受伤系统
   * ========================= */

  /**
   * 受到伤害
   * @param damage 伤害数值
   * @param damageType 伤害类型
   * @returns 实际受到的伤害
   */
  public takeDamage(damage: number, damageType?: string): number {
    if (this.isDowned) {
      Logger.log(`[${this.codename}] Already downed, cannot take more damage`);
      return 0;
    }

    // 应用伤害减免
    let finalDamage = damage;
    if (this.baseStats.dmgResist && damageType) {
      const resist =
        (this.baseStats.dmgResist as Record<string, number>)[damageType] || 0;
      finalDamage = damage * (1 - resist);
    }

    // 子类可以重写此方法添加特殊逻辑（如闪躲）
    finalDamage = this.onBeforeTakeDamage(finalDamage, damageType);

    this.currentHP = Math.max(0, this.currentHP - finalDamage);

    Logger.log(
      `[${this.codename}] Took ${finalDamage} damage (${this.currentHP}/${this.maxHP})`
    );

    // 检查是否倒地
    if (this.currentHP <= 0) {
      this.onDown();
    } else if (this.currentHP < this.maxHP * 0.5) {
      this.isInjured = true;
      this.onInjured();
    }

    return finalDamage;
  }

  /**
   * 受伤前钩子（子类可重写，如闪躲、格挡）
   */
  protected onBeforeTakeDamage(damage: number, damageType?: string): number {
    return damage;
  }

  /**
   * 受伤回调
   */
  protected onInjured(): void {
    Logger.log(`[${this.codename}] Is now injured`);
    // 受伤状态效果：可能影响移动速度等
  }

  /**
   * 倒地回调
   */
  protected onDown(): void {
    this.isDowned = true;
    Logger.log(`[${this.codename}] Has been downed!`);
    // 触发倒地逻辑
  }

  /**
   * 治疗/回血
   * @param amount 治疗量
   * @returns 实际恢复的生命值
   */
  public heal(amount: number): number {
    if (this.isDowned) {
      Logger.log(`[${this.codename}] Cannot heal while downed`);
      return 0;
    }

    const oldHP = this.currentHP;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    const actualHealed = this.currentHP - oldHP;

    Logger.log(
      `[${this.codename}] Healed ${actualHealed} HP (${this.currentHP}/${this.maxHP})`
    );

    // 检查是否脱离受伤状态
    if (this.isInjured && this.currentHP >= this.maxHP * 0.5) {
      this.isInjured = false;
      this.onRecovered();
    }

    return actualHealed;
  }

  /**
   * 恢复健康回调
   */
  protected onRecovered(): void {
    Logger.log(`[${this.codename}] Recovered from injured state`);
  }

  /* =========================
   * 搜索系统（干草垛、箱子等）
   * ========================= */

  /**
   * 开始搜索
   * @param targetNode 搜索目标节点
   * @returns 搜索所需时间（秒）
   */
  public startSearch(targetNode: string): number {
    Logger.log(`[${this.codename}] Starting search on ${targetNode}`);

    // 基础时间
    let searchTime = this.survivorParams.search.timeBase;

    // 应用技能加成
    if (this.objectiveHooks?.onSearch?.searchTimeMult) {
      searchTime *= 1 + this.objectiveHooks.onSearch.searchTimeMult;
    }

    return searchTime;
  }

  /**
   * 完成搜索，判断掉落
   * @param itemType 目标物品类型
   * @returns 是否成功获得物品
   */
  public completeSearch(
    itemType: 'PumpkinSeed' | 'Wax' | 'CottonThread'
  ): boolean {
    // 基础掉落率
    let dropRate = this.survivorParams.search.dropRates[itemType] || 0;

    // 应用技能加成
    if (this.objectiveHooks?.onSearch?.searchDropMult) {
      dropRate *= 1 + this.objectiveHooks.onSearch.searchDropMult;
    }

    const success = Math.random() < dropRate;

    Logger.log(
      `[${this.codename}] Search completed: ${success ? 'Found' : 'Failed to find'} ${itemType} (rate: ${dropRate * 100}%)`
    );

    // 检查是否触发惊乌（暴露位置）
    this.checkReveal(this.survivorParams.search.revealChance);

    return success;
  }

  /**
   * 检查是否暴露位置
   */
  protected checkReveal(baseChance: number): void {
    if (Math.random() < baseChance) {
      Logger.log(`[${this.codename}] Position revealed!`);
      this.onRevealed();
    }
  }

  /**
   * 位置暴露回调
   */
  protected onRevealed(): void {
    // 可以触发服务端广播位置给监管者
  }

  /* =========================
   * 催生系统（温室）
   * ========================= */

  /**
   * 开始催生南瓜
   * @param coopPlayerCount 协作玩家数量
   * @returns 催生所需时间（秒）
   */
  public startIncubate(coopPlayerCount: number = 1): number {
    Logger.log(
      `[${this.codename}] Starting incubation with ${coopPlayerCount} players`
    );

    // 基础时间
    let incubateTime = this.survivorParams.incubate.timeBase;

    // 协作加成
    const coopBonus =
      (coopPlayerCount - 1) * this.survivorParams.incubate.coopBonusPerPlayer;
    incubateTime = Math.max(
      this.survivorParams.incubate.minTime,
      incubateTime - coopBonus
    );

    // 应用技能加成
    if (this.objectiveHooks?.onIncubate?.incubateTimeMult) {
      incubateTime *= 1 + this.objectiveHooks.onIncubate.incubateTimeMult;
    }

    Logger.log(`[${this.codename}] Incubation time: ${incubateTime}s`);
    return incubateTime;
  }

  /**
   * QTE检定
   * @returns 是否成功
   */
  public performQTE(): boolean {
    // 基础QTE难度
    let successChance = 0.7; // 70%成功率

    // 应用技能加成
    if (this.objectiveHooks?.onIncubate?.qteBonus) {
      // qteBonus减少触发难度QTE的概率
      const shouldTriggerHardQTE =
        Math.random() > this.objectiveHooks.onIncubate.qteBonus;
      if (!shouldTriggerHardQTE) {
        successChance = 0.9; // 简单QTE
      }
    }

    const success = Math.random() < successChance;
    Logger.log(`[${this.codename}] QTE ${success ? 'SUCCESS' : 'FAILED'}`);

    if (!success) {
      this.onQTEFailed();
    }

    return success;
  }

  /**
   * QTE失败回调
   */
  protected onQTEFailed(): void {
    Logger.log(`[${this.codename}] QTE failed, progress rolled back`);
    // 进度回退逻辑
  }

  /* =========================
   * 雕刻系统
   * ========================= */

  /**
   * 雕刻南瓜
   * @returns 是否成功
   */
  public carvePumpkin(): boolean {
    Logger.log(`[${this.codename}] Carving pumpkin...`);

    // 基础成功率
    let successRate = this.survivorParams.carve.successRateBase;

    // 应用技能加成
    if (this.objectiveHooks?.onCarve?.carveSuccess) {
      successRate += this.objectiveHooks.onCarve.carveSuccess;
    }

    const success = Math.random() < successRate;
    Logger.log(
      `[${this.codename}] Carving ${success ? 'SUCCESS' : 'FAILED'} (rate: ${successRate * 100}%)`
    );

    return success;
  }

  /**
   * 获取雕刻时间
   */
  public getCarveTime(): number {
    let time = this.survivorParams.carve.timePerPumpkin;

    if (this.objectiveHooks?.onCarve?.carveTimeMult) {
      time *= 1 + this.objectiveHooks.onCarve.carveTimeMult;
    }

    return time;
  }

  /* =========================
   * 熬蜡装芯系统
   * ========================= */

  /**
   * 熬蜡装芯
   */
  public waxAndWick(): number {
    Logger.log(`[${this.codename}] Waxing and wicking...`);

    let time = this.survivorParams.waxAndWick.timeBase;

    if (this.objectiveHooks?.onWaxAndWick?.waxTimeMult) {
      time *= 1 + this.objectiveHooks.onWaxAndWick.waxTimeMult;
    }

    return time;
  }

  /* =========================
   * 点火与携带系统
   * ========================= */

  /**
   * 点燃南瓜灯
   */
  public igniteLantern(): number {
    Logger.log(`[${this.codename}] Igniting lantern...`);

    let time = this.survivorParams.igniteAndCarry.igniteTimeBase;

    if (this.objectiveHooks?.onIgnite?.igniteTimeMult) {
      time *= 1 + this.objectiveHooks.onIgnite.igniteTimeMult;
    }

    return time;
  }

  /**
   * 开始携带南瓜灯
   */
  public startCarryLantern(): void {
    this.isCarryingLantern = true;
    Logger.log(`[${this.codename}] Started carrying lantern`);
  }

  /**
   * 停止携带南瓜灯
   */
  public stopCarryLantern(): void {
    this.isCarryingLantern = false;
    Logger.log(`[${this.codename}] Stopped carrying lantern`);
  }

  /**
   * 获取携带时的移动速度倍率
   */
  public getCarrySpeedMultiplier(): number {
    let mult = 1 + this.survivorParams.igniteAndCarry.carryDebuff;

    // 应用技能加成
    if (this.objectiveHooks?.onCarryLantern?.stats?.moveSpeed) {
      mult += this.objectiveHooks.onCarryLantern.stats.moveSpeed;
    }

    return mult;
  }

  /* =========================
   * 祭坛系统
   * ========================= */

  /**
   * 在祭坛充能
   */
  public chargeAltar(): number {
    Logger.log(`[${this.codename}] Charging altar...`);

    // 基础充能值
    let chargeValue = this.survivorParams.altar.perLanternCharge;

    // 应用技能加成
    if (this.objectiveHooks?.onAltar?.altarChargeRate) {
      chargeValue *= 1 + this.objectiveHooks.onAltar.altarChargeRate;
    }

    Logger.log(`[${this.codename}] Altar charge: ${chargeValue}%`);
    return chargeValue;
  }

  /**
   * 获取祭坛充能时间
   */
  public getAltarChargeTime(): number {
    if (
      this.survivorParams.altar.mode === 'Exorcise' &&
      this.survivorParams.altar.exorcise
    ) {
      let time = this.survivorParams.altar.exorcise.channelTime;

      if (this.objectiveHooks?.onAltar?.altarChargeRate) {
        time *= 1 - this.objectiveHooks.onAltar.altarChargeRate;
      }

      return time;
    }
    return 20; // 默认20秒
  }

  /* =========================
   * Buff/Debuff系统
   * ========================= */

  /**
   * 添加Buff
   */
  public addBuff(buffId: string, duration?: number): void {
    this.activeBuffs.add(buffId);
    Logger.log(`[${this.codename}] Buff added: ${buffId}`);

    if (duration) {
      setTimeout(() => this.removeBuff(buffId), duration * 1000);
    }
  }

  /**
   * 移除Buff
   */
  public removeBuff(buffId: string): void {
    this.activeBuffs.delete(buffId);
    Logger.log(`[${this.codename}] Buff removed: ${buffId}`);
  }

  /**
   * 添加Debuff
   */
  public addDebuff(debuffId: string, duration?: number): void {
    this.activeDebuffs.add(debuffId);
    Logger.log(`[${this.codename}] Debuff added: ${debuffId}`);

    if (duration) {
      setTimeout(() => this.removeDebuff(debuffId), duration * 1000);
    }
  }

  /**
   * 移除Debuff
   */
  public removeDebuff(debuffId: string): void {
    this.activeDebuffs.delete(debuffId);
    Logger.log(`[${this.codename}] Debuff removed: ${debuffId}`);
  }

  /**
   * 清除所有Debuff
   */
  public clearAllDebuffs(): void {
    this.activeDebuffs.clear();
    Logger.log(`[${this.codename}] All debuffs cleared`);
  }

  /* =========================
   * 工具方法
   * ========================= */

  /**
   * 获取当前移动速度
   */
  public getMoveSpeed(): number {
    let baseSpeed = 1.0 + (this.baseStats.moveSpeed || 0);

    // 携带南瓜灯减速
    if (this.isCarryingLantern) {
      baseSpeed *= this.getCarrySpeedMultiplier();
    }

    // 受伤减速
    if (this.isInjured) {
      baseSpeed *= 0.9; // 受伤减速10%
    }

    return baseSpeed;
  }

  /**
   * 获取当前视野半径
   */
  public getVisionRadius(): number {
    return this.baseStats.visionRadius || 15;
  }

  /**
   * 重置状态（用于新游戏或重生）
   */
  public reset(): void {
    this.currentHP = this.maxHP;
    this.isInjured = false;
    this.isDowned = false;
    this.isCarryingLantern = false;
    this.activeDebuffs.clear();
    this.activeBuffs.clear();
    Logger.log(`[${this.codename}] State reset`);
  }

  /**
   * 获取当前状态信息
   */
  public getStatus() {
    return {
      codename: this.codename,
      displayName: this.displayName,
      currentHP: this.currentHP,
      maxHP: this.maxHP,
      isInjured: this.isInjured,
      isDowned: this.isDowned,
      isCarryingLantern: this.isCarryingLantern,
      activeBuffs: Array.from(this.activeBuffs),
      activeDebuffs: Array.from(this.activeDebuffs),
    };
  }
}
