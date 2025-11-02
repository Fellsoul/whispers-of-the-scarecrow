import { Singleton } from '../../core/patterns/Singleton';
import { EventBus } from '../../core/events/EventBus';
import { PlayerManager } from './PlayerManager';
import { CharacterManager } from './CharacterManager';
import { ObjectManager } from './ObjectManager';
import { AltarManager } from './AltarManager';
import { HeartbeatManager } from './HeartbeatManager';
import { InventoryController } from '../component/player/InventoryController';
import { DeathController } from '../component/player/DeathController';
import { Settings } from '../../Settings';
import { Logger } from '../../core/utils/Logger';
import i18next from 'i18next';
import mapHref from '../../data/mapHref.json';

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

    // 监听玩家彻底死亡事件
    this.eventBus.on<{ userId: string }>('player:permanent_death', (data) => {
      if (data?.userId) {
        Logger.log(`[IngameManager] Player ${data.userId} permanently died, checking game state...`);
        this.checkAllSurvivorsDead();
      }
    });

    // 监听游戏结束事件
    this.eventBus.on<{ winner: string; reason: string }>('game:end', (data) => {
      if (data) {
        Logger.log(`[IngameManager] Game ended - Winner: ${data.winner}, Reason: ${data.reason}`);
        this.handleGameEnd(data);
      }
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

    // 防止重复初始化
    if (this.isGameRunning) {
      Logger.warn(
        '[IngameManager] ⚠️ Game is already running, ignoring duplicate initialization event'
      );
      return;
    }

    Logger.log(
      `[IngameManager] Starting game initialization for ${data.totalPlayers} players`
    );

    this.currentGameSession = data;
    this.isGameRunning = true; // 标记游戏正在运行

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

      // 步骤 1.5: 初始化祭台管理器
      AltarManager.instance.initialize();

      // 步骤 1.6: 初始化心跳管理器
      HeartbeatManager.instance.initialize();

      // 步骤 2: 立即生成玩家到场上（不等待）
      this.spawnAllPlayersSync();

      // 步骤 3: 为玩家添加 RoleController 组件
      this.setupPlayerRolesSync();

      // 步骤 3.5: 从 RoleController 同步角色实例到 CharacterManager
      CharacterManager.instance.syncRoleInstancesFromPlayers();

      // 步骤 4: 为玩家添加 InventoryController 组件
      await this.setupPlayerInventoriesSync();

      // 步骤 4.5: 为玩家添加 DeathController 组件
      await this.setupPlayerDeathControllersSync();

      // 步骤 5: 启动游戏循环
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
   * 步骤 4: 为所有玩家设置背包控制器
   */
  private async setupPlayerInventoriesSync(): Promise<void> {
    if (!this.currentGameSession) {
      return;
    }

    Logger.log('[IngameManager] Step 4: Setting up player inventories...');

    // 为所有玩家添加 InventoryController（并行处理）
    const addPromises = this.currentGameSession.playerStates.map((playerState) =>
      this.addInventoryControllerToPlayerSync(playerState.userId)
    );

    // 等待所有添加操作完成
    await Promise.all(addPromises);

    Logger.log('[IngameManager] All player inventories setup complete');
  }

  /**
   * 为玩家添加并初始化 InventoryController 组件
   */
  private async addInventoryControllerToPlayerSync(userId: string): Promise<void> {
    try {
      // 检查玩家角色，Overseer 不需要背包
      const characterState = CharacterManager.instance.getCharacterState(userId);
      if (!characterState) {
        Logger.warn(
          `[IngameManager] Cannot add InventoryController - character state not found for ${userId}`
        );
        return;
      }

      if (characterState.character.faction === 'Overseer') {
        Logger.log(
          `[IngameManager] Skipping InventoryController for Overseer ${userId}`
        );
        return;
      }

      // 获取玩家信息
      const playerInfo = PlayerManager.instance.getOnlinePlayer(userId);
      if (!playerInfo || !playerInfo.entityNode) {
        Logger.error(
          `[IngameManager] Cannot add InventoryController - player info or entityNode not found for ${userId}`
        );
        return;
      }

      // 添加 InventoryController 组件
      playerInfo.entityNode.addComponent(InventoryController);
      Logger.log(`[PlayerManager] ✅ InventoryController component added for player ${userId}`);

      // 初始化背包控制器
      this.initializeInventoryController(userId);

      Logger.log(
        `[IngameManager] InventoryController added and initialized for player ${userId}`
      );
    } catch (error) {
      Logger.error(
        `[IngameManager] Error adding InventoryController for player ${userId}:`,
        error
      );
    }
  }

  /**
   * 初始化玩家的背包控制器
   */
  private initializeInventoryController(userId: string): void {
    const playerInfo = PlayerManager.instance.getOnlinePlayer(userId);
    if (!playerInfo) {
      Logger.error(
        `[IngameManager] Cannot initialize InventoryController: player info not found for ${userId}`
      );
      return;
    }

    if (!playerInfo.entityNode) {
      Logger.error(
        `[IngameManager] Cannot initialize InventoryController: entityNode not found for ${userId}`
      );
      return;
    }

    // 添加延迟以确保组件已完全添加到实体节点
    setTimeout(() => {
      const inventoryController = playerInfo.entityNode?.getComponent(InventoryController);
      
      if (!inventoryController) {
        Logger.error(
          `[IngameManager] Cannot initialize InventoryController: component not found for ${userId}`
        );
        Logger.error(
          `[IngameManager] Debug info - PlayerInfo exists: ${!!playerInfo}, EntityNode exists: ${!!playerInfo.entityNode}`
        );
        return;
      }

      // 检查是否有 initialize 方法
      if (typeof (inventoryController as unknown as { initialize: (userId: string) => void }).initialize === 'function') {
        (inventoryController as unknown as { initialize: (userId: string) => void }).initialize(userId);
      } else {
        Logger.error(
          `[IngameManager] InventoryController does not have initialize method for ${userId}`
        );
      }

      // 添加初始物品（自动分配槽位）
      const addSuccess = inventoryController.addItem('item_pumpkin_seed');
      inventoryController.addItem('item_pumpkin_seed');
      const addSuccess2 = inventoryController.addItem('item_wax');
      if (addSuccess) {
        Logger.log(`[IngameManager] Added initial pumpkin seed to player ${userId}'s inventory`);
      } else {
        Logger.error(`[IngameManager] Failed to add initial pumpkin seed to player ${userId}'s inventory`);
      }
    }, 100);


  }

  /**
   * 步骤 4.5: 为所有玩家设置死亡控制器
   */
  private async setupPlayerDeathControllersSync(): Promise<void> {
    if (!this.currentGameSession) {
      return;
    }

    Logger.log('[IngameManager] Step 4.5: Setting up player death controllers...');

    // 为所有玩家添加 DeathController（并行处理）
    const addPromises = this.currentGameSession.playerStates.map((playerState) =>
      this.addDeathControllerToPlayerSync(playerState.userId)
    );

    // 等待所有添加操作完成
    await Promise.all(addPromises);

    Logger.log('[IngameManager] All player death controllers setup complete');
  }

  /**
   * 为玩家添加并初始化 DeathController 组件
   */
  private async addDeathControllerToPlayerSync(userId: string): Promise<void> {
    try {
      // 获取玩家信息
      const playerInfo = PlayerManager.instance.getOnlinePlayer(userId);
      if (!playerInfo || !playerInfo.entityNode) {
        Logger.error(
          `[IngameManager] Cannot add DeathController - player info or entityNode not found for ${userId}`
        );
        return;
      }

      // 添加 DeathController 组件
      playerInfo.entityNode.addComponent(DeathController);
      Logger.log(`[IngameManager] ✅ DeathController component added for player ${userId}`);

      Logger.log(
        `[IngameManager] DeathController added for player ${userId}`
      );
    } catch (error) {
      Logger.error(
        `[IngameManager] Error adding DeathController for player ${userId}:`,
        error
      );
    }
  }

  /**
   * 步骤 5: 启动游戏循环
   */
  private startGameLoop(): void {
    Logger.log('[IngameManager] Step 5: Starting game loop...');

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
   * 检查所有幸存者是否全部死亡
   */
  private checkAllSurvivorsDead(): void {
    if (!this.currentGameSession) {
      return;
    }

    const { playerStates } = this.currentGameSession;
    
    // 过滤出所有 Survivor 玩家
    const survivors = playerStates.filter((state) => {
      const characterState = CharacterManager.instance.getCharacterState(state.userId);
      return characterState && characterState.character.faction === 'Survivor';
    });

    Logger.log(`[IngameManager] Checking survivor status: ${survivors.length} survivor(s) in game`);

    // 检查所有 Survivor 是否都已死亡
    let allSurvivorsDead = true;
    for (const survivor of survivors) {
      const playerInfo = PlayerManager.instance.getOnlinePlayer(survivor.userId);
      if (playerInfo && playerInfo.entity) {
        const player = playerInfo.entity.player;
        // 检查玩家是否是观察者（彻底死亡）
        if (player && !player.spectator) {
          allSurvivorsDead = false;
          Logger.log(`[IngameManager] Survivor ${survivor.userId} is still alive`);
          break;
        }
      }
    }

    if (allSurvivorsDead && survivors.length > 0) {
      Logger.log('[IngameManager] 💀 All survivors are dead! Overseer WINS!');
      
      // 广播失败消息
      const defeatMessage = (i18next as any).t('altar.defeat', { ns: 'common' });
      world.say(defeatMessage);
      Logger.log(`[IngameManager] Defeat message: ${defeatMessage}`);

      // 触发游戏结束事件
      this.eventBus.emit('game:end', {
        winner: 'overseer',
        reason: 'all_survivors_dead',
      });
    }
  }

  /**
   * 处理游戏结束
   */
  private handleGameEnd(data: { winner: string; reason: string }): void {
    Logger.log(`[IngameManager] === GAME OVER ===`);
    Logger.log(`[IngameManager] Winner: ${data.winner}`);
    Logger.log(`[IngameManager] Reason: ${data.reason}`);

    // 停止游戏循环
    this.stopGameLoop();

    // 延迟 5 秒后传送玩家回大厅
    setTimeout(() => {
      this.teleportAllPlayersToLobby();
    }, 5000);

    Logger.log('[IngameManager] Game end sequence started, players will be teleported to lobby in 5 seconds');
  }

  /**
   * 传送所有玩家回大厅
   */
  private teleportAllPlayersToLobby(): void {
    Logger.log('[IngameManager] Teleporting all players to lobby...');

    const lobbyUrl = mapHref.LobbyUrl;
    if (!lobbyUrl) {
      Logger.error('[IngameManager] Lobby URL not found in mapHref.json');
      return;
    }

    // 获取所有在线玩家ID
    const onlinePlayerIds = PlayerManager.instance.getOnlinePlayerIds();
    Logger.log(`[IngameManager] Found ${onlinePlayerIds.length} online players to teleport`);

    // 遍历所有玩家并传送
    for (const userId of onlinePlayerIds) {
      const playerInfo = PlayerManager.instance.getOnlinePlayer(userId);
      
      if (playerInfo && playerInfo.entity && playerInfo.entity.player) {
        const player = playerInfo.entity.player;
        
        try {
          // 使用 link 方法传送玩家
          player.link(lobbyUrl, {
            isConfirm: false,
            isNewTab: false,
          });
          
          Logger.log(`[IngameManager] ✅ Teleported player ${userId} to lobby`);
        } catch (error) {
          Logger.error(`[IngameManager] Failed to teleport player ${userId}:`, error);
        }
      } else {
        Logger.warn(`[IngameManager] Player ${userId} entity or player object not found`);
      }
    }

    // 清理游戏状态
    this.reset();
    Logger.log('[IngameManager] All players teleported, game state reset');
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
