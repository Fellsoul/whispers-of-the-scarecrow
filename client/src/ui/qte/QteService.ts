import type { QteStartData, QteProgressData } from './events';

/**
 * QteService - QTE 服务
 * 负责管理 QTE 交互的数据状态
 */
export class QteService {
  /** 是否正在进行 QTE */
  private isActive: boolean = false;

  /** 当前 QTE 对象 ID */
  private currentObjectId: string | null = null;

  /** 当前 QTE 对象名称 */
  private currentObjectName: string | null = null;

  /** 总时长（秒） */
  private totalDuration: number = 0;

  /** QTE 次数 */
  private qteCount: number = 0;

  /** 当前进度（0.0 - 1.0） */
  private currentProgress: number = 0;

  /** 已用时间（秒） */
  private elapsedTime: number = 0;

  /**
   * 初始化服务
   */
  public initialize(): void {
    this.reset();
    console.log('[QteService] Initialized');
  }

  /**
   * 开始 QTE
   */
  public startQte(data: QteStartData): void {
    this.isActive = true;
    this.currentObjectId = data.objectId;
    this.currentObjectName = data.objectName;
    this.totalDuration = data.totalDuration;
    this.qteCount = data.qteCount;
    this.currentProgress = 0;
    this.elapsedTime = 0;
    
    console.log(`[QteService] QTE started: ${data.objectName} (${data.totalDuration}ms, ${data.qteCount} QTEs) - Progress reset to 0`);
  }

  /**
   * 更新 QTE 进度
   */
  public updateProgress(data: QteProgressData): void {
    if (!this.isActive || this.currentObjectId !== data.objectId) {
      return;
    }

    this.currentProgress = data.progress;
    this.elapsedTime = data.elapsedTime;
    this.totalDuration = data.totalDuration;
  }

  /**
   * 完成或取消 QTE
   */
  public endQte(): void {
    this.reset();
    console.log('[QteService] QTE ended');
  }

  /**
   * 重置状态
   */
  private reset(): void {
    this.isActive = false;
    this.currentObjectId = null;
    this.currentObjectName = null;
    this.totalDuration = 0;
    this.qteCount = 0;
    this.currentProgress = 0;
    this.elapsedTime = 0;
  }

  /**
   * 获取是否活跃
   */
  public getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * 获取当前对象 ID
   */
  public getCurrentObjectId(): string | null {
    return this.currentObjectId;
  }

  /**
   * 获取当前对象名称
   */
  public getCurrentObjectName(): string | null {
    return this.currentObjectName;
  }

  /**
   * 获取总时长
   */
  public getTotalDuration(): number {
    return this.totalDuration;
  }

  /**
   * 获取 QTE 次数
   */
  public getQteCount(): number {
    return this.qteCount;
  }

  /**
   * 获取当前进度
   */
  public getCurrentProgress(): number {
    return this.currentProgress;
  }

  /**
   * 获取已用时间
   */
  public getElapsedTime(): number {
    return this.elapsedTime;
  }
}

