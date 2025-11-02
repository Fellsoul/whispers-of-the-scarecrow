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
import { ReadinessManager } from './ReadinessManager';
import { IngameManager } from './IngameManager';
import { ItemManager } from './ItemManager';
import { GameScene } from '../const/enum';
import i18n from '@root/i18n';

export class GameManager extends Singleton<GameManager>() {
  private _updateInterval: number = -1;
  private _lastUpdateTime: number = 0;
  private _tick: number = 60;

  /** 当前场景模式 */
  private currentSceneMode: 'lobby' | 'readiness' | 'ingame' = 'lobby';

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

    // 检测并设置当前场景模式
    this.detectAndSetSceneMode();

    // 初始化管理器 - 按依赖顺序 / Initialize managers in dependency order
    StorageManager.instance.initialize();
    ObjectManager.instance.start();
    PlayerManager.instance.initialize();
    CharacterManager.instance.initialize();
    IngameProfileManager.instance.initialize();

    // 初始化 IngameManager（总是初始化，以便随时准备接收事件）
    IngameManager.instance.initialize();
    console.log('[GameManager] IngameManager initialized');

    // 如果是 Readiness 场景，初始化 ItemManager 和 ReadinessManager
    if (this.currentSceneMode === 'readiness') {
      ItemManager.instance.initialize();
      console.log('[GameManager] ItemManager initialized for Readiness scene');

      ReadinessManager.instance.initialize();
      console.log(
        '[GameManager] ReadinessManager initialized for Readiness scene'
      );
    }

    // 设置游戏开始事件监听
    this.setupGameStartListener();

    // 设置场景查询事件监听
    this.setupSceneQueryListener();

    // 设置语言切换事件监听
    this.setupLanguageChangeListener();

    // 广播当前场景模式给所有客户端
    this.broadcastSceneMode();
  }

  /**
   * 设置游戏开始事件监听器
   * 监听ReadinessManager发出的game:start事件
   */
  private setupGameStartListener(): void {
    EventBus.instance.on<{
      totalPlayers: number;
      readyPlayers: number;
      playerStates: Array<{
        userId: string;
        isReady: boolean;
        characterId: string;
      }>;
    }>('game:start', (data) => {
      console.log(
        '[GameManager] Received game:start event from ReadinessManager'
      );
      console.log(
        `[GameManager] Total players: ${data?.totalPlayers}, Ready: ${data?.readyPlayers}`
      );

      // 切换场景模式为ingame
      this.switchToIngameMode();

      // 开始游戏初始化流程
      this.initializeIngameSession(data);
    });

    console.log('[GameManager] Game start listener setup complete');
  }

  /**
   * 切换到游戏模式
   */
  private switchToIngameMode(): void {
    console.log('[GameManager] Switching scene mode from readiness to ingame');

    this.currentSceneMode = 'ingame';

    // 广播场景模式变化给所有客户端
    CommunicationMgr.instance.sendBroad('server:scenemode:changed', {
      sceneMode: this.currentSceneMode,
    });

    console.log('[GameManager] Scene mode switched to ingame and broadcasted');
  }

  /**
   * 初始化游戏会话
   * 通过事件系统委托给 IngameManager 执行
   */
  private initializeIngameSession(
    data:
      | {
          totalPlayers: number;
          readyPlayers: number;
          playerStates: Array<{
            userId: string;
            isReady: boolean;
            characterId: string;
          }>;
        }
      | undefined
  ): void {
    console.log(
      '[GameManager] Delegating ingame initialization to IngameManager...'
    );

    if (!data) {
      console.error('[GameManager] No player data provided for ingame session');
      return;
    }

    // 等待黑幕渐入完成（fadeInDuration）后立即传送玩家
    const { fadeInDuration } = Settings.transitionConfig;
    console.log(
      `[GameManager] Waiting ${fadeInDuration}ms for client fade-in, then spawning players`
    );

    setTimeout(() => {
      // 发送事件给 IngameManager，让它负责具体执行
      EventBus.instance.emit('ingame:initialize', {
        totalPlayers: data.totalPlayers,
        playerStates: data.playerStates,
      });

      console.log(
        '[GameManager] Ingame initialization event sent to IngameManager (after fade-in)'
      );
    }, fadeInDuration);
  }

  /**
   * 设置场景查询事件监听器
   * 当客户端查询当前场景时，通过world.projectName检测并返回当前场景
   */
  private setupSceneQueryListener(): void {
    EventBus.instance.on<{ playerId: string }>('client:scene:query', (data) => {
      console.log('[Server] Received scene query from client:', data?.playerId);

      // 获取当前场景（通过world.projectName检测）
      const currentSceneType = Settings.getCurrentSceneType();
      const currentSceneName = Settings.getCurrentScene();
      console.log(
        `[Server] Current scene detected: ${currentSceneName} (type: ${currentSceneType})`
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
              currentScene: currentSceneName,
              currentSceneType: currentSceneType,
            }
          );
          console.log(
            `[Server] Sent scene response to player ${data.playerId}: ${currentSceneName} (type: ${currentSceneType})`
          );
        }
      } else {
        // 如果没有playerId，广播给所有客户端
        CommunicationMgr.instance.sendBroad('server:scene:response', {
          currentScene: currentSceneName,
          currentSceneType: currentSceneType,
        });
        console.log(
          `[Server] Broadcast scene response: ${currentSceneName} (type: ${currentSceneType})`
        );
      }
    });

    console.log('[GameManager] Scene query listener setup complete');
  }

  /**
   * 设置语言切换事件监听器
   * 监听客户端的语言切换请求并同步服务端的i18n语言
   */
  private setupLanguageChangeListener(): void {
    EventBus.instance.on<{ language: string; _senderEntity?: GameEntity }>(
      'client:language:change',
      async (data) => {
        const language = data?.language;
        const userId = data?._senderEntity?.player?.userId;

        if (!language) {
          console.warn('[GameManager] Language change event without language');
          return;
        }

        console.log(`[GameManager] Received language change request: ${language} from user ${userId || 'unknown'}`);

        try {
          // 切换服务端的i18n语言
          await i18n.changeLanguage(language);
          console.log(`[GameManager] Server i18n language changed to: ${language}`);

          // 广播语言已切换（可选，用于同步其他需要知道语言的系统）
          EventBus.instance.emit('server:language:changed', {
            language,
            userId,
          });
        } catch (error) {
          console.error('[GameManager] Failed to change server language:', error);
        }
      }
    );

    console.log('[GameManager] Language change listener setup complete');
  }

  /**
   * 检测并设置当前场景模式
   */
  private detectAndSetSceneMode(): void {
    const currentSceneType = Settings.getCurrentSceneType();

    if (currentSceneType === GameScene.Lobby) {
      this.currentSceneMode = 'lobby';
    } else if (currentSceneType === GameScene.Readiness) {
      this.currentSceneMode = 'readiness';
    } else {
      this.currentSceneMode = 'ingame';
    }

    console.log(
      `[GameManager] Scene mode detected: ${this.currentSceneMode} (scene type: ${currentSceneType})`
    );
  }

  /**
   * 广播当前场景模式给所有客户端
   */
  private broadcastSceneMode(): void {
    CommunicationMgr.instance.sendBroad('server:scenemode:changed', {
      sceneMode: this.currentSceneMode,
    });

    console.log(
      `[GameManager] Broadcast scene mode to all clients: ${this.currentSceneMode}`
    );
  }

  /**
   * 获取当前场景模式
   */
  public getCurrentSceneMode(): 'lobby' | 'readiness' | 'ingame' {
    return this.currentSceneMode;
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
