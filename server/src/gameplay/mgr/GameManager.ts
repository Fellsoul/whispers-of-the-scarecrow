import { Singleton } from '../../core/patterns/Singleton';
import { StorageManager } from './StorageManager';
import { PlayerManager } from './PlayerManager';
import { MatchPoolManager } from './MatchPoolManager';
import { ObjectManager } from './ObjectManager';

export class GameManager extends Singleton<GameManager>() {
  private _updateInterval: number = -1;
  private _lastUpdateTime: number = 0;
  private _tick: number = 60;

  constructor() {
    super();
  }

  public onLoad(): void {}

  public start(mapId: string = ''): void {
    console.log('(Server) App starting...');

    // 按照依赖顺序初始化管理器
    this.initializeManagers();

    this.startUpdateInterval();
    console.log('(Server) App started successfully');
  }

  private initializeManagers(): void {
    // 初始化管理器 - 按依赖顺序 / Initialize managers in dependency order
    StorageManager.instance.initialize();
    ObjectManager.instance.start();
    PlayerManager.instance.initialize();
  }

  public startUpdateInterval(): void {
    this._lastUpdateTime = Date.now();
    this._updateInterval = setInterval(() => {
      const now = Date.now();
      const delta = now - this._lastUpdateTime;
      this._lastUpdateTime = now;
      this.update(delta);
    }, this._tick);

    console.log(`(Server) App update interval ${this._tick}ms`);
  }

  public update(delta: number): void {
    // 按照更新优先级顺序更新管理器
    // Update managers in priority order

    // 更新玩家管理器 - 追踪在线时长
    // Update player manager - track online duration
    PlayerManager.instance.update(delta);
  }

  public destroy(): void {
    console.log('(Server) App destroying...');

    // 清理更新循环
    if (this._updateInterval !== -1) {
      clearInterval(this._updateInterval);
      this._updateInterval = -1;
    }

    console.log('(Server) App destroyed');
  }
}
