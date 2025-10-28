import { _decorator, Component } from '@dao3fun/component';
import { EventBus } from '../../../core/events/EventBus';
import { CommunicationMgr } from '../../../presentation/CommunicationGateway';
import { Settings } from '../../../Settings';
import mapHrefs from '../../../data/mapHref.json';
import { PlayerManager } from '../../mgr/PlayerManager';
import { MatchPoolManager } from '../../mgr/MatchPoolManager';
import { StorageManager } from '../../mgr/StorageManager';
import { GameMode } from '../../const/enum';

const { apclass } = _decorator;

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
  players: Array<{
    userId: string;
    name: string;
    avatar: string; // 玩家头像 URL
  }>;
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

  // 匹配池编号（用于匹配Readiness地图编号）
  public poolIndex: number = -1;

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

  // 是否在准备阶段
  private isInReadiness: boolean = false;

  // 匹配池跨地图存储
  private matchPoolStorage: GameDataStorage<string[]> | null = null;

  // 角色分配存储
  private roleAssignmentStorage: GameDataStorage<{
    overseers: string[];
    survivors: string[];
  }> | null = null;

  // 当前游戏模式
  private gameMode: GameMode = GameMode.Small;

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
      this.roleAssignmentStorage = storage.getGroupStorage<{
        overseers: string[];
        survivors: string[];
      }>('role_assignment');
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

    // 在MatchPoolManager中注册玩家
    MatchPoolManager.instance.registerPlayerInPool(userId, this);
    // 更新玩家位置到匹配池中心 (先找到真实体)
    const playerOnlineEntity = PlayerManager.instance.getPlayerEntity(userId);
    if (playerOnlineEntity) {
      const offset = Settings.matchPoolCenterOffset;
      playerOnlineEntity.position = this.node.entity.position.add(
        offset as GameVector3
      );
    }

    // 先发送joined事件给新加入的玩家（包含当前玩家ID）
    CommunicationMgr.instance.sendTo(playerEntity, 'matchPool:joined', {
      poolId: this.poolId,
      currentUserId: userId, // 发送当前玩家ID供客户端记录
    });

    // 然后通知所有匹配池玩家UI更新
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

    // 在MatchPoolManager中注销玩家
    MatchPoolManager.instance.unregisterPlayerFromPool(userId);

    // 传送玩家回踏板前位置
    if (this.matchPoolEntrePedalPosition) {
      const targetPosition = this.matchPoolEntrePedalPosition.add(
        Settings.matchPoolPedalTeleportOffset as GameVector3
      );
      playerData.playerEntity.position = targetPosition;
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
    this.isInReadiness = true;
    this.isCountingDown = false;
    console.log(`[MatchPool] 游戏开始！`);

    // 将匹配池玩家数据写入跨地图存储
    await this.savePlayersToStorage();

    // 执行角色分配（加权随机）
    const roleAssignment = await this.assignRoles();

    // 保存角色分配结果到GroupStorage
    await this.saveRoleAssignment(roleAssignment);

    // 通知所有玩家游戏开始（含角色分配）
    const players = Array.from(this.playersInPool.values());
    const playerEntities = players.map((p) => p.playerEntity);

    CommunicationMgr.instance.sendTo(playerEntities, 'matchPool:gameStart', {
      poolId: this.poolId,
      players: players.map((p) => ({
        userId: p.userId,
        name: p.playerEntity.player.name,
        avatar: p.playerEntity.player.avatar || '', // 游戏开始时也包含头像
      })),
      roleAssignment, // 发送角色分配结果给客户端
    });

    // 发送地图跳转指令（使用poolIndex映射到Readiness编号）
    await this.sendMapNavigationCommand(playerEntities);

    // 触发游戏开始事件（由GameManager监听并处理地图切换等逻辑）
    EventBus.instance.emit('matchPool:gameStart', {
      poolId: this.poolId,
      playerEntities,
      roleAssignment,
    });

    this.node.entity.mesh = 'mesh/MatchPoolBaseClosed.vb';
  }

  /**
   * 传送所有玩家到对应的Readiness地图
   */
  private async sendMapNavigationCommand(
    playerEntities: GamePlayerEntity[]
  ): Promise<void> {
    if (this.poolIndex < 0) {
      console.warn(
        `[MatchPool] Invalid poolIndex: ${this.poolIndex}, cannot navigate`
      );
      return;
    }

    const readinessMapKey = `Readiness`;

    console.log(
      `[MatchPool] Teleporting players to ${readinessMapKey} for pool #${this.poolIndex}`
    );

    // 从mapHref.json配置中获取地图ID
    const mapId = mapHrefs[readinessMapKey as keyof typeof mapHrefs];

    if (!mapId) {
      console.error(
        `[MatchPool] Map ID not found for ${readinessMapKey} in mapHref.json`
      );
      return;
    }

    // 过滤出有效的玩家（必须有userId）
    const validPlayers = playerEntities.filter((entity) => {
      const userId = entity.player?.userId;
      return userId && userId !== '' && userId !== '0';
    });

    if (validPlayers.length === 0) {
      console.warn(`[MatchPool] No valid players to teleport`);
      return;
    }

    if (validPlayers.length > 50) {
      console.error(
        `[MatchPool] Too many players (${validPlayers.length}), max 50 allowed`
      );
      return;
    }

    // 使用world.teleport传送所有玩家到新的独立服务器
    try {
      const result = await world.teleport(mapId, validPlayers);
      console.log(
        `[MatchPool] Successfully teleported ${validPlayers.length} players to map ${mapId}, ` +
          `serverId: ${result.serverId}`
      );
    } catch (error) {
      console.error(`[MatchPool] Teleport failed:`, error);
      world.say(`传送失败: ${error}`);
    }
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

          // 通知玩家进入匹配池（包含当前玩家ID）
          CommunicationMgr.instance.sendTo(
            playerData.playerEntity,
            'matchPool:joined',
            {
              poolId: this.poolId,
              currentUserId: playerData.userId, // 发送当前玩家ID供客户端记录
            }
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
   * 角色分配（加权随机）
   * 根据玩家历史怪物率进行加权随机分配Overseer和Survivor
   */
  private async assignRoles(): Promise<{
    overseers: string[];
    survivors: string[];
  }> {
    const players = Array.from(this.playersInPool.values());
    const playerIds = players.map((p) => p.userId);

    // 确定需要的Overseer数量（根据游戏模式）
    const overseerCount = this.gameMode === GameMode.Small ? 1 : 2;
    const survivorCount = playerIds.length - overseerCount;

    console.log(
      `[MatchPool] 开始角色分配: ${overseerCount} Overseer(s), ${survivorCount} Survivor(s)`
    );

    // 获取所有玩家的数据，计算权重
    const playerWeights: Array<{ userId: string; weight: number }> = [];
    const storageManager = StorageManager.instance;

    for (const userId of playerIds) {
      const playerData = await storageManager.getPlayerData(userId);

      if (!playerData) {
        // 如果没有数据，使用默认权重1.0
        playerWeights.push({ userId, weight: 1.0 });
        continue;
      }

      // 计算怪物率（如果没有记录，默认为0）
      const monsterGames = playerData.monsterGames || 0;
      const totalGames = playerData.totalGames || 0;
      const monsterRate = totalGames > 0 ? monsterGames / totalGames : 0;

      // 权重计算：怪物率越低，被选为Overseer的权重越高
      // 公式: weight = 1 - monsterRate
      // 例如：monsterRate=0.2 -> weight=0.8 (更可能被选)
      //      monsterRate=0.8 -> weight=0.2 (不太可能被选)
      const weight = 1 - monsterRate;

      playerWeights.push({ userId, weight: Math.max(0.1, weight) }); // 最小权重0.1，确保每个人都有机会

      console.log(
        `[MatchPool] Player ${userId}: monsterRate=${monsterRate.toFixed(2)}, weight=${weight.toFixed(2)}`
      );
    }

    // 执行加权随机抽取Overseer
    const overseers: string[] = [];
    const remainingPlayers = [...playerWeights];

    for (let i = 0; i < overseerCount; i++) {
      const selected = this.weightedRandomSelect(remainingPlayers);
      if (selected) {
        overseers.push(selected.userId);
        // 从剩余玩家中移除已选中的
        const index = remainingPlayers.findIndex(
          (p) => p.userId === selected.userId
        );
        if (index !== -1) {
          remainingPlayers.splice(index, 1);
        }
      }
    }

    // 剩余玩家为Survivor
    const survivors = remainingPlayers.map((p) => p.userId);

    console.log(
      `[MatchPool] 角色分配完成: Overseers=${overseers.join(',')}, Survivors=${survivors.join(',')}`
    );

    return { overseers, survivors };
  }

  /**
   * 加权随机选择
   * @param items 带权重的项目列表
   */
  private weightedRandomSelect(
    items: Array<{ userId: string; weight: number }>
  ): { userId: string; weight: number } | null {
    if (items.length === 0) {
      return null;
    }

    // 计算总权重
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

    // 生成随机数
    let random = Math.random() * totalWeight;

    // 选择项目
    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item;
      }
    }

    // 如果由于浮点误差没有选中，返回最后一个
    return items[items.length - 1];
  }

  /**
   * 保存角色分配结果到GroupStorage
   */
  private async saveRoleAssignment(roleAssignment: {
    overseers: string[];
    survivors: string[];
  }): Promise<void> {
    if (!this.roleAssignmentStorage) {
      console.warn(`[MatchPool] 角色分配存储未初始化`);
      return;
    }

    try {
      // 使用'current'作为key，简化处理
      await this.roleAssignmentStorage.set('current', roleAssignment);
      console.log(`[MatchPool] 角色分配已保存到存储:`, roleAssignment);
    } catch (error) {
      console.error(`[MatchPool] 保存角色分配失败:`, error);
    }
  }

  /**
   * 通知所有匹配池玩家UI更新
   */
  private notifyPoolUpdate(): void {
    const players = Array.from(this.playersInPool.values());
    const playerEntities = players.map((p) => p.playerEntity);

    if (playerEntities.length === 0) {
      return;
    }

    // 为每个玩家发送个性化的update事件（包含他们自己的userId）
    players.forEach((playerData) => {
      console.log(
        `[MatchPool] 通知玩家 ${playerData.playerEntity.player.avatar} UI更新`
      );
      const uiData: MatchPoolUIData = {
        poolId: this.poolId,
        players: players.map((p) => ({
          userId: p.userId,
          name: p.playerEntity.player.name,
          avatar: p.playerEntity.player.avatar || '', // 获取玩家头像
        })),
        maxPlayers: this.maxPlayers,
        countdownSeconds: this.countdownRemaining,
        isStarting: this.isCountingDown,
      };

      // 为每个玩家的update事件添加currentUserId字段
      const personalizedData = {
        ...uiData,
        currentUserId: playerData.userId, // 告诉客户端当前玩家是谁
      };

      CommunicationMgr.instance.sendTo(
        playerData.playerEntity,
        'matchPool:update',
        personalizedData
      );
    });
  }

  update(deltaTime: number) {
    // 倒计时更新
    if (this.isCountingDown) {
      this.countdownRemaining -= deltaTime;

      // 每1000ms通知一次UI更新
      if (this.countdownRemaining % 1000 < deltaTime) {
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
