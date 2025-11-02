import { Singleton } from '../../core/patterns/Singleton';
import { EventBus } from '../../core/events/EventBus';
import { Logger } from '../../core/utils/Logger';
import i18next from 'i18next';

/**
 * AltarManager - 祭台管理器
 * 负责管理祭台献祭进度和游戏胜利条件
 */
export class AltarManager extends Singleton<AltarManager>() {
  /** 已献祭的南瓜灯数量 */
  private sacrificeCount: number = 0;

  /** 需要献祭的总数 */
  private readonly TOTAL_SACRIFICE_NEEDED = 3;

  /** 事件总线 */
  private eventBus: EventBus = EventBus.instance;

  /** 是否已初始化 */
  private initialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * 初始化祭台管理器
   */
  public initialize(): void {
    if (this.initialized) {
      Logger.warn('[AltarManager] Already initialized');
      return;
    }

    Logger.log('[AltarManager] Initializing...');

    // 重置献祭计数
    this.sacrificeCount = 0;

    // 监听献祭完成事件
    this.eventBus.on<{ userId: string; objectId: string }>('altar:sacrifice_complete', (data) => {
      this.handleSacrificeComplete(data);
    });

    this.initialized = true;
    Logger.log('[AltarManager] Initialized successfully');
  }

  /**
   * 处理献祭完成
   */
  private handleSacrificeComplete(data: { userId: string; objectId: string } | undefined): void {
    if (!data) {
      Logger.error('[AltarManager] Invalid sacrifice complete data');
      return;
    }

    this.sacrificeCount++;
    Logger.log(`[AltarManager] Sacrifice completed by ${data.userId}. Progress: ${this.sacrificeCount}/${this.TOTAL_SACRIFICE_NEEDED}`);

    // 广播进度消息（使用 i18n）
    const progressMessage = (i18next as any).t('altar.progress', { ns: 'common', count: this.sacrificeCount });
    world.say(progressMessage);
    Logger.log(`[AltarManager] Broadcast progress: ${progressMessage}`);

    // 检查是否完成所有献祭
    if (this.sacrificeCount >= this.TOTAL_SACRIFICE_NEEDED) {
      this.triggerVictory();
    }
  }

  /**
   * 触发幸存者胜利
   */
  private triggerVictory(): void {
    Logger.log('[AltarManager] 🎉 All sacrifices completed! Survivors WIN!');

    // 广播胜利消息
    const victoryMessage = (i18next as any).t('altar.victory', { ns: 'common' });
    world.say(victoryMessage);
    Logger.log(`[AltarManager] Victory message: ${victoryMessage}`);

    // 触发游戏结束事件
    this.eventBus.emit('game:end', {
      winner: 'survivors',
      reason: 'altar_completed',
    });
  }

  /**
   * 获取当前献祭进度
   */
  public getSacrificeProgress(): { current: number; total: number } {
    return {
      current: this.sacrificeCount,
      total: this.TOTAL_SACRIFICE_NEEDED,
    };
  }

  /**
   * 重置献祭进度
   */
  public reset(): void {
    this.sacrificeCount = 0;
    Logger.log('[AltarManager] Sacrifice progress reset');
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.eventBus.off('altar:sacrifice_complete');
    this.initialized = false;
    Logger.log('[AltarManager] Destroyed');
  }
}

