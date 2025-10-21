/**
 * 条件检查器
 * Condition Checker - 检查页面元素的显示条件
 */

import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import { EventBus } from '../../core/events/EventBus';
import type { Condition, ConditionalConfig } from './types';
import type { IPlayerData } from '@shares/player/IPlayerData';

/**
 * 条件检查器类
 * 负责：
 * 1. 从服务器获取玩家数据
 * 2. 检查元素是否满足显示条件
 * 3. 缓存玩家数据以提高性能
 */
export class ConditionChecker {
  private communicationMgr: CommunicationMgr;
  private eventBus: EventBus;
  private playerDataCache: IPlayerData | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 30000; // 缓存30秒

  constructor() {
    this.communicationMgr = CommunicationMgr.instance;
    this.eventBus = EventBus.instance;
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   * 监听服务器返回的玩家数据更新
   */
  private setupEventListeners(): void {
    // 监听服务器返回的玩家数据
    this.eventBus.on(
      'player:data:response',
      (data: IPlayerData | undefined) => {
        if (!data) {
          console.warn('[ConditionChecker] Received empty player data');
          return;
        }
        console.log('[ConditionChecker] Received player data:', data);
        this.playerDataCache = data;
        this.cacheTimestamp = Date.now();
      }
    );
  }

  /**
   * 获取玩家数据
   * 如果缓存有效则使用缓存，否则从服务器请求
   */
  async getPlayerData(): Promise<IPlayerData> {
    // 检查缓存是否有效
    const now = Date.now();
    if (
      this.playerDataCache &&
      now - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      console.log('[ConditionChecker] Using cached player data');
      return this.playerDataCache;
    }

    // 请求新数据
    console.log('[ConditionChecker] Requesting player data from server');
    this.communicationMgr.send('player:data:request', {});

    // 等待服务器响应（最多等待5秒）
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('[ConditionChecker] Player data request timeout');
        reject(new Error('Player data request timeout'));
      }, 5000);

      const handleResponse = (data: IPlayerData | undefined) => {
        if (!data) {
          clearTimeout(timeout);
          this.eventBus.off('player:data:response', handleResponse);
          reject(new Error('Received empty player data'));
          return;
        }
        clearTimeout(timeout);
        this.eventBus.off('player:data:response', handleResponse);
        resolve(data);
      };

      this.eventBus.on('player:data:response', handleResponse);
    });
  }

  /**
   * 检查单个条件是否满足
   */
  private checkCondition(
    condition: Condition,
    playerData: IPlayerData
  ): boolean {
    switch (condition.type) {
      case 'character_familiarity':
        if (!condition.characterId) {
          console.warn(
            '[ConditionChecker] Character ID not specified for familiarity check'
          );
          return false;
        }
        const familiarity =
          playerData.characterFamiliarity?.[condition.characterId] || 0;
        if (
          condition.minValue !== undefined &&
          familiarity < condition.minValue
        ) {
          return false;
        }
        if (
          condition.maxValue !== undefined &&
          familiarity > condition.maxValue
        ) {
          return false;
        }
        return true;

      case 'match_count':
        const matchCount = playerData.matchCount || 0;
        if (
          condition.minValue !== undefined &&
          matchCount < condition.minValue
        ) {
          return false;
        }
        if (
          condition.maxValue !== undefined &&
          matchCount > condition.maxValue
        ) {
          return false;
        }
        return true;

      case 'achievement':
        if (!condition.achievementId) {
          console.warn('[ConditionChecker] Achievement ID not specified');
          return false;
        }
        return (
          playerData.achievements?.includes(condition.achievementId) || false
        );

      case 'custom':
        if (!condition.customKey) {
          console.warn('[ConditionChecker] Custom key not specified');
          return false;
        }
        const customValue = playerData.customData?.[condition.customKey];
        // 对于自定义条件，简单地检查是否存在且为真值
        return !!customValue;

      default:
        console.warn(
          `[ConditionChecker] Unknown condition type: ${condition.type}`
        );
        return false;
    }
  }

  /**
   * 检查条件配置是否满足
   * 支持 AND/OR 逻辑运算符
   */
  async checkConditions(config: ConditionalConfig): Promise<boolean> {
    try {
      const playerData = await this.getPlayerData();

      if (config.operator === 'AND') {
        // 所有条件都必须满足
        return config.conditions.every((condition) =>
          this.checkCondition(condition, playerData)
        );
      } else if (config.operator === 'OR') {
        // 至少一个条件满足
        return config.conditions.some((condition) =>
          this.checkCondition(condition, playerData)
        );
      }

      return false;
    } catch (error) {
      console.error('[ConditionChecker] Error checking conditions:', error);
      // 出错时默认不显示
      return false;
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.playerDataCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * 销毁检查器，清理资源
   */
  dispose(): void {
    this.clearCache();
    // 移除事件监听器
    this.eventBus.off('player:data:response');
  }
}
