/**
 * ScrollAnimator - 卷轴切换动画器（无业务逻辑，只管动画）
 */

import type { ScrollDirection, AnimationConfig } from './types';
import { waitNextFrame, easeInOutQuad } from '../Animation';

export class ScrollAnimator {
  private config: AnimationConfig;
  private isAnimating: boolean = false;
  private contentGroup: UiBox | null = null;

  constructor(contentGroup: UiBox | null) {
    this.contentGroup = contentGroup;
    this.config = {
      durationSlide: 400, // 400ms滑动时间
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', // Material Design标准缓动
      offscreenX: screenHeight + 100, // 完全离屏位置（竖向滑动用Y轴）
    };
  }

  /**
   * 设置动画内容组
   */
  setContentGroup(contentGroup: UiBox | null): void {
    this.contentGroup = contentGroup;
  }

  /**
   * 执行滑动动画
   * @param direction 滑动方向
   * @param onCommitIndex 在离屏瞬间回调，用于更新索引和数据
   */
  async slide(
    direction: ScrollDirection,
    onCommitIndex: () => void
  ): Promise<void> {
    if (this.isAnimating) {
      console.warn('[ScrollAnimator] Animation in progress, ignoring request');
      return;
    }

    if (!this.contentGroup) {
      console.error('[ScrollAnimator] contentGroup not set');
      return;
    }

    this.isAnimating = true;

    try {
      // 竖向滑动：next向下滑出，prev向上滑出
      const exitY =
        direction === 'next' ? this.config.offscreenX : -this.config.offscreenX;
      const enterY =
        direction === 'next' ? -this.config.offscreenX : this.config.offscreenX;

      // 第一阶段：滑出到离屏位置
      await this.animateTransform(
        this.contentGroup,
        0,
        exitY,
        this.config.durationSlide
      );

      // 在离屏瞬间回调，更新数据
      onCommitIndex();

      // 立刻传送到另一侧
      this.setPosition(this.contentGroup, enterY);

      // 第二阶段：从另一侧滑入到中心
      await this.animateTransform(
        this.contentGroup,
        enterY,
        0,
        this.config.durationSlide
      );
    } catch (error) {
      console.error('[ScrollAnimator] Animation error:', error);
    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 动画变换位置（竖向滑动，使用Y轴）
   */
  private async animateTransform(
    element: UiBox,
    fromY: number,
    toY: number,
    duration: number
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + duration;
    const startY = fromY;
    const deltaY = toY - fromY;

    while (Date.now() < endTime) {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用Animation.ts的缓动函数
      const eased = easeInOutQuad(progress);
      const currentY = startY + deltaY * eased;

      this.setPosition(element, currentY);

      await waitNextFrame();
    }

    // 确保最终位置精确
    this.setPosition(element, toY);
  }

  /**
   * 设置元素Y位置（使用position.offset.y，竖向滑动）
   */
  private setPosition(element: UiBox, y: number): void {
    if (element && element.position && element.position.offset) {
      element.position.offset.y = y;
    }
  }

  /**
   * 检查是否正在动画
   */
  isPlaying(): boolean {
    return this.isAnimating;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
