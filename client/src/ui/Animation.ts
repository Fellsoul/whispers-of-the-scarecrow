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

  /**
   * 渐入动画 (Fade In)
   * 将元素的alpha或backgroundOpacity从当前值渐变到1（完全不透明）
   * @param element 任何具有alpha或backgroundOpacity属性的UI元素
   * @param duration 动画时长（毫秒）
   * @param useBackground 是否使用backgroundOpacity（默认使用alpha）
   */
  static async fadeIn(
    element: { alpha?: number; backgroundOpacity?: number },
    duration: number,
    useBackground: boolean = false
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + duration;

    // 选择使用哪个属性
    const propName = useBackground ? 'backgroundOpacity' : 'alpha';

    // 获取当前透明度值，默认为0
    const startOpacity = (element as Record<string, number>)[propName] ?? 0;
    const targetOpacity = 1;
    const deltaOpacity = targetOpacity - startOpacity;

    while (Date.now() < endTime) {
      const progress = (Date.now() - startTime) / duration;
      const ease = easeInOutQuad(progress);
      (element as Record<string, number>)[propName] =
        startOpacity + deltaOpacity * ease;
      await waitNextFrame();
    }

    // 确保最终透明度精确
    (element as Record<string, number>)[propName] = targetOpacity;
  }

  /**
   * 渐出动画 (Fade Out)
   * 将元素的alpha或backgroundOpacity从当前值渐变到0（完全透明）
   * @param element 任何具有alpha或backgroundOpacity属性的UI元素
   * @param duration 动画时长（毫秒）
   * @param useBackground 是否使用backgroundOpacity（默认使用alpha）
   */
  static async fadeOut(
    element: { alpha?: number; backgroundOpacity?: number },
    duration: number,
    useBackground: boolean = false
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + duration;

    // 选择使用哪个属性
    const propName = useBackground ? 'backgroundOpacity' : 'alpha';

    // 获取当前透明度值，默认为1
    const startOpacity = (element as Record<string, number>)[propName] ?? 1;
    const targetOpacity = 0;
    const deltaOpacity = targetOpacity - startOpacity;

    while (Date.now() < endTime) {
      const progress = (Date.now() - startTime) / duration;
      const ease = easeInOutQuad(progress);
      (element as Record<string, number>)[propName] =
        startOpacity + deltaOpacity * ease;
      await waitNextFrame();
    }

    // 确保最终透明度精确
    (element as Record<string, number>)[propName] = targetOpacity;
  }

  /**
   * 黑幕过渡动画序列
   * 渐入 -> 停留 -> 渐出
   * @param element 黑幕UI元素
   * @param fadeInDuration 渐入时长（毫秒）
   * @param holdDuration 停留时长（毫秒）
   * @param fadeOutDuration 渐出时长（毫秒）
   * @param useBackground 是否使用backgroundOpacity（默认使用alpha）
   */
  static async transitionOverlay(
    element: { alpha?: number; backgroundOpacity?: number; visible: boolean },
    fadeInDuration: number,
    holdDuration: number,
    fadeOutDuration: number,
    useBackground: boolean = false
  ): Promise<void> {
    // 确保元素可见
    element.visible = true;

    // 设置初始透明度为0
    if (useBackground) {
      (element as Record<string, number>).backgroundOpacity = 0;
    } else {
      (element as Record<string, number>).alpha = 0;
    }

    // 渐入
    await Animation.fadeIn(element, fadeInDuration, useBackground);

    // 停留
    await Animation.delay(holdDuration);

    // 渐出
    await Animation.fadeOut(element, fadeOutDuration, useBackground);

    // 隐藏元素
    element.visible = false;
  }
}
