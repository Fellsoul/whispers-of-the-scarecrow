import { Singleton } from '../../core/patterns/Singleton';
import { EventBus } from '../../core/events/EventBus';
import { PlayerManager } from './PlayerManager';
import { CharacterManager } from './CharacterManager';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import { Logger } from '../../core/utils/Logger';

/**
 * 心跳管理器 - 根据 Overseer 距离控制 Survivor 的心跳动画
 * 
 * 距离区间：
 * - >= 96: 无心跳 (zone 0)
 * - < 96: 慢速心跳 (zone 1)
 * - < 64: 中速心跳 (zone 2)
 * - < 32: 快速心跳 (zone 3)
 */
export class HeartbeatManager extends Singleton<HeartbeatManager>() {
  /** 距离区间定义 */
  private readonly DISTANCE_ZONES = {
    SAFE: 96,      // >= 96: 安全区，无心跳
    CAUTION: 64,   // < 96: 警戒区，慢速心跳
    DANGER: 32,    // < 64: 危险区，中速心跳
    CRITICAL: 0,   // < 32: 极危区，快速心跳
  };

  /** 每个 Survivor 当前所在的距离区间 */
  private survivorZones: Map<string, number> = new Map();

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 更新间隔（毫秒） */
  private readonly UPDATE_INTERVAL = 500;

  /** 更新定时器 */
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  /** 事件总线 */
  private eventBus: EventBus = EventBus.instance;

  /** 通信管理器 */
  private commMgr: CommunicationMgr = CommunicationMgr.instance;

  constructor() {
    super();
  }

  /**
   * 初始化心跳管理器
   */
  public initialize(): void {
    if (this.initialized) {
      Logger.warn('[HeartbeatManager] Already initialized');
      return;
    }

    Logger.log('[HeartbeatManager] Initializing...');

    // 启动定时更新
    this.startUpdateLoop();

    this.initialized = true;
    Logger.log('[HeartbeatManager] Initialized successfully');
  }

  /**
   * 启动更新循环
   */
  private startUpdateLoop(): void {
    this.updateTimer = setInterval(() => {
      this.updateAllSurvivorHeartbeats();
    }, this.UPDATE_INTERVAL);

    Logger.log(`[HeartbeatManager] Update loop started (interval: ${this.UPDATE_INTERVAL}ms)`);
  }

  /**
   * 更新所有 Survivor 的心跳状态
   */
  private updateAllSurvivorHeartbeats(): void {
    const onlinePlayerIds = PlayerManager.instance.getOnlinePlayerIds();

    // 获取所有 Survivor 和 Overseer
    const survivors: string[] = [];
    const overseers: string[] = [];

    onlinePlayerIds.forEach((userId) => {
      const characterState = CharacterManager.instance.getCharacterState(userId);
      if (!characterState) return;

      if (characterState.character.faction === 'Survivor') {
        survivors.push(userId);
      } else if (characterState.character.faction === 'Overseer') {
        overseers.push(userId);
      }
    });

    // 如果没有 Overseer 或没有 Survivor，清空所有心跳
    if (overseers.length === 0 || survivors.length === 0) {
      survivors.forEach((survivorId) => {
        this.updateSurvivorZone(survivorId, 0); // Zone 0 = 无心跳
      });
      return;
    }

    // 计算每个 Survivor 到最近 Overseer 的距离
    survivors.forEach((survivorId) => {
      const minDistance = this.getDistanceToNearestOverseer(survivorId, overseers);
      
      if (minDistance === null) {
        this.updateSurvivorZone(survivorId, 0);
        return;
      }

      // 根据距离判断区间
      const newZone = this.getZoneFromDistance(minDistance);
      this.updateSurvivorZone(survivorId, newZone);
    });
  }

  /**
   * 获取 Survivor 到最近 Overseer 的距离
   */
  private getDistanceToNearestOverseer(
    survivorId: string,
    overseers: string[]
  ): number | null {
    const survivorInfo = PlayerManager.instance.getOnlinePlayer(survivorId);
    if (!survivorInfo || !survivorInfo.entity) {
      return null;
    }

    const survivorPos = survivorInfo.entity.position;
    let minDistance = Infinity;

    overseers.forEach((overseerId) => {
      const overseerInfo = PlayerManager.instance.getOnlinePlayer(overseerId);
      if (!overseerInfo || !overseerInfo.entity) {
        return;
      }

      const overseerPos = overseerInfo.entity.position;

      // 计算 XZ 平面距离（忽略 Y 轴）
      const dx = overseerPos.x - survivorPos.x;
      const dz = overseerPos.z - survivorPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < minDistance) {
        minDistance = distance;
      }
    });

    return minDistance === Infinity ? null : minDistance;
  }

  /**
   * 根据距离获取区间编号
   * @returns 0 = 无心跳, 1 = 慢速, 2 = 中速, 3 = 快速
   */
  private getZoneFromDistance(distance: number): number {
    if (distance >= this.DISTANCE_ZONES.SAFE) {
      return 0; // 安全区
    } else if (distance >= this.DISTANCE_ZONES.CAUTION) {
      return 1; // 警戒区
    } else if (distance >= this.DISTANCE_ZONES.DANGER) {
      return 2; // 危险区
    } else {
      return 3; // 极危区
    }
  }

  /**
   * 更新 Survivor 的心跳区间
   * 只在区间切换时发送事件
   */
  private updateSurvivorZone(survivorId: string, newZone: number): void {
    const currentZone = this.survivorZones.get(survivorId) ?? 0;

    // 只在区间切换时发送事件
    if (currentZone !== newZone) {
      this.survivorZones.set(survivorId, newZone);

      // 发送心跳区间变化事件到客户端
      this.commMgr.sendTo(PlayerManager.instance.getPlayerEntity(survivorId) as GamePlayerEntity, 'heartbeat:zone:changed', {
        zone: newZone,
      });

      Logger.log(
        `[HeartbeatManager] 💓 Survivor ${survivorId} zone changed: ${currentZone} -> ${newZone}`
      );
    }
  }

  /**
   * 重置所有 Survivor 的心跳状态
   */
  public reset(): void {
    this.survivorZones.clear();
    Logger.log('[HeartbeatManager] Reset all survivor zones');
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    Logger.log('[HeartbeatManager] Destroying...');

    // 停止更新循环
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // 清空状态
    this.survivorZones.clear();

    this.initialized = false;
    Logger.log('[HeartbeatManager] Destroyed');
  }
}

