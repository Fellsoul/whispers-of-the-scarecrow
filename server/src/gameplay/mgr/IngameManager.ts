import { Singleton } from '../../core/patterns/Singleton';
import { EventBus } from '../../core/events/EventBus';
import { PlayerManager } from './PlayerManager';
import { CharacterManager } from './CharacterManager';
import { ObjectManager } from './ObjectManager';
import { Settings } from '../../Settings';
import { Logger } from '../../core/utils/Logger';

/**
 * IngameManager - 游戏内管理器
 * 负责管理游戏内的所有逻辑，包括：
 * - 玩家生成和传送
 * - RoleController组件管理
 * - 游戏对象初始化
 * - 游戏循环和状态管理
 */
export class IngameManager extends Singleton<IngameManager>() {
  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 当前游戏会话的玩家状态 */
  private currentGameSession: {
    totalPlayers: number;
    playerStates: Array<{
      userId: string;
      isReady: boolean;
      characterId: string;
    }>;
  } | null = null;

  /** 游戏是否正在运行 */
  private isGameRunning: boolean = false;

  /** 事件总线 */
  private eventBus: EventBus = EventBus.instance;

  constructor() {
    super();
  }

  /**
   * 初始化 IngameManager
   */
  public initialize(): void {
    if (this.initialized) {
      Logger.warn('[IngameManager] Already initialized');
      return;
    }

    Logger.log('[IngameManager] Initializing...');

    // 设置事件监听器
    this.setupEventListeners();

    this.initialized = true;
    Logger.log('[IngameManager] Initialized successfully');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听游戏初始化事件（从 GameManager 发出）
    this.eventBus.on<{
      totalPlayers: number;
      playerStates: Array<{
        userId: string;
        isReady: boolean;
        characterId: string;
      }>;
    }>('ingame:initialize', (data) => {
      Logger.log('[IngameManager] Received ingame:initialize event');
      this.handleGameInitialization(data);
    });

    Logger.log('[IngameManager] Event listeners setup complete');
  }

  /**
   * 处理游戏初始化
   */
  private handleGameInitialization(
    data:
      | {
          totalPlayers: number;
          playerStates: Array<{
            userId: string;
            isReady: boolean;
            characterId: string;
          }>;
        }
      | undefined
  ): void {
    if (!data) {
      Logger.error('[IngameManager] No data provided for game initialization');
      return;
    }

    Logger.log(
      `[IngameManager] Starting game initialization for ${data.totalPlayers} players`
    );

    this.currentGameSession = data;

    // 执行初始化流程
    this.executeInitializationSequence();
  }

  /**
   * 执行初始化序列
   * 注意：此方法在客户端黑幕渐入完成后立即调用，立即传送玩家
   */
  private async executeInitializationSequence(): Promise<void> {
    if (!this.currentGameSession) {
      Logger.error('[IngameManager] No game session data available');
      return;
    }

    Logger.log('[IngameManager] === Game Initialization Sequence Started ===');
    Logger.log(
      '[IngameManager] Client fade-in complete, spawning players immediately'
    );

    try {
      // 步骤 1: 初始化游戏对象（快速）
      this.initializeGameObjects();

      // 步骤 2: 立即生成玩家到场上（不等待）
      this.spawnAllPlayersSync();

      // 步骤 3: 为玩家添加 RoleController 组件
      this.setupPlayerRolesSync();

      // 步骤 4: 启动游戏循环
      this.startGameLoop();

      Logger.log(
        '[IngameManager] === Game Initialization Sequence Complete ==='
      );

      // 触发游戏就绪事件
      this.eventBus.emit('ingame:ready', {
        totalPlayers: this.currentGameSession.totalPlayers,
        timestamp: Date.now(),
      });
    } catch (error) {
      Logger.error('[IngameManager] Game initialization failed:', error);
    }
  }

  /**
   * 步骤 1: 初始化游戏对象（同步，无延迟）
   */
  private initializeGameObjects(): void {
    Logger.log('[IngameManager] Step 1: Initializing game objects...');

    // 调用 ObjectManager 初始化场上实体
    if (typeof ObjectManager.instance.initIngame === 'function') {
      ObjectManager.instance.initIngame();
      Logger.log('[IngameManager] ObjectManager.initIngame() called');
    } else {
      Logger.warn('[IngameManager] ObjectManager.initIngame() not available');
    }

    Logger.log('[IngameManager] Game objects initialized (synchronous)');
  }

  /**
   * 步骤 2: 生成所有玩家到场上（同步，立即执行）
   */
  private spawnAllPlayersSync(): void {
    if (!this.currentGameSession) {
      return;
    }

    Logger.log('[IngameManager] Step 2: Spawning players immediately...');

    const { playerStates } = this.currentGameSession;
    Logger.log(
      `[IngameManager] Spawning ${playerStates.length} players to random spawn points`
    );

    // 从 16 个出生点中随机选择 N 个（N = 玩家数量）
    const selectedPositions = this.selectRandomSpawnPositions(
      playerStates.length
    );

    // 为每个玩家分配出生点并传送（同步执行）
    playerStates.forEach((playerState, index) => {
      this.spawnPlayerSync(playerState, selectedPositions[index]);
    });

    Logger.log(
      '[IngameManager] All players spawned successfully (synchronous)'
    );
  }

  /**
   * 选择随机出生点
   */
  private selectRandomSpawnPositions(
    count: number
  ): Array<{ x: number; y: number; z: number }> {
    const spawnPositions = [...Settings.ingameSpawnPositions];
    const selectedPositions: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i < count && spawnPositions.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * spawnPositions.length);
      selectedPositions.push(spawnPositions[randomIndex]);
      spawnPositions.splice(randomIndex, 1); // 移除已选择的位置
    }

    return selectedPositions;
  }

  /**
   * 生成单个玩家（同步）
   */
  private spawnPlayerSync(
    playerState: { userId: string; isReady: boolean; characterId: string },
    spawnPos: { x: number; y: number; z: number }
  ): void {
    if (!spawnPos) {
      Logger.error(
        `[IngameManager] No spawn position for player ${playerState.userId}`
      );
      return;
    }

    const playerEntity = PlayerManager.instance.getPlayerEntity(
      playerState.userId
    );
    if (!playerEntity) {
      Logger.error(
        `[IngameManager] Player entity not found: ${playerState.userId}`
      );
      return;
    }

    try {
      // 传送玩家到出生点
      playerEntity.position.x = spawnPos.x;
      playerEntity.position.y = spawnPos.y;
      playerEntity.position.z = spawnPos.z;

      // 设置相机模式为跟随模式
      if (playerEntity.player) {
        playerEntity.player.cameraMode = GameCameraMode.FOLLOW;
      }

      // 解锁玩家移动（移除 Readiness 场景的锁定）
      PlayerManager.instance.unlockPlayer(playerState.userId);

      Logger.log(
        `[IngameManager] ✅ Player ${playerState.userId} spawned at [${spawnPos.x}, ${spawnPos.y}, ${spawnPos.z}] and unlocked`
      );

      // 触发玩家生成事件
      this.eventBus.emit('ingame:player:spawned', {
        userId: playerState.userId,
        position: spawnPos,
      });
    } catch (error) {
      Logger.error(
        `[IngameManager] Failed to spawn player ${playerState.userId}:`,
        error
      );
    }
  }

  /**
   * 步骤 3: 为所有玩家设置角色控制器（同步）
   */
  private setupPlayerRolesSync(): void {
    if (!this.currentGameSession) {
      return;
    }

    Logger.log('[IngameManager] Step 3: Setting up player roles...');

    // 同步为所有玩家添加 RoleController
    this.currentGameSession.playerStates.forEach((playerState) => {
      this.addRoleControllerToPlayerSync(
        playerState.userId,
        playerState.characterId
      );
    });

    Logger.log('[IngameManager] All player roles setup complete (synchronous)');
  }

  /**
   * 为玩家发送角色初始化事件
   * RoleController 会监听此事件并进行初始化
   */
  private addRoleControllerToPlayerSync(
    userId: string,
    characterId: string
  ): void {
    try {
      // 检查玩家是否已有 RoleController 组件
      if (!PlayerManager.instance.hasRoleController(userId)) {
        Logger.error(
          `[IngameManager] Player ${userId} does not have RoleController component`
        );
        return;
      }

      // 发送角色初始化事件
      this.eventBus.emit('ingame:role:initialize', {
        userId,
        characterId,
      });

      Logger.log(
        `[IngameManager] Role initialization event sent for player ${userId} (character: ${characterId})`
      );

      // 触发角色设置完成事件（用于其他系统监听）
      this.eventBus.emit('ingame:role:setup', {
        userId,
        characterId,
      });
    } catch (error) {
      Logger.error(
        `[IngameManager] Error initializing role for player ${userId}:`,
        error
      );
    }
  }

  /**
   * 步骤 4: 启动游戏循环
   */
  private startGameLoop(): void {
    Logger.log('[IngameManager] Step 4: Starting game loop...');

    this.isGameRunning = true;

    // 通知 ObjectManager 启动游戏逻辑
    this.eventBus.emit('ingame:loop:started', {
      timestamp: Date.now(),
    });

    Logger.log('[IngameManager] Game loop started');
  }

  /**
   * 停止游戏循环
   */
  public stopGameLoop(): void {
    Logger.log('[IngameManager] Stopping game loop...');

    this.isGameRunning = false;

    // 通知 ObjectManager 停止游戏逻辑
    this.eventBus.emit('ingame:loop:stopped', {
      timestamp: Date.now(),
    });

    Logger.log('[IngameManager] Game loop stopped');
  }

  /**
   * 获取当前游戏会话信息
   */
  public getCurrentGameSession() {
    return this.currentGameSession;
  }

  /**
   * 检查游戏是否正在运行
   */
  public isRunning(): boolean {
    return this.isGameRunning;
  }

  /**
   * 重置游戏状态
   */
  public reset(): void {
    Logger.log('[IngameManager] Resetting game state...');

    this.currentGameSession = null;
    this.isGameRunning = false;

    Logger.log('[IngameManager] Game state reset');
  }

  /**
   * 工具方法：延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    Logger.log('[IngameManager] Destroying...');

    // 停止游戏循环
    if (this.isGameRunning) {
      this.stopGameLoop();
    }

    // 移除事件监听
    this.eventBus.off('ingame:initialize');

    this.initialized = false;
    Logger.log('[IngameManager] Destroyed');
  }
}
