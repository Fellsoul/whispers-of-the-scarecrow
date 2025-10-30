import { Singleton } from '../../core/patterns/Singleton';
import { StorageManager } from './StorageManager';
import { GameManager } from './GameManager';
import { CameraController } from '../component/player/CameraController';
import { PlayerController } from '../component/player/PlayerController';
import { RoleController } from '../component/player/RoleController';
import { Settings } from '../../Settings';
import { GameScene, GameMode } from '../const/enum';
import { EntityNode } from '@dao3fun/component';
import type { IPlayerData } from '@shares/player/IPlayerData';
import { MatchPoolManager } from './MatchPoolManager';
import { Faction } from '@shares/core/Enum';
import { EventBus } from '../../core/events/EventBus';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import { CharacterManager } from './CharacterManager';
import { CharacterRegistry } from '@shares/character/CharacterRegistry';
import type { Character } from '@shares/character/Character';
import { Logger } from '../../core/utils/Logger';

/**
 * 在线玩家信息
 * Online Player Info
 */
interface OnlinePlayerInfo {
  /** 玩家实体 / Player entity */
  entity: GameEntity;
  /** 玩家EntityNode / Player EntityNode (for components) */
  entityNode: EntityNode;
  /** 玩家数据 / Player data */
  data: IPlayerData;
  /** 加入时间 / Join timestamp */
  joinTime: number;
  /** 相机控制器 / Camera controller */
  cameraController: CameraController | null;
}

/**
 * 玩家管理器
 * Player Manager - Manages online players and their data
 */
export class PlayerManager extends Singleton<PlayerManager>() {
  /** 在线玩家映射表 (userId -> OnlinePlayerInfo) */
  private onlinePlayers: Map<string, OnlinePlayerInfo> = new Map();

  /** 玩家加入事件取消令牌 */
  private playerJoinToken: GameEventHandlerToken | null = null;

  /** 玩家离开事件取消令牌 */
  private playerLeaveToken: GameEventHandlerToken | null = null;

  /** 上次保存时间戳 */
  private lastSaveTime: number = 0;

  /** 保存间隔(毫秒) - 每5分钟保存一次 */
  private readonly SAVE_INTERVAL = 5 * 60 * 1000;

  constructor() {
    super();
  }

  /**
   * 初始化玩家管理器
   * Initialize player manager
   */
  public initialize(): void {
    this.setupEventListeners();
    this.lastSaveTime = Date.now();
    console.log('PlayerManager: 初始化成功 / Initialized successfully');
  }

  /**
   * 设置事件监听
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // 监听玩家加入事件
    // Listen for player join events
    this.playerJoinToken = world.onPlayerJoin(async (event) => {
      await this.handlePlayerJoin(event);
    });

    // 监听玩家离开事件
    // Listen for player leave events
    this.playerLeaveToken = world.onPlayerLeave((event) => {
      this.handlePlayerLeave(event);
    });
  }

  /**
   * 处理玩家加入
   * Handle player join
   */
  private async handlePlayerJoin(event: GamePlayerEntityEvent): Promise<void> {
    const { entity } = event;
    const { player } = entity;

    if (!player || !player.userId) {
      return;
    }

    const { userId } = player;

    // 从存储加载玩家数据
    // Load player data from storage
    const storageManager = StorageManager.instance;
    const playerData = await storageManager.getPlayerData(userId);

    if (!playerData) {
      return;
    }

    // 创建EntityNode以便添加组件
    // Create EntityNode for component management
    const entityNode = new EntityNode(entity as GameEntity);

    // 添加到在线玩家列表
    // Add to online players list
    const playerInfo: OnlinePlayerInfo = {
      entity,
      entityNode,
      data: playerData,
      joinTime: Date.now(),
      cameraController: null,
    };

    //添加角色 如果是readiness
    //todo:怪物不能显示到profileUI里
    if (Settings.getCurrentSceneType() === GameScene.Readiness) {
      const character = CharacterRegistry.getById(Settings.defaultCharacter)!;
      CharacterManager.instance.bindCharacter(
        entity.player.userId,
        entity,
        character.id
      );
    }

    this.onlinePlayers.set(userId, playerInfo);

    // 根据当前场景处理玩家加入
    // Handle player join based on current scene
    await this.handlePlayerJoinByScene(entity, userId, playerData);

    console.log(`PlayerManager: 当前在线玩家数: ${this.onlinePlayers.size}`);
  }

  /**
   * 根据场景类型处理玩家加入
   * Handle player join based on scene type
   */
  private async handlePlayerJoinByScene(
    entity: GameEntity,
    userId: string,
    playerData: IPlayerData
  ): Promise<void> {
    const currentSceneType = Settings.getCurrentSceneType();
    const currentSceneName = Settings.getCurrentScene();
    const { currentGameMode } = Settings;

    console.log(
      `[PlayerManager] Player ${userId} joining in scene: ${currentSceneName} (type: ${currentSceneType})`
    );

    switch (currentSceneType) {
      case GameScene.Lobby:
        // Lobby场景：使用当前逻辑
        await this.handleLobbyJoin(entity, userId, playerData);
        break;

      case GameScene.Readiness:
        // Readiness场景：传送到预设位置
        await this.handleReadinessJoin(entity, userId, currentGameMode);
        break;

      case GameScene.Ingame:
        // Ingame场景：暂时不处理
        Logger.log(
          `[PlayerManager] Player ${userId} joined during Ingame scene`
        );
        break;

      default:
        Logger.warn(`[PlayerManager] Unknown scene type: ${currentSceneType}`);
        break;
    }
  }

  /**
   * 处理Lobby场景玩家加入
   */
  private async handleLobbyJoin(
    entity: GameEntity,
    userId: string,
    playerData: IPlayerData
  ): Promise<void> {
    const { player } = entity;
    if (!player) {
      return;
    }

    // 欢迎消息
    world.say(`欢迎 ${player.name} 加入游戏！`);
    world.say(`等级: Lv.${playerData.level} | VIP: Lv.${playerData.vipLevel}`);
    world.say(`在线时长: ${this.getPlayerOnlineDuration(userId)}s`);

    // Lobby场景中所有玩家都是Survivor阵营
    await this.setupPlayerController(userId, Faction.Survivor, GameScene.Lobby);
  }

  /**
   * Debug模式：自动分配角色
   * 将所有在线玩家按顺序分配为Overseer和Survivor
   * @param gameMode 游戏模式（决定Overseer数量）
   * @returns 角色分配数据
   */
  private async getDebugRoleAssignment(
    gameMode: GameMode
  ): Promise<{ overseers: string[]; survivors: string[] }> {
    // 获取所有在线玩家ID
    const onlinePlayerIds = this.getOnlinePlayerIds();

    // 根据游戏模式决定Survivor数量
    const survivorCount = gameMode === GameMode.Small ? 4 : 8;

    // 前N个玩家为Survivor，其余为
    const survivors = onlinePlayerIds.slice(0, survivorCount);
    const overseers = onlinePlayerIds.slice(survivorCount);

    console.log(
      `[PlayerManager] Debug模式角色分配 (${gameMode}):`,
      `Survivors(${survivors.length}):`,
      overseers,
      `Overseers(${overseers.length}):`,
      overseers
    );

    return { survivors, overseers };
  }

  /**
   * 通过serverId获取matchId
   * Get matchId from serverId mapping
   * @returns matchId，如果不存在则返回null
   */
  private async getMatchIdFromServer(): Promise<string | null> {
    const { serverId } = world;
    console.log(`[PlayerManager] 当前serverId: ${serverId}`);

    const serverMappingStorage =
      storage.getGroupStorage<string>('server_to_match');

    try {
      const result = await serverMappingStorage.get(serverId);
      const matchId = result?.value;

      if (!matchId) {
        console.warn(
          `[PlayerManager] GroupStorage中未找到serverId映射: ${serverId}`
        );
        return null;
      }

      console.log(
        `[PlayerManager] 找到matchId: ${matchId} (serverId: ${serverId})`
      );

      // 清除映射以释放内存
      await serverMappingStorage.remove(serverId);
      console.log(
        `[PlayerManager] 已清除server_to_match映射 (serverId: ${serverId})`
      );

      return matchId;
    } catch (error) {
      console.error(`[PlayerManager] 获取matchId失败:`, error);
      return null;
    }
  }

  /**
   * 获取并清除角色分配数据
   * Get and clear role assignment data from GroupStorage
   * @param matchId 游戏matchId
   * @returns 角色分配数据，如果不存在则返回null
   */
  private async getRoleAssignmentAndClear(matchId: string): Promise<{
    overseers: string[];
    survivors: string[];
  } | null> {
    console.log(`[PlayerManager] 读取角色分配数据 (matchId: ${matchId})`);

    const roleAssignmentStorage = storage.getGroupStorage<{
      overseers: string[];
      survivors: string[];
    }>('role_assignment');

    try {
      // 从GroupStorage读取
      const result = await roleAssignmentStorage.get(matchId);
      const roleData = result?.value;

      if (!roleData) {
        console.warn(
          `[PlayerManager] GroupStorage中未找到角色分配数据 (matchId: ${matchId})`
        );
        return null;
      }

      console.log(
        `[PlayerManager] 已从GroupStorage读取角色分配数据 (matchId: ${matchId}):`,
        roleData
      );

      // 立即清除GroupStorage以防止内存溢出
      await roleAssignmentStorage.remove(matchId);
      console.log(
        `[PlayerManager] 已清除role_assignment GroupStorage (matchId: ${matchId})，防止内存溢出`
      );

      return roleData;
    } catch (error) {
      console.error(
        `[PlayerManager] 读取或清除角色分配数据失败 (matchId: ${matchId}):`,
        error
      );
      return null;
    }
  }

  /**
   * 处理Readiness场景玩家加入
   * 根据角色分配结果传送玩家到对应位置，并设置相机
   */
  private async handleReadinessJoin(
    entity: GameEntity,
    userId: string,
    gameMode: GameMode
  ): Promise<void> {
    // 获取玩家信息
    const playerInfo = this.onlinePlayers.get(userId);
    if (!playerInfo || !playerInfo.entityNode) {
      console.warn(
        `[PlayerManager] Player info or EntityNode not found for ${userId}`
      );
      return;
    }

    // 获取当前场景名称
    const currentSceneName = Settings.getCurrentScene();
    console.log(
      `[PlayerManager] 处理Readiness场景玩家加入，当前场景: ${currentSceneName}`
    );

    let roleData: { survivors: string[]; overseers: string[] } | null = null;

    // Debug模式：直接分配角色而不从GroupStorage读取
    if (Settings.debug) {
      console.log('[PlayerManager] Debug模式：使用自动角色分配');
      roleData = await this.getDebugRoleAssignment(gameMode);
    } else {
      // 生产模式：从GroupStorage读取
      const matchId = await this.getMatchIdFromServer();
      if (!matchId) {
        console.warn(
          `[PlayerManager] 无法获取matchId，可能serverId映射已被清除或不存在`
        );
        return;
      }

      console.log(`[PlayerManager] 使用matchId: ${matchId}`);
      roleData = await this.getRoleAssignmentAndClear(matchId);
    }

    if (!roleData) {
      console.warn(
        `[PlayerManager] No role assignment data found for player ${userId} in scene ${currentSceneName}`
      );
      return;
    }

    try {
      const { survivors, overseers } = roleData;

      // 判断玩家是Overseer还是Survivor
      const isSurvivor = survivors.includes(userId);
      const isOverseer = overseers.includes(userId);

      if (!isSurvivor && !isOverseer) {
        console.warn(
          `[PlayerManager] Player ${userId} not found in role assignment`
        );
        return;
      }

      // 根据角色和GameMode传送到对应位置
      let characterIndex = 0; // 记录角色在队列中的索引

      if (isOverseer) {
        // Overseer传送到怪物位置
        const monsterPositions =
          gameMode === GameMode.Small
            ? [Settings.readyMonsterPositionSmall]
            : Settings.readyMonsterPositionLarge;

        // 找到该玩家在overseers列表中的索引
        const overseerIndex = overseers.indexOf(userId);
        characterIndex = overseerIndex;
        if (overseerIndex < monsterPositions.length) {
          entity.position = monsterPositions[overseerIndex] as GameVector3;
          console.log(
            `[PlayerManager] Overseer ${userId} teleported to monster position ${monsterPositions[overseerIndex].x}, ${monsterPositions[overseerIndex].y}, ${monsterPositions[overseerIndex].z}`
          );
        }
      } else if (isSurvivor) {
        // Survivor传送到玩家预备位置
        const playerPositions =
          gameMode === GameMode.Small
            ? Settings.readyPlayerPositionsSmall
            : Settings.readyPlayerPositionsLarge;

        // 找到该玩家在survivors列表中的索引
        const survivorIndex = survivors.indexOf(userId);
        characterIndex = survivorIndex;
        if (survivorIndex < playerPositions.length) {
          entity.position.x = playerPositions[survivorIndex].x;
          entity.position.y = playerPositions[survivorIndex].y;
          entity.position.z = playerPositions[survivorIndex].z;
          console.log(
            `[PlayerManager] Survivor ${userId} teleported to player position (index: ${survivorIndex})`
          );
        }
      }

      // 添加并初始化CameraController，传递角色索引
      await this.setupCameraController(
        userId,
        isOverseer ? Faction.Overseer : Faction.Survivor,
        characterIndex
      );

      // 添加并初始化PlayerController
      const faction = isOverseer ? Faction.Overseer : Faction.Survivor;
      await this.setupPlayerController(
        userId,
        faction,
        Settings.getCurrentSceneType()
      );

      // 添加 RoleController 组件（但不初始化，等待游戏开始事件）
      await this.addRoleControllerComponent(userId);
    } catch (error) {
      console.error(
        `[PlayerManager] Failed to handle readiness join for ${userId}:`,
        error
      );
    }
  }

  /**
   * 设置玩家相机控制器
   * Setup player camera controller
   * @param userId 玩家ID
   * @param role 玩家角色（Overseer或Survivor）
   * @param characterIndex 玩家在角色列表中的索引
   */
  private async setupCameraController(
    userId: string,
    role: Faction,
    characterIndex: number
  ): Promise<void> {
    const playerInfo = this.onlinePlayers.get(userId);
    if (!playerInfo || !playerInfo.entityNode) {
      console.warn(
        `[PlayerManager] Cannot setup camera: player info not found for ${userId}`
      );
      return;
    }

    try {
      // 添加CameraController组件
      playerInfo.entityNode.addComponent(CameraController);

      // 获取已添加的组件
      const cameraController =
        playerInfo.entityNode.getComponent(CameraController);
      if (cameraController) {
        cameraController.initializeCamera(role, characterIndex);
        playerInfo.cameraController = cameraController;

        console.log(
          `[PlayerManager] Camera controller added for player ${userId} with character index ${characterIndex}`
        );
      } else {
        console.warn(
          `[PlayerManager] Failed to get camera controller for ${userId}`
        );
      }
    } catch (error) {
      console.error(
        `[PlayerManager] Failed to setup camera controller for ${userId}:`,
        error
      );
    }
  }

  /**
   * 设置玩家控制器
   * Setup player controller
   */
  private async setupPlayerController(
    userId: string,
    role: Faction,
    scene: GameScene
  ): Promise<void> {
    const playerInfo = this.onlinePlayers.get(userId);
    if (!playerInfo || !playerInfo.entityNode) {
      console.warn(
        `[PlayerManager] Cannot setup player controller: player info not found for ${userId}`
      );
      return;
    }
    try {
      // 添加PlayerController组件
      playerInfo.entityNode.addComponent(PlayerController);

      // 获取已添加的组件
      const playerController =
        playerInfo.entityNode.getComponent(PlayerController);
      if (playerController) {
        // 初始化角色预设
        playerController.initialize(role);
        console.log(
          `[PlayerManager] Player controller added for player ${userId} as ${role}`
        );
      } else {
        console.warn(
          `[PlayerManager] Failed to get player controller for ${userId}`
        );
      }
    } catch (error) {
      console.error(
        `[PlayerManager] Failed to setup player controller for ${userId}:`,
        error
      );
    }
    if (Settings.getCurrentSceneType() === GameScene.Readiness) {
      playerInfo.entityNode.getComponent(PlayerController)?.lockPlayer();
    }
  }

  /**
   * 获取玩家的相机控制器
   * Get player's camera controller
   */
  public getCameraController(userId: string): CameraController | null {
    const playerInfo = this.onlinePlayers.get(userId);
    return playerInfo?.cameraController || null;
  }

  /**
   * 获取玩家的控制器
   * Get player's controller
   */
  public getPlayerController(userId: string): PlayerController | null {
    const playerInfo = this.onlinePlayers.get(userId);
    if (!playerInfo?.entityNode) {
      return null;
    }
    return playerInfo.entityNode.getComponent(PlayerController) || null;
  }

  /**
   * 锁定玩家移动
   * Lock player movement
   */
  public lockPlayer(userId: string): void {
    const playerController = this.getPlayerController(userId);
    if (playerController) {
      playerController.lockPlayer();
    } else {
      console.warn(
        `[PlayerManager] Cannot lock player: controller not found for ${userId}`
      );
    }
  }

  /**
   * 解锁玩家移动
   * Unlock player movement
   */
  public unlockPlayer(userId: string): void {
    const playerController = this.getPlayerController(userId);
    if (playerController) {
      playerController.unlockPlayer();
    } else {
      console.warn(
        `[PlayerManager] Cannot unlock player: controller not found for ${userId}`
      );
    }
  }

  /**
   * 锁定所有在线玩家
   * Lock all online players
   */
  public lockAllPlayers(): void {
    this.onlinePlayers.forEach((_, userId) => {
      this.lockPlayer(userId);
    });
    console.log('[PlayerManager] All players locked');
  }

  /**
   * 解锁所有在线玩家
   * Unlock all online players
   */
  public unlockAllPlayers(): void {
    this.onlinePlayers.forEach((_, userId) => {
      this.unlockPlayer(userId);
    });
    console.log('[PlayerManager] All players unlocked');
  }

  /**
   * 处理玩家离开
   * Handle player leave
   */
  private handlePlayerLeave(event: GamePlayerEntityEvent): void {
    const { entity } = event;
    const { player } = entity;

    if (!player || !player.userId) {
      return;
    }

    const { userId } = player;
    console.log(`PlayerManager: 玩家 ${player.name} (${userId}) 离开游戏`);

    // 检查玩家是否在匹配池中，如果是则从匹配池移除
    // Check if player is in match pool, remove if yes
    const matchPoolManager = MatchPoolManager.instance;
    if (matchPoolManager.isPlayerInPool(userId)) {
      console.log(`PlayerManager: 玩家 ${userId} 在匹配池中，正在移除...`);
      matchPoolManager.handlePlayerLeave(userId);
    }

    // 保存玩家游戏时长
    // Save player play time
    this.savePlayerPlayTimeOnLeave(userId);

    // 从在线列表移除
    // Remove from online list
    this.onlinePlayers.delete(userId);

    world.say(`${player.name} 离开了游戏`);

    console.log(`PlayerManager: 当前在线玩家数: ${this.onlinePlayers.size}`);
  }

  /**
   * 获取在线玩家信息
   * Get online player info
   * @param userId 玩家ID / Player ID
   */
  public getOnlinePlayer(userId: string): OnlinePlayerInfo | null {
    return this.onlinePlayers.get(userId) || null;
  }

  /**
   * 获取玩家实体
   * Get player entity
   * @param userId 玩家ID / Player ID
   */
  public getPlayerEntity(userId: string): GameEntity | null {
    const playerInfo = this.onlinePlayers.get(userId);
    return playerInfo ? playerInfo.entity : null;
  }

  /**
   * 获取玩家数据
   * Get player data
   * @param userId 玩家ID / Player ID
   */
  public getPlayerData(userId: string): IPlayerData | null {
    const playerInfo = this.onlinePlayers.get(userId);
    return playerInfo ? playerInfo.data : null;
  }

  /**
   * 更新在线玩家的缓存数据
   * Update cached data for online player
   * @param userId 玩家ID / Player ID
   * @param data 更新后的数据 / Updated data
   */
  public updatePlayerData(userId: string, data: IPlayerData): void {
    const playerInfo = this.onlinePlayers.get(userId);
    if (playerInfo) {
      playerInfo.data = data;
    }
  }

  /**
   * 获取所有在线玩家ID列表
   * Get all online player IDs
   */
  public getOnlinePlayerIds(): string[] {
    return Array.from(this.onlinePlayers.keys());
  }

  /**
   * 获取所有在线玩家实体
   * Get all online player entities
   */
  public getOnlinePlayerEntities(): GameEntity[] {
    return Array.from(this.onlinePlayers.values()).map((info) => info.entity);
  }

  /**
   * 获取在线玩家数量
   * Get online player count
   */
  public getOnlinePlayerCount(): number {
    return this.onlinePlayers.size;
  }

  /**
   * 检查玩家是否在线
   * Check if player is online
   * @param userId 玩家ID / Player ID
   */
  public isPlayerOnline(userId: string): boolean {
    return this.onlinePlayers.has(userId);
  }

  /**
   * 为玩家添加 RoleController 组件（不初始化）
   * Add RoleController component to player (without initialization)
   * @param userId 玩家ID / Player ID
   * @returns 是否添加成功 / Whether the addition was successful
   */
  private async addRoleControllerComponent(userId: string): Promise<boolean> {
    const playerInfo = this.onlinePlayers.get(userId);
    if (!playerInfo) {
      Logger.error(
        `[PlayerManager] Cannot add RoleController: player info not found for ${userId}`
      );
      return false;
    }

    if (!playerInfo.entityNode) {
      Logger.error(
        `[PlayerManager] Cannot add RoleController: entityNode not found for ${userId}`
      );
      return false;
    }

    try {
      // 检查是否已有 RoleController 组件
      const existingController =
        playerInfo.entityNode.getComponent(RoleController);
      if (existingController) {
        Logger.warn(
          `[PlayerManager] RoleController already exists for player ${userId}`
        );
        return true;
      }

      // 添加 RoleController 组件
      playerInfo.entityNode.addComponent(RoleController);

      // 验证组件已添加
      const roleController = playerInfo.entityNode.getComponent(RoleController);
      if (roleController) {
        Logger.log(
          `[PlayerManager] ✅ RoleController component added for player ${userId} (awaiting initialization)`
        );
        return true;
      } else {
        Logger.error(
          `[PlayerManager] Failed to get RoleController after adding for player ${userId}`
        );
        return false;
      }
    } catch (error) {
      Logger.error(
        `[PlayerManager] Error adding RoleController component to player ${userId}:`,
        error
      );
      return false;
    }
  }

  /**
   * 检查玩家是否已有 RoleController 组件
   * Check if player has RoleController component
   * @param userId 玩家ID / Player ID
   */
  public hasRoleController(userId: string): boolean {
    const playerInfo = this.onlinePlayers.get(userId);
    if (!playerInfo?.entityNode) {
      return false;
    }
    return playerInfo.entityNode.getComponent(RoleController) !== null;
  }

  /**
   * 向所有在线玩家发送消息
   * Send message to all online players
   * @param message 消息内容 / Message content
   */
  public broadcastMessage(message: string): void {
    world.say(message);
  }

  /**
   * 向特定玩家发送消息
   * Send message to specific player
   * @param userId 玩家ID / Player ID
   * @param message 消息内容 / Message content
   */
  public sendMessageToPlayer(userId: string, message: string): void {
    const playerInfo = this.onlinePlayers.get(userId);
    if (playerInfo && playerInfo.entity.player) {
      playerInfo.entity.player.directMessage(message);
    }
  }

  /**
   * 获取玩家在线时长(秒)
   * Get player online duration in seconds
   * @param userId 玩家ID / Player ID
   */
  public getPlayerOnlineDuration(userId: string): number {
    const playerInfo = this.onlinePlayers.get(userId);
    if (!playerInfo) {
      return 0;
    }
    return Math.floor((Date.now() - playerInfo.joinTime) / 1000);
  }

  /**
   * 更新函数 - 由 GameManager 定期调用
   * Update function - called periodically by GameManager
   * @param _deltaTime 时间增量(毫秒) / Delta time in milliseconds (unused, we use absolute timestamps)
   */
  public update(_deltaTime: number): void {
    const now = Date.now();

    // 检查是否需要保存玩家数据
    // Check if we need to save player data
    if (now - this.lastSaveTime >= this.SAVE_INTERVAL) {
      this.saveAllPlayersPlayTime();
      this.lastSaveTime = now;
    }
  }

  /**
   * 保存所有在线玩家的游戏时长
   * Save play time for all online players
   */
  private async saveAllPlayersPlayTime(): Promise<void> {
    const storageManager = StorageManager.instance;
    const savePromises: Promise<void>[] = [];

    for (const [userId, playerInfo] of this.onlinePlayers.entries()) {
      // 计算本次在线时长(秒)
      // Calculate current session duration in seconds
      const sessionDuration = Math.floor(
        (Date.now() - playerInfo.joinTime) / 1000
      );

      // 更新总游戏时长
      // Update total play time
      const savePromise = storageManager
        .updatePlayerData(userId, (prevData) => {
          const newTotalPlayTime = prevData.totalPlayTime + sessionDuration;

          return {
            ...prevData,
            totalPlayTime: newTotalPlayTime,
          };
        })
        .then(() => {
          // 重置加入时间，下次计算增量
          // Reset join time for next increment calculation
          playerInfo.joinTime = Date.now();

          // 更新缓存数据
          // Update cached data
          storageManager.getPlayerData(userId).then((updatedData) => {
            if (updatedData) {
              playerInfo.data = updatedData;
            }
          });
        });

      savePromises.push(savePromise);
    }

    // 等待所有保存操作完成
    // Wait for all save operations to complete
    await Promise.all(savePromises);

    console.log(
      `PlayerManager: 已保存 ${this.onlinePlayers.size} 位在线玩家的游戏时长`
    );
  }

  /**
   * 玩家离开时保存游戏时长
   * Save play time when player leaves
   * @param userId 玩家ID / Player ID
   */
  private async savePlayerPlayTimeOnLeave(userId: string): Promise<void> {
    const playerInfo = this.onlinePlayers.get(userId);
    if (!playerInfo) {
      return;
    }

    const storageManager = StorageManager.instance;
    const sessionDuration = Math.floor(
      (Date.now() - playerInfo.joinTime) / 1000
    );

    // 更新总游戏时长
    // Update total play time
    await storageManager.updatePlayerData(userId, (prevData) => ({
      ...prevData,
      totalPlayTime: prevData.totalPlayTime + sessionDuration,
    }));

    console.log(
      `PlayerManager: 玩家 ${userId} 本次游戏时长 ${sessionDuration}秒，已保存到总时长`
    );
  }

  /**
   * 销毁玩家管理器
   * Destroy player manager
   */
  public destroy(): void {
    console.log('PlayerManager: 正在销毁 / Destroying...');

    // 取消事件监听
    // Cancel event listeners
    if (this.playerJoinToken) {
      this.playerJoinToken.cancel();
      this.playerJoinToken = null;
    }

    if (this.playerLeaveToken) {
      this.playerLeaveToken.cancel();
      this.playerLeaveToken = null;
    }

    // 清空在线玩家列表
    // Clear online players list
    this.onlinePlayers.clear();

    console.log('PlayerManager: 已销毁 / Destroyed');
  }
}
