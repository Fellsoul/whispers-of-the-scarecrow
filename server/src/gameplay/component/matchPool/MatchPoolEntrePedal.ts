import type { EntityNode } from '@dao3fun/component';
import { _decorator, Component } from '@dao3fun/component';
import { MatchPool } from './MatchPool';
const { apclass } = _decorator;

@apclass('MatchPoolEntrePedal')
export class MatchPoolEntrePedal extends Component<GameEntity> {
  /*
   * 匹配踏板组件
   * 1. 监听玩家和匹配踏板是否contact
   * 2. 如果contact，检测该编号匹配池人数是否已满
   * 3. 如果未满，将玩家添加到匹配池
   * 4. 如果已满，将玩家添加到等待队列
   */

  public matchPoolBase: EntityNode | null = null;

  // 用于存储已经在踏板上的玩家，避免重复触发
  private playersOnPedal: Set<string> = new Set();

  protected start() {
    // 获取踏板的GameEntity，监听碰撞事件
    const pedalEntity = this.node.entity;
    console.log('pedalEntity', pedalEntity.id);

    // 监听实体碰撞事件
    pedalEntity.onEntityContact((event: GameEntityContactEvent) => {
      this.handleEntityContact(event);
    });

    // 监听实体分离事件
    pedalEntity.onEntitySeparate((event: GameEntityContactEvent) => {
      this.handleEntitySeparate(event);
    });
  }

  /**
   * 处理实体碰撞事件
   */
  private handleEntityContact(event: GameEntityContactEvent): void {
    console.log('playerId');
    const otherEntity = event.other;

    // 检查是否是玩家实体
    if (!this.isPlayerEntity(otherEntity)) {
      return;
    }

    const playerId = otherEntity.player?.userId;

    // 确保playerId存在
    if (!playerId) {
      return;
    }

    // 避免重复触发
    if (this.playersOnPedal.has(playerId)) {
      return;
    }

    // 记录玩家已在踏板上
    this.playersOnPedal.add(playerId);

    // 获取匹配池组件
    const matchPool = this.getMatchPool();
    if (!matchPool) {
      console.warn('MatchPoolEntrePedal: 未找到匹配池组件');
      return;
    }

    // 尝试将玩家添加到匹配池
    this.addPlayerToMatchPool(otherEntity, matchPool);
  }

  /**
   * 处理实体分离事件
   */
  private handleEntitySeparate(event: GameEntityContactEvent): void {
    const otherEntity = event.other;

    if (!this.isPlayerEntity(otherEntity)) {
      return;
    }

    const playerId = otherEntity.player?.userId;

    // 确保playerId存在
    if (!playerId) {
      return;
    }

    // 移除玩家记录
    this.playersOnPedal.delete(playerId);
  }

  /**
   * 判断是否为玩家实体
   */
  private isPlayerEntity(entity: GameEntity): boolean {
    // TODO: 根据实际项目的玩家实体判断逻辑进行调整
    // 例如：检查是否有Player组件，或检查实体标签等
    return entity.player !== null && entity.player !== undefined;
  }

  /**
   * 获取匹配池组件
   */
  private getMatchPool(): MatchPool | null {
    if (!this.matchPoolBase) {
      return null;
    }
    return this.matchPoolBase.getComponent(MatchPool) || null;
  }

  /**
   * 将玩家添加到匹配池
   */
  private addPlayerToMatchPool(
    playerEntity: GameEntity,
    matchPool: MatchPool
  ): void {
    console.log(
      `玩家 ${playerEntity.player?.userId} 踏上匹配踏板，准备加入匹配池`
    );

    // 确保是玩家实体
    if (!playerEntity.player) {
      return;
    }

    // 将玩家实体传递给匹配池
    const success = matchPool.tryAddPlayer(playerEntity as GamePlayerEntity);

    if (success) {
      console.log(`玩家 ${playerEntity.player.userId} 成功加入匹配池`);
    }
  }

  protected update(_deltaTime: number) {
    // 可以在这里添加更新逻辑，例如显示等待UI等
  }
}
