import type { EntityNode } from '@dao3fun/component';
import { Singleton } from '../../core/patterns/Singleton';
import { MatchPoolEntrePedal } from '../component/matchPool/MatchPoolEntrePedal';
import { MatchPool } from '../component/matchPool/MatchPool';
import { GameMode } from '../const/enum';
import { Logger } from '../../core/utils/Logger';

/**
 * 活跃游戏信息
 */
interface ActiveMatchInfo {
  sceneUrl: URL;
  serverId: string;
}

export class MatchPoolManager extends Singleton<MatchPoolManager>() {
  public matchPoolEntrePedals: EntityNode[] = [];

  public matchPoolBases: EntityNode[] = [];

  private isInit: boolean = false;

  // 玩家ID -> 匹配池组件的映射
  private playerToPoolMap: Map<string, MatchPool> = new Map();

  // 活跃游戏表：matchId -> {sceneUrl, serverId}
  private activeMatches: Map<string, ActiveMatchInfo> = new Map();

  constructor() {
    super();
  }

  public initMatchPool(): void {
    /**
     * 初始化匹配池
     * 1. 匹配底座添加匹配池组件
     * 2. 匹配踏板绑定踏板组件
     * 3. 将匹配底座和踏板位置设置到组件中1adfae
     */

    // 初始化匹配池底座
    this.matchPoolBases.forEach((base, index) => {
      if (!base.getComponent(MatchPool)) {
        base.addComponent(MatchPool);
      }
      const matchPoolComponent = base.getComponent(MatchPool);

      if (matchPoolComponent) {
        // 根据实体名称判断匹配池类型
        const entityName = base.entity.id || '';

        if (entityName.includes('Small')) {
          matchPoolComponent.matchPoolType = GameMode.Small;
        } else if (entityName.includes('Large')) {
          matchPoolComponent.matchPoolType = GameMode.Large;
        } else {
          // 默认为Small
          matchPoolComponent.matchPoolType = GameMode.Small;
          Logger.warn(
            `[MatchPoolManager] 实体 ${base.entity.id} 未包含Small或Large，默认设置为Small`
          );
        }

        Logger.log(
          `[MatchPoolManager] 匹配池 ${base.entity.id} 设置为类型: ${matchPoolComponent.matchPoolType}`
        );

        // 如果有对应的踏板，设置踏板位置
        if (this.matchPoolEntrePedals[index]) {
          const pedalEntity = this.matchPoolEntrePedals[index].entity;
          matchPoolComponent.matchPoolEntrePedalPosition = pedalEntity.position;
          Logger.log(
            `[MatchPoolManager] 匹配池 ${base.entity.id} 的踏板位置已设置`
          );
        }
      }
    });

    // 初始化匹配踏板
    this.matchPoolEntrePedals.forEach((entrePedal, index) => {
      if (!entrePedal.getComponent(MatchPoolEntrePedal)) {
        entrePedal.addComponent(MatchPoolEntrePedal);
      }
      const matchPoolEntrePedal = entrePedal.getComponent(MatchPoolEntrePedal);

      // 设置对应的匹配池底座
      if (matchPoolEntrePedal && this.matchPoolBases[index]) {
        matchPoolEntrePedal.matchPoolBase = this.matchPoolBases[index];
        Logger.log(
          `[MatchPoolManager] 踏板 ${entrePedal.entity.id} 绑定到匹配池 ${this.matchPoolBases[index].entity.id}`
        );
      }
    });

    this.isInit = true;
    Logger.log(
      `[MatchPoolManager] 匹配池初始化完成：${this.matchPoolBases.length} 个匹配池，${this.matchPoolEntrePedals.length} 个踏板`
    );
  }

  /**
   * 记录玩家加入匹配池
   * @param userId 玩家ID
   * @param matchPool 匹配池组件
   */
  public registerPlayerInPool(userId: string, matchPool: MatchPool): void {
    this.playerToPoolMap.set(userId, matchPool);
    Logger.log(`[MatchPoolManager] 玩家 ${userId} 注册到匹配池`);
  }

  /**
   * 移除玩家的匹配池记录
   * @param userId 玩家ID
   */
  public unregisterPlayerFromPool(userId: string): void {
    this.playerToPoolMap.delete(userId);
    Logger.log(`[MatchPoolManager] 玩家 ${userId} 从匹配池记录中移除`);
  }

  /**
   * 检查玩家是否在匹配池中
   * @param userId 玩家ID
   */
  public isPlayerInPool(userId: string): boolean {
    return this.playerToPoolMap.has(userId);
  }

  /**
   * 获取玩家所在的匹配池
   * @param userId 玩家ID
   */
  public getPlayerPool(userId: string): MatchPool | null {
    return this.playerToPoolMap.get(userId) || null;
  }

  /**
   * 玩家离开游戏时的处理
   * 如果玩家在匹配池中，从匹配池移除
   * @param userId 玩家ID
   */
  public handlePlayerLeave(userId: string): void {
    const matchPool = this.playerToPoolMap.get(userId);
    if (matchPool) {
      Logger.log(`[MatchPoolManager] 玩家 ${userId} 离开游戏，从匹配池中移除`);
      matchPool.removePlayer(userId);
      this.playerToPoolMap.delete(userId);
    }
  }

  /**
   * 注册活跃游戏
   * @param matchId 游戏matchId
   * @param info 游戏信息（场景URL和服务器ID）
   */
  public registerActiveMatch(matchId: string, info: ActiveMatchInfo): void {
    this.activeMatches.set(matchId, info);
    Logger.log(
      `[MatchPoolManager] 注册活跃游戏: ${matchId} -> serverId: ${info.serverId}`
    );
  }

  /**
   * 注销活跃游戏
   * @param matchId 游戏matchId
   */
  public unregisterActiveMatch(matchId: string): void {
    if (this.activeMatches.delete(matchId)) {
      Logger.log(`[MatchPoolManager] 注销活跃游戏: ${matchId}`);
    }
  }

  /**
   * 获取活跃游戏信息
   * @param matchId 游戏matchId
   */
  public getActiveMatch(matchId: string): ActiveMatchInfo | null {
    return this.activeMatches.get(matchId) || null;
  }

  /**
   * 获取所有活跃游戏
   */
  public getAllActiveMatches(): Map<string, ActiveMatchInfo> {
    return new Map(this.activeMatches);
  }
}
