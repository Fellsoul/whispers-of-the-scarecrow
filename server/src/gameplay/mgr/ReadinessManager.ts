import { Singleton } from '../../core/patterns/Singleton';
import { EventBus } from '../../core/events/EventBus';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import { CharacterManager } from './CharacterManager';
import { PlayerManager } from './PlayerManager';
import { Settings } from '../../Settings';
import { Logger } from '../../core/utils/Logger';

/**
 * 玩家准备状态
 */
interface PlayerReadyState {
  userId: string;
  isReady: boolean;
  characterId: string;
  readyTime: number; // 准备时的时间戳
}

/**
 * ReadinessManager - 准备场景管理器
 * 负责管理准备场景的倒计时、准备人数统计，并在倒计时结束后触发游戏开始
 */
export class ReadinessManager extends Singleton<ReadinessManager>() {
  /** 玩家准备状态映射表 (userId -> PlayerReadyState) */
  private playerReadyStates: Map<string, PlayerReadyState> = new Map();

  /** 事件总线 */
  private eventBus: EventBus = EventBus.instance;

  /** 通信管理器 */
  private commMgr: CommunicationMgr = CommunicationMgr.instance;

  /** 角色管理器 */
  private charMgr: CharacterManager = CharacterManager.instance;

  /** 玩家管理器 */
  private playerMgr: PlayerManager = PlayerManager.instance;

  /** 倒计时总时长（毫秒） */
  private readonly COUNTDOWN_DURATION = Settings.readyCountdownDuration;

  /** 快照广播间隔（毫秒） */
  private readonly SNAPSHOT_INTERVAL = 1000;

  /** 倒计时剩余时间（毫秒） */
  private countdownRemaining: number = 0;

  /** 是否正在倒计时 */
  private isCountingDown: boolean = false;

  /** 是否所有人已传送就位 */
  private isAllTeleported: boolean = true;

  /** 游戏是否已开始 */
  private isGameStarted: boolean = false;

  /** 倒计时计时器 */
  private countdownTimer: number | null = null;

  /** 快照广播计时器 */
  private snapshotTimer: number | null = null;

  /** 最后一次广播时间 */
  private lastSnapshotTime: number = 0;

  constructor() {
    super();
  }

  /**
   * 初始化准备场景管理器
   */
  public initialize(): void {
    
    // 订阅客户端事件
    this.subscribeClientEvents();
    
    // 开始倒计时
    this.startCountdown();
    
    // 开始定期广播快照
    this.startSnapshotBroadcast();
    
  }

  /**
   * 订阅客户端事件
   */
  private subscribeClientEvents(): void {
    // 监听玩家准备状态变化
    this.eventBus.on('readiness:player:state', (data: unknown) => {
      const eventData = data as { isReady: boolean; characterId: string; _senderEntity?: GameEntity };
      const userId = eventData._senderEntity?.player?.userId;
      
      if (!userId) {
        Logger.warn('[ReadinessManager] Ready state event without valid userId');
        return;
      }

      this.handlePlayerReadyStateChange(userId, eventData.isReady, eventData.characterId);
    });

  }

  /**
   * 处理玩家准备状态变化
   * @param userId 玩家ID
   * @param isReady 是否准备
   * @param characterId 角色ID
   */
  private handlePlayerReadyStateChange(
    userId: string,
    isReady: boolean,
    characterId: string
  ): void {
    if (this.isGameStarted) {
      return;
    }

    const state: PlayerReadyState = {
      userId,
      isReady,
      characterId,
      readyTime: Date.now(),
    };

    this.playerReadyStates.set(userId, state);

    // 立即广播一次快照
    this.broadcastSnapshot();

    // 检查是否所有人都准备好
    if (this.checkAllReady()) {
      this.forceGameStart();
    }
  }

  /**
   * 开始倒计时
   */
  private startCountdown(): void {
    if (this.isCountingDown) {
      Logger.warn('[ReadinessManager] Countdown already running');
      return;
    }

    this.isCountingDown = true;
    this.countdownRemaining = this.COUNTDOWN_DURATION;


    // 使用setInterval每秒更新倒计时
    this.countdownTimer = setInterval(() => {
      this.countdownRemaining -= 1000;

      if (this.countdownRemaining <= 0) {
        this.onCountdownEnd();
      }
    }, 1000);
  }

  /**
   * 停止倒计时
   */
  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.isCountingDown = false;
  }

  /**
   * 倒计时结束处理
   */
  private onCountdownEnd(): void {
    this.stopCountdown();
    this.countdownRemaining = 0;
    
    // 触发游戏开始
    this.startGame();
  }

  /**
   * 开始定期广播快照
   */
  private startSnapshotBroadcast(): void {
    this.lastSnapshotTime = Date.now();

    this.snapshotTimer = setInterval(() => {
      this.broadcastSnapshot();
    }, this.SNAPSHOT_INTERVAL);

  }

  /**
   * 停止快照广播
   */
  private stopSnapshotBroadcast(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  /**
   * 广播准备快照给所有客户端
   */
  private broadcastSnapshot(): void {
    const totalPlayers = this.playerMgr.getOnlinePlayerCount();
    const preparedPlayers = this.getPreparedPlayerCount();
    const countdownSec = Math.max(0, Math.ceil(this.countdownRemaining / 1000));

    const snapshotData = {
      totalPlayers,
      preparedPlayers,
      isAllTeleported: this.isAllTeleported,
      countdownSec: this.isCountingDown ? countdownSec : null,
      forceStart: false,
    };

    // 广播给所有在线玩家
    this.commMgr.sendBroad('readiness:snapshot', snapshotData);

    this.lastSnapshotTime = Date.now();
  }

  /**
   * 获取已准备玩家数量
   */
  private getPreparedPlayerCount(): number {
    let count = 0;
    const readyPlayers: string[] = [];
    const notReadyPlayers: string[] = [];
    
    for (const [userId, state] of this.playerReadyStates) {
      if (state.isReady) {
        count++;
        readyPlayers.push(userId);
      } else {
        notReadyPlayers.push(userId);
      }
    }
    
    return count;
  }

  /**
   * 检查是否所有人都准备好
   */
  private checkAllReady(): boolean {
    const preparedPlayers = this.getPreparedPlayerCount();

    // 至少需要1个玩家，且所有人都准备好
    return preparedPlayers === 5;
  }

  /**
   * 强制开始游戏（所有人准备好时调用）
   */
  private forceGameStart(): void {
    if (this.isGameStarted) {
      return;
    }

    this.stopCountdown();
    this.startGame();
  }

  /**
   * 开始游戏
   * 这个逻辑与MatchPool的传送不同，这里是内部游戏开始
   */
  private startGame(): void {
    if (this.isGameStarted) {
      Logger.warn('[ReadinessManager] Game already started');
      return;
    }

    this.isGameStarted = true;

    // 停止快照广播
    this.stopSnapshotBroadcast();

    // 通知客户端开始过渡：显示黑幕并隐藏Readiness UI
    this.commMgr.sendBroad('readiness:game:start', {
      gameStarting: true,
      fadeInDuration: 500, // 黑幕渐显时长
      holdDuration: 2000, // 黑幕停留时长
      fadeOutDuration: 1000, // 黑幕渐隐时长
    });

    // 延迟触发服务端游戏初始化（在黑幕显示完成后）
    setTimeout(() => {
      this.triggerServerGameInitialization();
    }, 600); // 稍微延迟，让黑幕先显示
  }

  /**
   * 触发服务端游戏初始化
   */
  private triggerServerGameInitialization(): void {
    Logger.log('[ReadinessManager] Triggering server game initialization');

    // 获取所有在线玩家ID
    const onlinePlayerIds = this.playerMgr.getOnlinePlayerIds();
    Logger.log(`[ReadinessManager] Found ${onlinePlayerIds.length} online players`);

    // 构建完整的玩家状态列表（包括未准备的玩家）
    const allPlayerStates: PlayerReadyState[] = onlinePlayerIds.map((userId) => {
      // 如果玩家在 playerReadyStates 中，使用其状态
      const existingState = this.playerReadyStates.get(userId);
      if (existingState) {
        Logger.log(`[ReadinessManager] Player ${userId}: Using existing state (Ready: ${existingState.isReady}, Character: ${existingState.characterId})`);
        return existingState;
      }

      // 否则，创建一个默认状态（未准备）
      // 从 CharacterManager 获取玩家的角色信息
      const characterState = this.charMgr.getCharacterState(userId);
      const characterId = characterState?.character.id || 'char_survivor_01'; // 默认角色

      const defaultState: PlayerReadyState = {
        userId,
        isReady: false, // 默认未准备
        characterId,
        readyTime: 0,
      };

      Logger.log(`[ReadinessManager] Player ${userId}: Creating default state (Character: ${characterId}) - NOT READY`);
      return defaultState;
    });

    Logger.log(`[ReadinessManager] Total player states: ${allPlayerStates.length}`);
    Logger.log(`[ReadinessManager] Ready players: ${this.getPreparedPlayerCount()}`);

    // 触发内部游戏开始事件（GameManager监听此事件）
    this.eventBus.emit('game:start', {
      totalPlayers: onlinePlayerIds.length,
      readyPlayers: this.getPreparedPlayerCount(),
      playerStates: allPlayerStates,
    });

    Logger.log('[ReadinessManager] Game start event emitted to GameManager');
  }

  /**
   * 获取指定玩家的准备状态
   * @param userId 玩家ID
   */
  public getPlayerReadyState(userId: string): PlayerReadyState | null {
    return this.playerReadyStates.get(userId) || null;
  }

  /**
   * 获取所有玩家的准备状态
   */
  public getAllPlayerReadyStates(): PlayerReadyState[] {
    return Array.from(this.playerReadyStates.values());
  }

  /**
   * 重置管理器状态
   */
  public reset(): void {
    
    this.stopCountdown();
    this.stopSnapshotBroadcast();
    
    this.playerReadyStates.clear();
    this.countdownRemaining = 0;
    this.isCountingDown = false;
    this.isGameStarted = false;
    
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    Logger.log('[ReadinessManager] Disposing...');
    
    this.reset();
    
    Logger.log('[ReadinessManager] Disposed');
  }
}
