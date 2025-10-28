import { Singleton } from '../../core/patterns/Singleton';
import { StorageManager } from './StorageManager';
import { PlayerManager } from './PlayerManager';
import { MatchPoolManager } from './MatchPoolManager';
import { ObjectManager } from './ObjectManager';
import { Settings } from '../../Settings';
import { EventBus } from '../../core/events/EventBus';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import { CharacterRegistry } from '@shares/character/CharacterRegistry';
import { IngameProfileManager } from './IngameProfileManager';
import { CharacterManager } from './CharacterManager';

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
    // 初始化角色注册表 - 优先加载 / Initialize character registry first
    try {
      CharacterRegistry.initialize();
    } catch (error) {
      console.error(
        '[GameManager] Failed to initialize CharacterRegistry:',
        error
      );
    }

    // 初始化管理器 - 按依赖顺序 / Initialize managers in dependency order
    StorageManager.instance.initialize();
    ObjectManager.instance.start();
    PlayerManager.instance.initialize();
    CharacterManager.instance.initialize();
    IngameProfileManager.instance.initialize();

    // 设置场景查询事件监听
    this.setupSceneQueryListener();
  }

  /**
   * 设置场景查询事件监听器
   * 当客户端查询当前场景时，通过world.projectName检测并返回当前场景
   */
  private setupSceneQueryListener(): void {
    EventBus.instance.on<{ playerId: string }>('client:scene:query', (data) => {
      console.log('[Server] Received scene query from client:', data?.playerId);

      // 获取当前场景（通过world.projectName检测）
      const currentScene = Settings.getCurrentScene();
      console.log(
        `[Server] Current scene detected: ${currentScene} (projectName: ${world.projectName})`
      );

      // 如果有playerId，发送给特定玩家，否则广播
      if (data?.playerId) {
        const playerEntity = PlayerManager.instance.getPlayerEntity(
          data.playerId
        );
        if (playerEntity) {
          CommunicationMgr.instance.sendTo(
            playerEntity as GamePlayerEntity,
            'server:scene:response',
            {
              currentScene,
            }
          );
          console.log(
            `[Server] Sent scene response to player ${data.playerId}: ${currentScene}`
          );
        }
      } else {
        // 如果没有playerId，广播给所有客户端
        CommunicationMgr.instance.sendBroad('server:scene:response', {
          currentScene,
        });
        console.log(`[Server] Broadcast scene response: ${currentScene}`);
      }
    });

    console.log('[GameManager] Scene query listener setup complete');
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
