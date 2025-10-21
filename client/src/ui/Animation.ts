/**
 * 动画辅助类
 * 提供基于时间的动画功能
 */

// FrameRequestCallback 类型定义
type FrameRequestCallback = (time: number) => void;

// 全局类型定义
type GlobalLike = {
  requestAnimationFrame?: (cb: FrameRequestCallback) => number;
  setTimeout: (handler: () => void, timeout?: number) => number;
  performance?: { now: () => number };
};

/**
 * 获取全局对象
 */
function getGlobal(): GlobalLike {
  return globalThis as unknown as GlobalLike;
}

/**
 * requestAnimationFrame 的安全包装，在非 DOM 环境中回退到 setTimeout
 */
export const raf: (cb: FrameRequestCallback) => number =
  typeof globalThis !== 'undefined' &&
  typeof getGlobal().requestAnimationFrame === 'function'
    ? (cb: FrameRequestCallback) => getGlobal().requestAnimationFrame!(cb)
    : (cb: FrameRequestCallback) =>
        getGlobal().setTimeout(
          () =>
            cb(
              getGlobal().performance?.now
                ? getGlobal().performance!.now()
                : Date.now()
            ),
          16
        );

/**
 * 等待下一帧
 */
export function waitNextFrame(): Promise<number> {
  return new Promise((resolve) => {
    raf((t: number) => resolve(t));
  });
}

/**
 * 缓动函数：EaseInOutQuad
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

export class Animation {
  /**
   * 动画：位置移动
   */
  static async animatePosition(
    element: { position: { offset: { x: number; y: number } } },
    targetX: number,
    targetY: number,
    duration: number
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + duration;

    // 使用元素的实际当前位置作为动画起点
    const actualStartX = element.position.offset.x;
    const actualStartY = element.position.offset.y;

    const distanceX = targetX - actualStartX;
    const distanceY = targetY - actualStartY;

    while (Date.now() < endTime) {
      const progress = (Date.now() - startTime) / duration;
      const ease = easeInOutQuad(progress);
      element.position.offset.x = actualStartX + distanceX * ease;
      element.position.offset.y = actualStartY + distanceY * ease;
      await waitNextFrame();
    }

    // 确保最终位置精确
    element.position.offset.x = targetX;
    element.position.offset.y = targetY;
  }

  /**
   * 动画：透明度渐变
   */
  static async animateOpacity(
    element: { imageOpacity: number },
    targetOpacity: number,
    duration: number
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + duration;

    // 使用元素的实际当前透明度作为动画起点
    const actualStartOpacity = element.imageOpacity || 0;
    const distanceOpacity = targetOpacity - actualStartOpacity;

    while (Date.now() < endTime) {
      const progress = (Date.now() - startTime) / duration;
      const ease = easeInOutQuad(progress);
      element.imageOpacity = actualStartOpacity + distanceOpacity * ease;
      await waitNextFrame();
    }

    // 确保最终透明度精确
    element.imageOpacity = targetOpacity;
  }

  /**
   * 延迟
   */
  static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 动画序列：按顺序执行多个动画
   */
  static async sequence(...animations: (() => Promise<void>)[]): Promise<void> {
    for (const animation of animations) {
      await animation();
    }
  }

  /**
   * 动画并行：同时执行多个动画
   */
  static async parallel(...animations: (() => Promise<void>)[]): Promise<void> {
    await Promise.all(animations.map((anim) => anim()));
  }
}
