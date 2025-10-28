import type { EntityNode } from '@dao3fun/component';
import { Singleton } from '../../core/patterns/Singleton';
import { MatchPoolEntrePedal } from '../component/matchPool/MatchPoolEntrePedal';
import { MatchPool } from '../component/matchPool/MatchPool';

export class MatchPoolManager extends Singleton<MatchPoolManager>() {
  public matchPoolEntrePedals: EntityNode[] = [];

  public matchPoolBases: EntityNode[] = [];

  private isInit: boolean = false;

  // 玩家ID -> 匹配池组件的映射
  private playerToPoolMap: Map<string, MatchPool> = new Map();

  constructor() {
    super();
  }

  public initMatchPool(): void {
    /**
     * 初始化匹配池
     * 1. 匹配底座添加匹配池组件
     * 2. 匹配踏板绑定踏板组件
     * 3. 将匹配底座和踏板位置设置到组件中
     */

    // 初始化匹配池底座
    this.matchPoolBases.forEach((base, index) => {
      if (!base.getComponent(MatchPool)) {
        base.addComponent(MatchPool);
      }
      const matchPoolComponent = base.getComponent(MatchPool);

      if (matchPoolComponent) {
        // 设置匹配池编号（用于映射到Readiness地图）
        matchPoolComponent.poolIndex = index;
        console.log(
          `[MatchPoolManager] 匹配池 ${base.entity.id} 设置为编号 ${index}`
        );

        // 如果有对应的踏板，设置踏板位置
        if (this.matchPoolEntrePedals[index]) {
          const pedalEntity = this.matchPoolEntrePedals[index].entity;
          matchPoolComponent.matchPoolEntrePedalPosition = pedalEntity.position;
          console.log(
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
        console.log(
          `[MatchPoolManager] 踏板 ${entrePedal.entity.id} 绑定到匹配池 ${this.matchPoolBases[index].entity.id}`
        );
      }
    });

    this.isInit = true;
    console.log(
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
    console.log(`[MatchPoolManager] 玩家 ${userId} 注册到匹配池`);
  }

  /**
   * 移除玩家的匹配池记录
   * @param userId 玩家ID
   */
  public unregisterPlayerFromPool(userId: string): void {
    this.playerToPoolMap.delete(userId);
    console.log(`[MatchPoolManager] 玩家 ${userId} 从匹配池记录中移除`);
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
      console.log(`[MatchPoolManager] 玩家 ${userId} 离开游戏，从匹配池中移除`);
      matchPool.removePlayer(userId);
      this.playerToPoolMap.delete(userId);
    }
  }
}
