import { Singleton } from '../../core/patterns/Singleton';
import { StorageManager } from './StorageManager';
import type { IPlayerData } from '@shares/IPlayerData';

/**
 * 在线玩家信息
 * Online Player Info
 */
interface OnlinePlayerInfo {
  /** 玩家实体 / Player entity */
  entity: GameEntity;
  /** 玩家数据 / Player data */
  data: IPlayerData;
  /** 加入时间 / Join timestamp */
  joinTime: number;
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

    // 添加到在线玩家列表
    // Add to online players list
    const playerInfo: OnlinePlayerInfo = {
      entity,
      data: playerData,
      joinTime: Date.now(),
    };

    this.onlinePlayers.set(userId, playerInfo);

    // 欢迎消息
    // Welcome message
    world.say(`欢迎 ${player.name} 加入游戏！`);
    world.say(`等级: Lv.${playerData.level} | VIP: Lv.${playerData.vipLevel}`);
    world.say(`在线时长: ${this.getPlayerOnlineDuration(userId)}s`);

    console.log(`PlayerManager: 当前在线玩家数: ${this.onlinePlayers.size}`);
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
