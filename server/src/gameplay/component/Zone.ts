import { _decorator, Component } from '@dao3fun/component';
const { apclass } = _decorator;

@apclass('Zone')
export class Zone extends Component<GameEntity> {
  // 组件属性
  public speed: number = 5;
  private health: number = 100;

  // 生命周期方法
  onLoad(): void {
    console.log('组件加载');
  }

  start(): void {
    console.log('组件开始');
  }

  update(dt: number): void {
    console.log('组件更新');
  }

  onDestroy(): void {
    console.log('组件销毁');
  }
}
