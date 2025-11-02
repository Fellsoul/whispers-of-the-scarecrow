import { EventBus } from '../../core/events/EventBus';
import { QteService } from './QteService';
import { QteUI } from './QteUI';
import type { UiScreenInstance } from './QteUI';
import type {
  QteStartData,
  QteProgressData,
  QteCompleteData,
  QteCancelData,
  QteQteTriggeredData,
} from './events';
import {
  QTE_START,
  QTE_PROGRESS,
  QTE_COMPLETE,
  QTE_CANCEL,
  QTE_QTE_TRIGGERED,
} from './events';

/**
 * QteUIController - QTE UI 控制器
 * 负责协调 Service、UI 和服务端通信
 */
export class QteUIController {
  /** 可选的 dispose 方法（用于 UIModule 接口兼容） */
  public dispose?(): void;
  /** QTE 服务 */
  private service: QteService;

  /** QTE UI */
  private ui: QteUI;

  /** 事件总线 */
  private eventBus: EventBus;

  /** 是否已初始化 */
  private initialized: boolean = false;

  constructor() {
    this.service = new QteService();
    this.ui = new QteUI(this.service);
    this.eventBus = EventBus.instance;
  }

  /**
   * 初始化控制器
   */
  public initialize(screen: UiScreenInstance): void {
    if (this.initialized) {
      console.warn('[QteUIController] Already initialized');
      return;
    }

    this.service.initialize();
    this.ui.initialize(screen);
    this.setupEventListeners();

    this.initialized = true;
    console.log('[QteUIController] Initialized');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听 QTE 开始事件
    this.eventBus.on(QTE_START, this.handleQteStart.bind(this));

    // 监听 QTE 进度更新事件
    this.eventBus.on(QTE_PROGRESS, this.handleQteProgress.bind(this));

    // 监听 QTE 完成事件
    this.eventBus.on(QTE_COMPLETE, this.handleQteComplete.bind(this));

    // 监听 QTE 取消事件
    this.eventBus.on(QTE_CANCEL, this.handleQteCancel.bind(this));

    // 监听 QTE QTE 触发事件（可选，用于显示 QTE 提示）
    this.eventBus.on(QTE_QTE_TRIGGERED, this.handleQteTriggered.bind(this));

    console.log('[QteUIController] Event listeners setup');
  }

  /**
   * 处理 QTE 开始事件
   */
  private handleQteStart(data?: QteStartData): void {
    if (!data) {
      console.warn('[QteUIController] Received empty QTE start data');
      return;
    }

    const resumeProgress = data.resumeProgress || 0;
    if (resumeProgress > 0) {
      console.log(
        `[QteUIController] QTE resumed: ${data.objectName}, progress: ${(resumeProgress * 100).toFixed(1)}%, ` +
        `duration: ${data.totalDuration}ms, fillRate: ${data.fillRate.toFixed(8)}/ms`
      );
    } else {
      console.log(
        `[QteUIController] QTE started: ${data.objectName}, duration: ${data.totalDuration}ms, fillRate: ${data.fillRate.toFixed(8)}/ms`
      );
    }
    
    this.service.startQte(data); // 重置 service 数据
    this.ui.showQteStart(data.fillRate, resumeProgress); // 传递填充速度和恢复进度
  }

  /**
   * 处理 QTE 进度更新事件
   * 注意：现在进度由客户端自动更新，不再从服务端接收
   */
  private handleQteProgress(data?: QteProgressData): void {
    if (!data) {
      console.warn('[QteUIController] Received empty QTE progress data');
      return;
    }

    // 更新服务数据
    this.service.updateProgress(data);

    // UI 进度现在由 Animation 自动更新，不需要手动设置
  }

  /**
   * 处理 QTE 完成事件
   */
  private handleQteComplete(data?: QteCompleteData): void {
    if (!data) {
      console.warn('[QteUIController] Received empty QTE complete data');
      return;
    }

    console.log(`[QteUIController] QTE complete: ${data.success ? 'success' : 'failed'}`);
    this.service.endQte();
    this.ui.showQteComplete(data.success);
  }

  /**
   * 处理 QTE 取消事件
   */
  private handleQteCancel(data?: QteCancelData): void {
    if (!data) {
      console.warn('[QteUIController] Received empty QTE cancel data');
      return;
    }

    if (data.savedProgress !== undefined && data.savedProgress > 0) {
      console.log(
        `[QteUIController] QTE canceled - progress saved: ${(data.savedProgress * 100).toFixed(1)}%`
      );
    } else {
      console.log('[QteUIController] QTE canceled');
    }
    
    this.service.endQte();
    this.ui.showQteCancel();
  }

  /**
   * 处理 QTE QTE 触发事件（可选）
   */
  private handleQteTriggered(data?: QteQteTriggeredData): void {
    if (!data) {
      console.warn('[QteUIController] Received empty QTE QTE triggered data');
      return;
    }

    console.log(`[QteUIController] QTE triggered: ${data.qteIndex + 1}/${data.totalQteCount}`);
    
    // 这里可以添加 QTE 提示动画或音效
    // TODO: 实现 QTE 判定窗口 UI
  }
}

