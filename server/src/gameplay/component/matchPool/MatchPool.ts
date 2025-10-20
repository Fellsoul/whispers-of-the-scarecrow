import { _decorator, Component } from '@dao3fun/component';
import { EventBus } from '../../../core/events/EventBus';
import { CommunicationMgr } from '../../../presentation/CommunicationGateway';
const { apclass } = _decorator;
import { Settings } from '../../../Settings';
import { PlayerManager } from '../../mgr/PlayerManager';

/**
 * 匹配池玩家数据接口
 */
interface MatchPoolPlayerData {
  userId: string;
  playerEntity: GamePlayerEntity;
}

/**
 * 匹配池客户端UI数据
 */
interface MatchPoolUIData {
  poolId: string;
  players: Array<{ userId: string; name: string }>;
  maxPlayers: number;
  countdownSeconds: number;
  isStarting: boolean;
}

@apclass('MatchPool')
export class MatchPool extends Component<GameEntity> {
  /*
    绑定于匹配池底座
   * 匹配池组件
     人数满足当前匹配池人数要求-》开始倒计时
     倒计时结束-》开始游戏
   * 1. 监听该编号对应的游戏开始事件, 将所有匹配池玩家写到groupStorage里(匹配池id-玩家id), 在地图切换到rediness时自动删除storage(storage做跨图缓冲)
   * 2. 如果开始，将目前匹配池中的玩家分配到游戏中，同时通知客户端ui更改
   * 3. 该场游戏结束，尝试等待20秒，让等待队列的玩家进入lobby后被传送至匹配池
   * 4. 如果等待队列为空，则不等待, 匹配池清空
   * 
   * 监听客户端传来的ui按钮退出事件
   * 1. 如果退出，将玩家从匹配池中移除，同时通知客户端ui更改
   * ->所有匹配池内玩家顶部ui栏减少该玩家头像，该玩家顶部ui栏清除
   * ->玩家传送至踏板处
   * 2. 如果匹配池为空，通知客户端ui更改
   * 
   */

  // 匹配池ID（使用实体ID作为唯一标识）
  private poolId: string = '';

  // 匹配池踏板位置（用于玩家退出时传送回踏板）
  public matchPoolEntrePedalPosition: GameVector3 | null = null;

  // 匹配池内的玩家列表
  private playersInPool: Map<string, MatchPoolPlayerData> = new Map();

  // 等待队列
  private waitingQueue: MatchPoolPlayerData[] = [];

  // 匹配池最大玩家数
  private maxPlayers: number = Settings.maxPlayerSmall;

  // 倒计时时长（秒）
  private readonly COUNTDOWN_DURATION = Settings.countdownDurationSmall;

  // 游戏结束后等待时长（秒）
  private readonly POST_GAME_WAIT_DURATION = Settings.postGameWaitDurationSmall;

  // 当前倒计时剩余时间
  private countdownRemaining: number = 0;

  // 是否正在倒计时
  private isCountingDown: boolean = false;

  // 是否正在游戏中
  private isInGame: boolean = false;

  // 匹配池跨地图存储
  private matchPoolStorage: GameDataStorage<string[]> | null = null;

  start() {
    this.poolId = this.node.entity.id;
    console.log(`[MatchPool] 匹配池初始化: ${this.poolId}`);

    // 初始化跨地图存储
    this.initializeStorage();

    // 注册客户端事件监听
    this.registerClientEvents();

    // 监听游戏结束事件
    this.registerGameEvents();
  }

  /**
   * 初始化跨地图存储
   */
  private initializeStorage(): void {
    try {
      this.matchPoolStorage =
        storage.getGroupStorage<string[]>('match_pool_players');
      console.log(`[MatchPool] 存储初始化成功`);
    } catch (error) {
      console.error(`[MatchPool] 存储初始化失败:`, error);
    }
  }

  /**
   * 注册客户端事件监听
   */
  private registerClientEvents(): void {
    // 监听客户端的退出匹配池请求
    EventBus.instance.on<{ userId: string; poolId: string }>(
      'client:matchPool:leave',
      (data) => {
        if (data && data.poolId === this.poolId) {
          this.removePlayer(data.userId);
        }
      }
    );
  }

  /**
   * 注册游戏事件监听
   */
  private registerGameEvents(): void {
    // 监听游戏结束事件
    EventBus.instance.on<{ poolId: string }>('game:ended', (data) => {
      if (data && data.poolId === this.poolId) {
        this.onGameEnded();
      }
    });
  }

  /**
   * 尝试添加玩家到匹配池
   */
  public tryAddPlayer(playerEntity: GamePlayerEntity): boolean {
    const userId = playerEntity.player?.userId;
    if (!userId) {
      console.warn(`[MatchPool] 无效的玩家实体`);
      return false;
    }

    // 检查玩家是否已经在匹配池中
    if (this.playersInPool.has(userId)) {
      console.log(`[MatchPool] 玩家 ${userId} 已在匹配池中`);
      return false;
    }

    // 检查匹配池是否已满
    if (this.playersInPool.size >= this.maxPlayers) {
      console.log(`[MatchPool] 匹配池已满，将玩家 ${userId} 加入等待队列`);
      this.addToWaitingQueue({ userId, playerEntity });
      return false;
    }

    // 添加玩家到匹配池
    this.playersInPool.set(userId, { userId, playerEntity });
    console.log(
      `[MatchPool] 玩家 ${userId} 加入匹配池 (${this.playersInPool.size}/${this.maxPlayers})`
    );
    // 更新玩家位置到匹配池中心 (先找到真实体)
    const playerOnlineEntity = PlayerManager.instance.getPlayerEntity(userId);
    if (playerOnlineEntity) {
      const offset = Settings.matchPoolCenterOffset;
      playerOnlineEntity.position = this.node.entity.position.add(
        offset as GameVector3
      );
    }
    // 通知所有匹配池玩家UI更新
    this.notifyPoolUpdate();

    // 检查是否可以开始倒计时
    this.checkStartCountdown();

    return true;
  }

  /**
   * 添加玩家到等待队列
   */
  private addToWaitingQueue(playerData: MatchPoolPlayerData): void {
    this.waitingQueue.push(playerData);

    // 通知玩家进入等待队列
    CommunicationMgr.instance.sendTo(
      playerData.playerEntity,
      'matchPool:waitingQueue',
      {
        poolId: this.poolId,
        position: this.waitingQueue.length,
      }
    );
  }

  /**
   * 移除玩家
   */
  public removePlayer(userId: string): void {
    const playerData = this.playersInPool.get(userId);
    if (!playerData) {
      console.log(`[MatchPool] 玩家 ${userId} 不在匹配池中`);
      return;
    }

    // 从匹配池移除
    this.playersInPool.delete(userId);
    console.log(`[MatchPool] 玩家 ${userId} 离开匹配池`);

    // 传送玩家回踏板位置
    if (this.matchPoolEntrePedalPosition) {
      playerData.playerEntity.position = this.matchPoolEntrePedalPosition;
    }

    // 通知玩家UI清除
    CommunicationMgr.instance.sendTo(
      playerData.playerEntity,
      'matchPool:left',
      { poolId: this.poolId }
    );

    // 通知其他玩家UI更新
    this.notifyPoolUpdate();

    // 如果正在倒计时且人数不足，取消倒计时
    if (this.isCountingDown && this.playersInPool.size < this.maxPlayers) {
      this.cancelCountdown();
    }

    // 尝试从等待队列补充玩家
    this.tryFillFromWaitingQueue();
  }

  /**
   * 检查是否可以开始倒计时
   */
  private checkStartCountdown(): void {
    if (this.isCountingDown || this.isInGame) {
      return;
    }

    if (this.playersInPool.size >= this.maxPlayers) {
      this.startCountdown();
    }
  }

  /**
   * 开始倒计时
   */
  private startCountdown(): void {
    this.isCountingDown = true;
    this.countdownRemaining = this.COUNTDOWN_DURATION;
    console.log(`[MatchPool] 开始倒计时: ${this.COUNTDOWN_DURATION}秒`);

    // 通知所有玩家倒计时开始
    this.notifyPoolUpdate();
  }

  /**
   * 取消倒计时
   */
  private cancelCountdown(): void {
    this.isCountingDown = false;
    this.countdownRemaining = 0;
    console.log(`[MatchPool] 倒计时已取消`);

    // 通知所有玩家倒计时取消
    this.notifyPoolUpdate();
  }

  /**
   * 开始游戏
   */
  private async startGame(): Promise<void> {
    this.isInGame = true;
    this.isCountingDown = false;
    console.log(`[MatchPool] 游戏开始！`);

    // 将匹配池玩家数据写入跨地图存储
    await this.savePlayersToStorage();

    // 通知所有玩家游戏开始
    const players = Array.from(this.playersInPool.values());
    const playerEntities = players.map((p) => p.playerEntity);

    CommunicationMgr.instance.sendTo(playerEntities, 'matchPool:gameStart', {
      poolId: this.poolId,
      players: players.map((p) => ({
        userId: p.userId,
        name: p.playerEntity.player.name,
      })),
    });

    // 触发游戏开始事件（由GameManager监听并处理地图切换等逻辑）
    EventBus.instance.emit('matchPool:gameStart', {
      poolId: this.poolId,
      playerEntities,
    });
  }

  /**
   * 保存玩家数据到跨地图存储
   */
  private async savePlayersToStorage(): Promise<void> {
    if (!this.matchPoolStorage) {
      console.warn(`[MatchPool] 存储未初始化`);
      return;
    }

    try {
      const playerIds = Array.from(this.playersInPool.keys());
      await this.matchPoolStorage.set(this.poolId, playerIds);
      console.log(`[MatchPool] 玩家数据已保存到存储:`, playerIds);
    } catch (error) {
      console.error(`[MatchPool] 保存玩家数据失败:`, error);
    }
  }

  /**
   * 游戏结束处理
   */
  private async onGameEnded(): Promise<void> {
    console.log(`[MatchPool] 游戏结束，开始等待新玩家...`);
    this.isInGame = false;

    // 清空当前匹配池
    this.playersInPool.clear();

    // 清理存储
    await this.clearStorage();

    // 等待一段时间让等待队列的玩家进入
    if (this.waitingQueue.length > 0) {
      console.log(
        `[MatchPool] 等待队列中有 ${this.waitingQueue.length} 名玩家，等待 ${this.POST_GAME_WAIT_DURATION} 秒...`
      );

      // 使用异步等待
      await this.waitForPlayers();
    }

    // 尝试从等待队列填充
    this.tryFillFromWaitingQueue();
  }

  /**
   * 等待玩家进入
   */
  private async waitForPlayers(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, this.POST_GAME_WAIT_DURATION * 1000);
    });
  }

  /**
   * 从等待队列填充匹配池
   */
  private tryFillFromWaitingQueue(): void {
    while (
      this.playersInPool.size < this.maxPlayers &&
      this.waitingQueue.length > 0
    ) {
      const playerData = this.waitingQueue.shift();
      if (playerData) {
        // 验证玩家实体是否仍然有效
        if (this.isPlayerEntityValid(playerData.playerEntity)) {
          this.playersInPool.set(playerData.userId, playerData);
          console.log(`[MatchPool] 从等待队列添加玩家 ${playerData.userId}`);

          // 通知玩家进入匹配池
          CommunicationMgr.instance.sendTo(
            playerData.playerEntity,
            'matchPool:joined',
            { poolId: this.poolId }
          );
        }
      }
    }

    // 通知UI更新
    this.notifyPoolUpdate();

    // 检查是否可以开始倒计时
    this.checkStartCountdown();
  }

  /**
   * 验证玩家实体是否有效
   */
  private isPlayerEntityValid(playerEntity: GamePlayerEntity): boolean {
    try {
      return playerEntity.player !== null && playerEntity.player !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * 清理存储
   */
  private async clearStorage(): Promise<void> {
    if (!this.matchPoolStorage) {
      return;
    }

    try {
      await this.matchPoolStorage.remove(this.poolId);
      console.log(`[MatchPool] 存储已清理`);
    } catch (error) {
      console.error(`[MatchPool] 清理存储失败:`, error);
    }
  }

  /**
   * 通知所有匹配池玩家UI更新
   */
  private notifyPoolUpdate(): void {
    const players = Array.from(this.playersInPool.values());
    const playerEntities = players.map((p) => p.playerEntity);

    const uiData: MatchPoolUIData = {
      poolId: this.poolId,
      players: players.map((p) => ({
        userId: p.userId,
        name: p.playerEntity.player.name,
      })),
      maxPlayers: this.maxPlayers,
      countdownSeconds: this.countdownRemaining,
      isStarting: this.isCountingDown,
    };

    if (playerEntities.length > 0) {
      CommunicationMgr.instance.sendTo(
        playerEntities,
        'matchPool:update',
        uiData
      );
    }
  }

  update(deltaTime: number) {
    // 倒计时更新
    if (this.isCountingDown) {
      this.countdownRemaining -= deltaTime;

      // 每秒通知一次UI更新
      if (
        Math.floor(this.countdownRemaining) !==
        Math.floor(this.countdownRemaining + deltaTime)
      ) {
        this.notifyPoolUpdate();
      }

      // 倒计时结束，开始游戏
      if (this.countdownRemaining <= 0) {
        this.startGame();
      }
    }
  }

  /**
   * 获取匹配池状态信息（用于调试）
   */
  public getPoolInfo(): string {
    return `MatchPool [${this.poolId}]: ${this.playersInPool.size}/${this.maxPlayers} 玩家, 等待队列: ${this.waitingQueue.length}, 倒计时: ${this.isCountingDown}, 游戏中: ${this.isInGame}`;
  }
}
