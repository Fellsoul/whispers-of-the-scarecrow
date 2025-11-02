import type { QteService } from './QteService';
import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';
import { Animation, waitNextFrame } from '../Animation';

export type UiScreenInstance = UiIndex_screen;

/**
 * QteUI - QTE UI 管理器
 * 负责更新进度条等 UI 元素
 */
export class QteUI {
  /** UI Screen 实例 */
  private uiScreen: UiScreenInstance | null = null;

  /** QTE 服务 */
  private service: QteService;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** loadingBar 容器 */
  private loadingBar: UiBox | null = null;

  /** barBg 背景 */
  private barBg: UiImage | null = null;

  /** barFill 填充条 */
  private barFill: UiImage | null = null;

  /** loadingBar 初始宽度 */
  private loadingBarWidth: number = 0;

  /** barFill 初始宽度 */
  private barFillInitialWidth: number = 0;

  /** 当前进度（0.0 - 1.0） */
  private currentProgress: number = 0;

  /** 填充速度（每秒填充的百分比） */
  private fillRate: number = 0;

  /** 是否正在自动更新 */
  private isAutoUpdating: boolean = false;

  /** 动画取消标志 */
  private cancelAnimation: boolean = false;

  constructor(service: QteService) {
    this.service = service;
  }

  /**
   * 初始化 UI
   */
  public initialize(screen: UiScreenInstance): void {
    if (this.initialized) {
      console.warn('[QteUI] Already initialized');
      return;
    }

    this.uiScreen = screen;

    // 获取 windowMiddleAnchor 中的 loadingBar
    const windowMiddleAnchor = screen.uiBox_windowMiddleAnchor;
    if (!windowMiddleAnchor) {
      console.error('[QteUI] windowMiddleAnchor not found');
      return;
    }

    // 查找 loadingBar
    this.loadingBar = this.findChildByName(windowMiddleAnchor, 'loadingBar') as UiBox | null;
    if (!this.loadingBar) {
      console.error('[QteUI] loadingBar not found in windowMiddleAnchor');
      return;
    }

    // 查找 barBg
    this.barBg = this.findChildByName(this.loadingBar, 'barBg') as UiImage | null;
    if (!this.barBg) {
      console.error('[QteUI] barBg not found in loadingBar');
      return;
    }

    // 查找 barFill
    this.barFill = this.findChildByName(this.loadingBar, 'barFill') as UiImage | null;
    if (!this.barFill) {
      console.error('[QteUI] barFill not found in loadingBar');
      return;
    }

    // 记录初始宽度（使用 offset.x 作为绝对像素宽度）
    this.loadingBarWidth = this.loadingBar.size.offset.x;
    this.barFillInitialWidth = this.barFill.size.offset.x;

    console.log(`[QteUI] Initialized - loadingBar width: ${this.loadingBarWidth}, barFill initial width: ${this.barFillInitialWidth}`);

    // 初始隐藏进度条
    this.loadingBar.visible = false;
    console.log('[QteUI] Loading bar initially hidden');

    this.initialized = true;
  }

  /**
   * 查找子节点
   */
  private findChildByName(parent: UiNode, name: string): UiNode | undefined {
    if (!parent.children) {
      return undefined;
    }

    for (const child of parent.children) {
      if (child.name === name) {
        return child;
      }
      // 递归查找
      const found = this.findChildByName(child, name);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  /**
   * 显示 QTE 开始
   * @param fillRate 填充速度（每秒填充的百分比）
   * @param resumeProgress 恢复的进度（0.0 - 1.0），默认为 0
   */
  public showQteStart(fillRate: number, resumeProgress: number = 0): void {
    if (!this.initialized || !this.loadingBar || !this.barFill) {
      console.warn('[QteUI] Not initialized');
      return;
    }

    if (resumeProgress > 0) {
      console.log(
        `[QteUI] Showing QTE start - resuming from ${(resumeProgress * 100).toFixed(1)}%, fillRate: ${fillRate.toFixed(8)}/ms`
      );
    } else {
      console.log(`[QteUI] Showing QTE start - starting from 0%, fillRate: ${fillRate.toFixed(8)}/ms`);
    }

    // 保存填充速度
    this.fillRate = fillRate;

    // 设置初始进度（如果是恢复，从缓存进度开始）
    this.currentProgress = resumeProgress;
    
    // 立即设置进度条到起始位置
    const startWidth = this.loadingBarWidth * resumeProgress;
    const newOffset = Vec2.create({ x: startWidth, y: this.barFill.size.offset.y });
    this.barFill.size.offset.copy(newOffset);

    // 显示进度条
    this.loadingBar.visible = true;

    // 启动自动更新动画
    this.startAutoUpdate();
  }

  /**
   * 手动设置进度（用于立即更新，无动画）
   * @param progress 进度（0.0 - 1.0）
   */
  private setProgressImmediate(progress: number): void {
    if (!this.initialized || !this.barFill) {
      return;
    }

    // 限制进度范围
    const clampedProgress = Math.max(0, Math.min(1, progress));

    // 计算新的宽度
    const targetWidth = this.loadingBarWidth * clampedProgress;

    // 更新 barFill 宽度
    const newOffset = Vec2.create({ x: targetWidth, y: this.barFill.size.offset.y });
    this.barFill.size.offset.copy(newOffset);
    
    // 更新当前进度
    this.currentProgress = clampedProgress;
  }

  /**
   * 隐藏进度条
   */
  public hideLoadingBar(): void {
    if (!this.initialized || !this.loadingBar) {
      return;
    }

    console.log('[QteUI] Hiding loading bar');
    this.loadingBar.visible = false;
  }

  /**
   * 显示 QTE 完成
   */
  public showQteComplete(success: boolean): void {
    if (!this.initialized) {
      console.warn('[QteUI] Not initialized');
      return;
    }

    console.log(`[QteUI] QTE complete: ${success ? 'success' : 'failed'}`);

    // 停止自动更新
    this.stopAutoUpdate();

    // 如果成功，显示满进度条短暂时间
    if (success) {
      this.setProgressImmediate(1);
      setTimeout(() => {
        this.hideLoadingBar();
      }, 500);
    } else {
      // 失败立即隐藏
      this.hideLoadingBar();
    }
  }

  /**
   * 显示 QTE 取消
   */
  public showQteCancel(): void {
    if (!this.initialized) {
      console.warn('[QteUI] Not initialized');
      return;
    }

    console.log('[QteUI] QTE canceled');
    this.stopAutoUpdate();
    this.hideLoadingBar();
  }

  /**
   * 启动自动更新（使用 Animation 插值）
   */
  private async startAutoUpdate(): Promise<void> {
    if (this.isAutoUpdating) {
      console.warn('[QteUI] Auto update already running');
      return;
    }

    if (!this.barFill) {
      console.error('[QteUI] Cannot start auto update: barFill not found');
      return;
    }

    this.isAutoUpdating = true;
    this.cancelAnimation = false;

    const startProgress = this.currentProgress;
    const targetProgress = 1.0;
    const remainingProgress = targetProgress - startProgress;
    
    // 计算剩余时间（毫秒）- fillRate 是每毫秒填充的百分比
    const durationMs = remainingProgress / this.fillRate;

    console.log(
      `[QteUI] 🎬 Starting animated progress: ${(startProgress * 100).toFixed(1)}% → 100% ` +
      `(${durationMs.toFixed(0)}ms = ${(durationMs / 1000).toFixed(2)}s, fillRate: ${this.fillRate.toFixed(8)}/ms)`
    );

    // 计算目标宽度
    const targetWidth = this.loadingBarWidth * targetProgress;

    try {
      // 使用 Animation.animateWidth 进行平滑插值动画
      // 使用自定义的可中断动画
      await this.animateProgressBar(targetWidth, durationMs);

      if (!this.cancelAnimation) {
        // 动画正常完成
        this.currentProgress = 1.0;
        console.log('[QteUI] ✅ Progress animation completed (100%)');
      } else {
        console.log('[QteUI] ⏸️ Progress animation canceled');
      }
    } catch (error) {
      console.error('[QteUI] Progress animation error:', error);
    } finally {
      this.isAutoUpdating = false;
    }
  }

  /**
   * 可中断的进度条动画
   */
  private async animateProgressBar(targetWidth: number, duration: number): Promise<void> {
    if (!this.barFill) {
      return;
    }

    const startTime = Date.now();
    const endTime = startTime + duration;
    const startWidth = this.barFill.size.offset.x;
    const distanceWidth = targetWidth - startWidth;
    const currentY = this.barFill.size.offset.y;

    let lastLogTime = startTime;
    let frameCount = 0;

    while (Date.now() < endTime && !this.cancelAnimation) {
      frameCount++;
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // 使用线性插值（恒定速度）
      const ease = Animation.linear(progress);
      const currentWidth = startWidth + distanceWidth * ease;
      
      // 更新宽度
      const newOffset = Vec2.create({ x: currentWidth, y: currentY });
      this.barFill.size.offset.copy(newOffset);
      
      // 更新当前进度值
      this.currentProgress = currentWidth / this.loadingBarWidth;

      // 每 500ms 打印一次日志
      if (currentTime - lastLogTime >= 500) {
        console.log(
          `[QteUI] 📊 Progress: ${(this.currentProgress * 100).toFixed(1)}% ` +
          `(${frameCount} frames, ${(elapsed / 1000).toFixed(2)}s elapsed)`
        );
        lastLogTime = currentTime;
      }

      await waitNextFrame();
    }

    // 如果没有被取消，确保最终宽度精确
    if (!this.cancelAnimation && this.barFill) {
      const finalOffset = Vec2.create({ x: targetWidth, y: currentY });
      this.barFill.size.offset.copy(finalOffset);
      this.currentProgress = targetWidth / this.loadingBarWidth;
    }
  }

  /**
   * 停止自动更新
   */
  private stopAutoUpdate(): void {
    if (!this.isAutoUpdating) {
      return;
    }

    console.log('[QteUI] 🛑 Stopping auto update');

    this.cancelAnimation = true;
    this.isAutoUpdating = false;
  }

  /**
   * 销毁
   */
  public destroy(): void {
    this.stopAutoUpdate();
    this.initialized = false;
    this.uiScreen = null;
    this.loadingBar = null;
    this.barBg = null;
    this.barFill = null;
  }
}

