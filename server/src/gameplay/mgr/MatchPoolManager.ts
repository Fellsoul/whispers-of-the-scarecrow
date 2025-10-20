import type { EntityNode } from '@dao3fun/component';
import { Singleton } from '../../core/patterns/Singleton';
import { MatchPoolEntrePedal } from '../component/matchPool/MatchPoolEntrePedal';
import { MatchPool } from '../component/matchPool/MatchPool';

export class MatchPoolManager extends Singleton<MatchPoolManager>() {
  public matchPoolEntrePedals: EntityNode[] = [];

  public matchPoolBases: EntityNode[] = [];

  private isInit: boolean = false;

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

      // 如果有对应的踏板，设置踏板位置
      if (matchPoolComponent && this.matchPoolEntrePedals[index]) {
        const pedalEntity = this.matchPoolEntrePedals[index].entity;
        matchPoolComponent.matchPoolEntrePedalPosition = pedalEntity.position;
        console.log(
          `[MatchPoolManager] 匹配池 ${base.entity.id} 的踏板位置已设置`
        );
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
}
