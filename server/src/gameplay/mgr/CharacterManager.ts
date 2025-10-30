import { Singleton } from '../../core/patterns/Singleton';
import { EventBus } from '../../core/events/EventBus';
import type { Character } from '@shares/character/Character';
import { CharacterRegistry } from '@shares/character/CharacterRegistry';
import type { BaseRole } from '@shares/gameplay/BaseRole';
import type { Faction } from '@shares/core/Enum';
import type { SurvivorRoleBase } from '../role/SurvivorRoleBase';
import {
  CharacterMap,
  getCharacterById,
  emilyGreenwood,
  thomasHawthorne,
  lilianNoble,
  sebastianMoore,
} from '../role';

/**
 * 玩家角色运行时状态
 * Runtime character state for a player
 */
interface PlayerCharacterState {
  /** 玩家ID */
  userId: string;
  /** 玩家实体 */
  entity: GamePlayerEntity;
  /** 角色静态数据（UI展示用） */
  character: Character;
  /** 游戏玩法角色（游戏机制） */
  role: BaseRole | null;
  /** 当前生命值 */
  currentHP: number;
  /** 最大生命值 */
  maxHP: number;
  /** 当前状态效果 */
  statusEffects: StatusEffect[];
  /** 是否存活 */
  isAlive: boolean;
  /** 最后更新时间 */
  lastUpdateTime: number;
}

/**
 * 状态效果
 * Status effect applied to a character
 */
interface StatusEffect {
  /** 效果ID */
  id: string;
  /** 效果类型 */
  type: 'buff' | 'debuff' | 'dot' | 'hot';
  /** 效果名称 */
  name: string;
  /** 持续时间（毫秒，-1为永久） */
  duration: number;
  /** 剩余时间 */
  remainingTime: number;
  /** 效果强度 */
  intensity: number;
  /** 效果数据 */
  data?: unknown;
}

/**
 * 角色事件类型
 */
export enum CharacterEventType {
  HP_CHANGED = 'character:hp:changed',
  HP_CRITICAL = 'character:hp:critical',
  DIED = 'character:died',
  REVIVED = 'character:revived',
  STATUS_ADDED = 'character:status:added',
  STATUS_REMOVED = 'character:status:removed',
  STATS_UPDATED = 'character:stats:updated',
}

/**
 * CharacterManager - 角色管理器
 * 负责管理所有玩家的角色运行时状态
 */
export class CharacterManager extends Singleton<CharacterManager>() {
  /** 玩家角色状态映射表 (userId -> PlayerCharacterState) */
  private characterStates: Map<string, PlayerCharacterState> = new Map();

  /** 事件总线 */
  private eventBus: EventBus = EventBus.instance;

  /** HP临界值（低于此值触发critical事件） */
  private readonly HP_CRITICAL_THRESHOLD = 0.3; // 30%

  constructor() {
    super();
  }

  /**
   * 初始化角色管理器
   */
  public initialize(): void {
    console.log('[CharacterManager] Initialized');
    console.log(
      '[CharacterManager] Available role classes:',
      Object.keys(CharacterMap)
    );
  }

  /**
   * 根据角色ID获取角色类实例
   * @param characterId 角色ID（如 'char_survivor_01'）
   * @returns 角色类实例
   */
  public getRoleInstance(characterId: string): SurvivorRoleBase | null {
    const roleInstance = getCharacterById(characterId) as
      | SurvivorRoleBase
      | undefined;
    if (!roleInstance) {
      console.warn(
        `[CharacterManager] Role instance not found for: ${characterId}`
      );
      return null;
    }

    console.log(
      `[CharacterManager] Got role instance: ${roleInstance.displayName} (${roleInstance.codename})`
    );
    return roleInstance;
  }

  /**
   * 获取所有可用的角色类
   */
  public getAllRoleInstances(): { [key: string]: SurvivorRoleBase } {
    return {
      char_survivor_01: emilyGreenwood,
      char_survivor_02: thomasHawthorne,
      char_survivor_03: lilianNoble,
      char_survivor_04: sebastianMoore,
    };
  }

  /**
   * 为玩家绑定角色
   * @param userId 玩家ID
   * @param entity 玩家实体
   * @param characterId 角色ID
   * @param role 游戏玩法角色（可选）
   */
  public bindCharacter(
    userId: string,
    entity: GamePlayerEntity,
    characterId: string,
    role?: BaseRole
  ): boolean {
    // 获取角色静态数据
    const character = CharacterRegistry.getById(characterId);
    if (!character) {
      console.error(`[CharacterManager] Character not found: ${characterId}`);
      return false;
    }

    // 计算最大生命值
    const maxHP = role?.baseStats?.maxHP || 100;

    // 创建角色状态
    const state: PlayerCharacterState = {
      userId,
      entity,
      character,
      role: role || null,
      currentHP: maxHP,
      maxHP,
      statusEffects: [],
      isAlive: true,
      lastUpdateTime: Date.now(),
    };

    this.characterStates.set(userId, state);

    console.log(
      `[CharacterManager] Bound character ${character.name} to player ${userId}, HP: ${maxHP}`
    );

    // 触发事件
    this.eventBus.emit(CharacterEventType.STATS_UPDATED, {
      userId,
      characterId,
      maxHP,
    });

    return true;
  }

  /**
   * 更新玩家的角色ID（用于Readiness场景切换角色）
   * @param userId 玩家ID
   * @param newCharacterId 新的角色ID
   */
  public updateCharacterId(userId: string, newCharacterId: string): boolean {
    const state = this.characterStates.get(userId);
    if (!state) {
      console.warn(
        `[CharacterManager] Cannot update character - player ${userId} not found`
      );
      return false;
    }

    // 获取新角色静态数据
    const newCharacter = CharacterRegistry.getById(newCharacterId);
    if (!newCharacter) {
      console.error(
        `[CharacterManager] Character not found: ${newCharacterId}`
      );
      return false;
    }

    // 更新角色数据（保留HP、状态等运行时数据）
    state.character = newCharacter;
    state.lastUpdateTime = Date.now();

    console.log(
      `[CharacterManager] Updated character for player ${userId} to ${newCharacter.name}`
    );

    // 触发事件
    this.eventBus.emit(CharacterEventType.STATS_UPDATED, {
      userId,
      characterId: newCharacterId,
    });

    return true;
  }

  /**
   * 解除玩家角色绑定
   * @param userId 玩家ID
   */
  public unbindCharacter(userId: string): void {
    this.characterStates.delete(userId);
    console.log(`[CharacterManager] Unbound character from player ${userId}`);
  }

  /**
   * 获取玩家角色状态
   * @param userId 玩家ID
   */
  public getCharacterState(userId: string): PlayerCharacterState | null {
    return this.characterStates.get(userId) || null;
  }

  /**
   * 修改玩家生命值
   * @param userId 玩家ID
   * @param delta 变化量（正数为治疗，负数为伤害）
   * @param source 来源描述
   */
  public modifyHP(userId: string, delta: number, source?: string): void {
    const state = this.characterStates.get(userId);
    if (!state || !state.isAlive) {
      return;
    }

    const oldHP = state.currentHP;
    state.currentHP = Math.max(
      0,
      Math.min(state.maxHP, state.currentHP + delta)
    );
    state.lastUpdateTime = Date.now();

    const hpPercent = state.currentHP / state.maxHP;

    console.log(
      `[CharacterManager] Player ${userId} HP: ${oldHP} -> ${state.currentHP} (${(hpPercent * 100).toFixed(1)}%) ${source ? `[${source}]` : ''}`
    );

    // 触发HP变化事件
    this.eventBus.emit(CharacterEventType.HP_CHANGED, {
      userId,
      oldHP,
      newHP: state.currentHP,
      delta,
      hpPercent,
      source,
    });

    // 检查临界状态
    if (hpPercent <= this.HP_CRITICAL_THRESHOLD && hpPercent > 0) {
      this.eventBus.emit(CharacterEventType.HP_CRITICAL, {
        userId,
        currentHP: state.currentHP,
        hpPercent,
      });
    }

    // 检查死亡
    if (state.currentHP <= 0 && state.isAlive) {
      this.handleDeath(userId, source);
    }
  }

  /**
   * 设置最大生命值
   * @param userId 玩家ID
   * @param maxHP 新的最大生命值
   * @param healToFull 是否恢复满血
   */
  public setMaxHP(
    userId: string,
    maxHP: number,
    healToFull: boolean = false
  ): void {
    const state = this.characterStates.get(userId);
    if (!state) {
      return;
    }

    state.maxHP = maxHP;
    if (healToFull) {
      state.currentHP = maxHP;
    } else {
      state.currentHP = Math.min(state.currentHP, maxHP);
    }
    state.lastUpdateTime = Date.now();

    console.log(`[CharacterManager] Player ${userId} maxHP set to ${maxHP}`);

    this.eventBus.emit(CharacterEventType.STATS_UPDATED, {
      userId,
      maxHP,
      currentHP: state.currentHP,
    });
  }

  /**
   * 添加状态效果
   * @param userId 玩家ID
   * @param effect 状态效果
   */
  public addStatusEffect(userId: string, effect: StatusEffect): void {
    const state = this.characterStates.get(userId);
    if (!state) {
      return;
    }

    // 检查是否已存在相同ID的效果
    const existingIndex = state.statusEffects.findIndex(
      (e) => e.id === effect.id
    );
    if (existingIndex >= 0) {
      // 刷新持续时间
      state.statusEffects[existingIndex].remainingTime = effect.duration;
      console.log(
        `[CharacterManager] Refreshed status effect ${effect.name} for player ${userId}`
      );
    } else {
      state.statusEffects.push({ ...effect, remainingTime: effect.duration });
      console.log(
        `[CharacterManager] Added status effect ${effect.name} to player ${userId}`
      );
    }

    state.lastUpdateTime = Date.now();

    this.eventBus.emit(CharacterEventType.STATUS_ADDED, {
      userId,
      effect,
    });
  }

  /**
   * 移除状态效果
   * @param userId 玩家ID
   * @param effectId 效果ID
   */
  public removeStatusEffect(userId: string, effectId: string): void {
    const state = this.characterStates.get(userId);
    if (!state) {
      return;
    }

    const index = state.statusEffects.findIndex((e) => e.id === effectId);
    if (index >= 0) {
      const removed = state.statusEffects.splice(index, 1)[0];
      console.log(
        `[CharacterManager] Removed status effect ${removed.name} from player ${userId}`
      );

      this.eventBus.emit(CharacterEventType.STATUS_REMOVED, {
        userId,
        effectId,
        effectName: removed.name,
      });
    }
  }

  /**
   * 处理角色死亡
   * @param userId 玩家ID
   * @param source 死亡来源
   */
  private handleDeath(userId: string, source?: string): void {
    const state = this.characterStates.get(userId);
    if (!state) {
      return;
    }

    state.isAlive = false;
    state.currentHP = 0;
    console.log(
      `[CharacterManager] Player ${userId} died ${source ? `[${source}]` : ''}`
    );

    this.eventBus.emit(CharacterEventType.DIED, {
      userId,
      characterId: state.character.id,
      source,
      timestamp: Date.now(),
    });
  }

  /**
   * 复活角色
   * @param userId 玩家ID
   * @param hpPercent 复活后的HP百分比（0-1）
   */
  public revive(userId: string, hpPercent: number = 1.0): void {
    const state = this.characterStates.get(userId);
    if (!state || state.isAlive) {
      return;
    }

    state.isAlive = true;
    state.currentHP = Math.floor(state.maxHP * hpPercent);
    state.statusEffects = []; // 清除所有状态效果

    console.log(
      `[CharacterManager] Player ${userId} revived with ${state.currentHP}/${state.maxHP} HP`
    );

    this.eventBus.emit(CharacterEventType.REVIVED, {
      userId,
      currentHP: state.currentHP,
      maxHP: state.maxHP,
    });
  }

  /**
   * 更新所有角色状态（每帧调用）
   * @param deltaTime 时间增量（秒）
   */
  public update(deltaTime: number): void {
    const deltaMs = deltaTime * 1000;

    for (const [userId, state] of this.characterStates) {
      if (!state.isAlive) {
        continue;
      }

      // 更新状态效果
      for (let i = state.statusEffects.length - 1; i >= 0; i--) {
        const effect = state.statusEffects[i];

        // 永久效果跳过
        if (effect.duration === -1) {
          continue;
        }

        effect.remainingTime -= deltaMs;

        // 应用持续伤害/治疗
        if (effect.type === 'dot' || effect.type === 'hot') {
          const tickDamage = effect.intensity * (deltaTime / 1); // 每秒伤害
          this.modifyHP(
            userId,
            effect.type === 'dot' ? -tickDamage : tickDamage,
            effect.name
          );
        }

        // 移除过期效果
        if (effect.remainingTime <= 0) {
          this.removeStatusEffect(userId, effect.id);
        }
      }
    }
  }

  /**
   * 获取所有在线角色状态
   */
  public getAllCharacterStates(): PlayerCharacterState[] {
    return Array.from(this.characterStates.values());
  }

  /**
   * 获取指定阵营的所有角色
   * @param faction 阵营
   */
  public getCharactersByFaction(faction: Faction): PlayerCharacterState[] {
    return Array.from(this.characterStates.values()).filter(
      (state) => state.character.faction === faction
    );
  }

  /**
   * 获取所有存活的角色
   */
  public getAliveCharacters(): PlayerCharacterState[] {
    return Array.from(this.characterStates.values()).filter(
      (state) => state.isAlive
    );
  }

  /**
   * 清除所有角色状态
   */
  public clear(): void {
    this.characterStates.clear();
    console.log('[CharacterManager] Cleared all character states');
  }
}
