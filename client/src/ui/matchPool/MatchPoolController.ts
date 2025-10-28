/**
 * MatchPool Controller - 匹配池控制器
 */

import { EventBus } from '../../core/events/EventBus';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import type { MatchPoolUI } from './MatchPoolUI';
import {
  MatchPoolEvents,
  type MatchPoolUpdateData,
  type MatchPoolJoinedData,
  type MatchPoolLeftData,
  type MatchPoolGameStartData,
  type MatchPoolWaitingQueueData,
} from './events';

export class MatchPoolController {
  private matchPoolUI: MatchPoolUI;
  private eventBus: EventBus;
  private communicationMgr: CommunicationMgr;

  // 存储当前玩家ID（从服务端事件中获取）
  private currentUserId: string | null = null;

  constructor(matchPoolUI: MatchPoolUI) {
    this.matchPoolUI = matchPoolUI;
    this.eventBus = EventBus.instance;
    this.communicationMgr = CommunicationMgr.instance;
  }

  /**
   * 初始化控制器，设置事件监听
   */
  initialize(): void {
    console.log('[MatchPoolController] Initializing...');

    // 监听服务端事件
    this.setupServerEventListeners();

    // 设置UI元素的点击事件
    this.setupClickHandlers();

    console.log('[MatchPoolController] Initialized');
  }

  /**
   * 设置服务端事件监听
   */
  private setupServerEventListeners(): void {
    // 监听匹配池更新事件
    this.eventBus.on<MatchPoolUpdateData>(
      MatchPoolEvents.UPDATE,
      this.handlePoolUpdate.bind(this)
    );

    // 监听加入匹配池事件
    this.eventBus.on<MatchPoolJoinedData>(
      MatchPoolEvents.JOINED,
      this.handleJoined.bind(this)
    );

    // 监听离开匹配池事件
    this.eventBus.on<MatchPoolLeftData>(
      MatchPoolEvents.LEFT,
      this.handleLeft.bind(this)
    );

    // 监听游戏开始事件
    this.eventBus.on<MatchPoolGameStartData>(
      MatchPoolEvents.GAME_START,
      this.handleGameStart.bind(this)
    );

    // 监听等待队列事件
    this.eventBus.on<MatchPoolWaitingQueueData>(
      MatchPoolEvents.WAITING_QUEUE,
      this.handleWaitingQueue.bind(this)
    );

    console.log('[MatchPoolController] Server event listeners registered');
  }

  /**
   * 设置点击事件处理
   */
  private setupClickHandlers(): void {
    // cancelButton 点击 - 请求离开匹配池
    const cancelButton = this.matchPoolUI.getCancelButton();
    if (cancelButton) {
      cancelButton.events.on('pointerdown', () => {
        console.log('[MatchPoolController] CancelButton clicked');
        this.handleCancelClick();
      });
      console.log(
        '[MatchPoolController] CancelButton click handler registered'
      );
    }
  }

  /**
   * 处理匹配池更新事件
   */
  private handlePoolUpdate(data?: MatchPoolUpdateData): void {
    if (!data) {
      console.warn('[MatchPoolController] Received empty pool update data');
      return;
    }

    // 从服务端事件中提取并存储当前玩家ID
    if (data.currentUserId) {
      this.currentUserId = data.currentUserId;
      console.log(
        `[MatchPoolController] Current player ID stored: ${this.currentUserId}`
      );
    }

    console.log('[MatchPoolController] Pool update received:', data);
    this.matchPoolUI.updatePool(data);
  }

  /**
   * 处理加入匹配池事件
   */
  private handleJoined(data?: MatchPoolJoinedData): void {
    if (!data) {
      console.warn('[MatchPoolController] Received empty joined data');
      return;
    }

    // 从服务端事件中提取并存储当前玩家ID
    if (data.currentUserId) {
      this.currentUserId = data.currentUserId;
      console.log(
        `[MatchPoolController] Current player ID stored on join: ${this.currentUserId}`
      );
    }

    console.log('[MatchPoolController] Joined match pool:', data.poolId);
    this.matchPoolUI.show();
  }

  /**
   * 处理离开匹配池事件
   */
  private handleLeft(data?: MatchPoolLeftData): void {
    if (!data) {
      console.warn('[MatchPoolController] Received empty left data');
      return;
    }

    console.log('[MatchPoolController] Left match pool:', data.poolId);

    // 离开匹配池时清除当前玩家ID
    this.currentUserId = null;
    console.log('[MatchPoolController] Current player ID cleared');

    this.matchPoolUI.hide();
  }

  /**
   * 处理游戏开始事件
   * 注意：玩家传送由服务端通过player.link()完成
   */
  private handleGameStart(data?: MatchPoolGameStartData): void {
    if (!data) {
      console.warn('[MatchPoolController] Received empty game start data');
      return;
    }

    console.log('[MatchPoolController] Game starting:', data);

    // 游戏开始时隐藏匹配池UI
    // 玩家将由服务端自动传送到Readiness地图
    this.matchPoolUI.hide();
  }

  /**
   * 处理等待队列事件
   */
  private handleWaitingQueue(data?: MatchPoolWaitingQueueData): void {
    if (!data) {
      console.warn('[MatchPoolController] Received empty waiting queue data');
      return;
    }

    console.log(
      `[MatchPoolController] In waiting queue: position ${data.position}`
    );

    // TODO: 显示等待队列UI
    // 可以显示类似 "等待中... 队列位置: X" 的提示
  }

  /**
   * 处理取消按钮点击
   */
  private handleCancelClick(): void {
    const poolId = this.matchPoolUI.getCurrentPoolId();
    if (!poolId) {
      console.warn('[MatchPoolController] No active pool to leave');
      return;
    }

    // 获取当前玩家的userId
    // 注意：这里需要从某个地方获取当前玩家的userId
    // 可能需要从PlayerManager或其他管理器获取
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('[MatchPoolController] Cannot get current user ID');
      return;
    }

    console.log(`[MatchPoolController] Requesting to leave pool: ${poolId}`);

    // 发送离开匹配池请求到服务端
    this.communicationMgr.send(MatchPoolEvents.CLIENT_LEAVE, {
      userId,
      poolId,
    });
  }

  /**
   * 获取当前玩家的userId
   * 优先使用从服务端事件中存储的ID
   */
  private getCurrentUserId(): string | null {
    // 优先使用已存储的currentUserId
    if (this.currentUserId) {
      return this.currentUserId;
    }

    // 备用方案：尝试从全局player对象获取
    try {
      const globalPlayer = (
        globalThis as unknown as { player?: { userId?: string } }
      ).player;
      if (globalPlayer && globalPlayer.userId) {
        return globalPlayer.userId;
      }
    } catch (error) {
      console.error(
        '[MatchPoolController] Error getting user ID from global:',
        error
      );
    }

    console.warn('[MatchPoolController] Could not get current user ID');
    return null;
  }

  /**
   * 获取存储的当前玩家ID（公开方法）
   */
  public getCurrentPlayerUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    // 移除所有事件监听
    this.eventBus.off(MatchPoolEvents.UPDATE, this.handlePoolUpdate.bind(this));
    this.eventBus.off(MatchPoolEvents.JOINED, this.handleJoined.bind(this));
    this.eventBus.off(MatchPoolEvents.LEFT, this.handleLeft.bind(this));
    this.eventBus.off(
      MatchPoolEvents.GAME_START,
      this.handleGameStart.bind(this)
    );
    this.eventBus.off(
      MatchPoolEvents.WAITING_QUEUE,
      this.handleWaitingQueue.bind(this)
    );

    console.log('[MatchPoolController] Destroyed');
  }
}
