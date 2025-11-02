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
 * cancelAnimationFrame 的安全包装
 */
export const caf: (id: number) => void =
  typeof globalThis !== 'undefined' &&
  typeof (getGlobal() as unknown as { cancelAnimationFrame?: (id: number) => void }).cancelAnimationFrame === 'function'
    ? (id: number) => ((getGlobal() as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame(id))
    : (id: number) => clearTimeout(id);

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
   * 动画：尺寸变化（宽度）
   * 用于进度条等 UI 元素的宽度动画
   */
  static async animateWidth(
    element: { size: { offset: { x: number; y: number; copy: (v: { x: number; y: number }) => void } } },
    targetWidth: number,
    duration: number,
    easing: (t: number) => number = (t) => t // 默认线性插值
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + duration;

    // 使用元素的实际当前宽度作为动画起点
    const startWidth = element.size.offset.x;
    const distanceWidth = targetWidth - startWidth;
    const currentY = element.size.offset.y;

    while (Date.now() < endTime) {
      const progress = (Date.now() - startTime) / duration;
      const ease = easing(progress);
      const currentWidth = startWidth + distanceWidth * ease;
      
      // 使用 copy 方法更新 offset
      element.size.offset.copy({ x: currentWidth, y: currentY });
      
      await waitNextFrame();
    }

    // 确保最终宽度精确
    element.size.offset.copy({ x: targetWidth, y: currentY });
  }

  /**
   * 线性插值动画（无缓动）
   * 用于需要恒定速度的动画，如进度条
   */
  static linear(t: number): number {
    return t;
  }

  /**
   * 平滑插值动画（SmoothStep）
   * 提供更平滑的开始和结束
   */
  static smoothStep(t: number): number {
    return t * t * (3 - 2 * t);
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
      (element as unknown as Record<string, number>).backgroundOpacity = 0;
    } else {
      (element as unknown as Record<string, number>).alpha = 0;
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

  /**
   * 心跳脉冲动画（循环）
   * 通过缩放元素来模拟心跳效果
   * @param element 需要缩放的元素（UiImage、UiBox等）
   * @param period 心跳周期（毫秒）
   * @param scaleAmount 缩放幅度（0-1），默认0.15表示放大15%
   * @returns 停止函数，调用后停止动画并恢复原始缩放
   */
  static startHeartbeat(
    element: any, // 使用 any 以支持不同的 UI 元素类型
    period: number,
    scaleAmount: number = 0.15
  ): () => void {
    // 确定使用哪种缩放方式
    let useScaleProperty = false;
    let useSizeProperty = false;
    let scaleObj: { x: number; y: number } | null = null;
    
    // 优先使用 scale 属性
    if (element.size?.scale) {
      scaleObj = element.size.scale;
      useScaleProperty = true;
    } else if (element.scale) {
      scaleObj = element.scale;
      useScaleProperty = true;
    } else if (element.size && typeof element.size.width === 'number' && typeof element.size.height === 'number') {
      // 备选方案：使用 size.width 和 size.height
      useSizeProperty = true;
    }

    if (!useScaleProperty && !useSizeProperty) {
      console.warn('[Animation] Element does not have accessible scale or size property');
      console.warn('[Animation] Element keys:', Object.keys(element));
      if (element.size) {
        console.warn('[Animation] Element.size keys:', Object.keys(element.size));
      }
      return () => {};
    }

    // 保存原始值
    const originalValues: { scaleX?: number; scaleY?: number; width?: number; height?: number } = {};
    
    if (useScaleProperty && scaleObj) {
      originalValues.scaleX = scaleObj.x ?? 1;
      originalValues.scaleY = scaleObj.y ?? 1;
      console.log(`[Animation] Starting heartbeat (scale mode) with original scale: ${originalValues.scaleX}, ${originalValues.scaleY}`);
    } else if (useSizeProperty) {
      originalValues.width = element.size.width;
      originalValues.height = element.size.height;
      console.log(`[Animation] Starting heartbeat (size mode) with original size: ${originalValues.width}, ${originalValues.height}`);
    }

    const startTime = Date.now();
    let animationId: number | null = null;
    let stopped = false;

    const animate = () => {
      if (stopped) {
        return;
      }

      // 计算当前时间在周期中的位置
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % period) / period;

      // 心跳脉冲效果：快速放大，然后快速恢复，然后静止
      let scaleFactor: number;
      if (progress < 0.15) {
        // 快速放大阶段 (0 -> 0.15)
        const t = progress / 0.15;
        scaleFactor = 1 + scaleAmount * t;
      } else if (progress < 0.3) {
        // 快速恢复阶段 (0.15 -> 0.3)
        const t = (progress - 0.15) / 0.15;
        scaleFactor = 1 + scaleAmount * (1 - t);
      } else {
        // 静止阶段 (0.3 -> 1.0)
        scaleFactor = 1;
      }

      // 应用缩放
      try {
        if (useScaleProperty) {
          // 使用 scale 属性
          let currentScaleObj: { x: number; y: number } | null = null;
          if (element.size?.scale) {
            currentScaleObj = element.size.scale;
          } else if (element.scale) {
            currentScaleObj = element.scale;
          }

          if (currentScaleObj && originalValues.scaleX !== undefined && originalValues.scaleY !== undefined) {
            currentScaleObj.x = originalValues.scaleX * scaleFactor;
            currentScaleObj.y = originalValues.scaleY * scaleFactor;
          }
        } else if (useSizeProperty && originalValues.width !== undefined && originalValues.height !== undefined) {
          // 使用 size.width 和 size.height 属性
          element.size.width = originalValues.width * scaleFactor;
          element.size.height = originalValues.height * scaleFactor;
        }
      } catch (error) {
        console.error('[Animation] Failed to apply scale:', error);
        stopped = true;
        return;
      }

      // 继续动画循环
      animationId = raf(animate);
    };

    // 开始动画
    animationId = raf(animate);

    // 返回停止函数
    return () => {
      stopped = true;
      if (animationId !== null) {
        caf(animationId);
      }
      
      // 恢复原始值
      try {
        if (useScaleProperty) {
          let finalScaleObj: { x: number; y: number } | null = null;
          if (element.size?.scale) {
            finalScaleObj = element.size.scale;
          } else if (element.scale) {
            finalScaleObj = element.scale;
          }
          
          if (finalScaleObj && originalValues.scaleX !== undefined && originalValues.scaleY !== undefined) {
            finalScaleObj.x = originalValues.scaleX;
            finalScaleObj.y = originalValues.scaleY;
            console.log(`[Animation] Heartbeat stopped, restored scale to: ${originalValues.scaleX}, ${originalValues.scaleY}`);
          }
        } else if (useSizeProperty && originalValues.width !== undefined && originalValues.height !== undefined) {
          element.size.width = originalValues.width;
          element.size.height = originalValues.height;
          console.log(`[Animation] Heartbeat stopped, restored size to: ${originalValues.width}, ${originalValues.height}`);
        }
      } catch (error) {
        console.error('[Animation] Failed to restore original values:', error);
      }
    };
  }
}
