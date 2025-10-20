/**
 * Observer Pattern Implementation
 * 观察者模式实现
 *
 * This class implements the Observer pattern, allowing objects to subscribe to changes
 * in a subject and be notified when the subject's state changes.
 * 此类实现了观察者模式，允许对象订阅主题的变化，并在主题状态改变时得到通知。
 *
 * @template T - The type of the subject being observed / 被观察主题的类型
 */
export class Observer<T> {
  /** The subject being observed / 被观察的主题 */
  private subject: T;

  /** Array of listener functions that will be notified of changes / 监听器函数数组，用于通知变化 */
  private listeners: ((data?: unknown) => void)[] = [];

  /**
   * Constructor - creates a new Observer instance
   * 构造函数 - 创建一个新的观察者实例
   *
   * @param subject - The initial subject to observe / 要观察的初始主题
   */
  constructor(subject: T) {
    this.subject = subject;
  }

  /**
   * Sets a new subject and notifies all listeners
   * 设置新的主题并通知所有监听器
   *
   * @param subject - The new subject to observe / 要观察的新主题
   */
  public setSubject(subject: T): void {
    this.subject = subject;
    this.notify(this.subject);
  }

  /**
   * Gets the current subject
   * 获取当前主题
   *
   * @returns The current subject / 当前主题
   */
  public getSubject(): T {
    return this.subject;
  }

  /**
   * Adds a listener function to be notified of changes
   * 添加监听器函数以接收变化通知
   *
   * @param listener - The function to call when changes occur / 当变化发生时调用的函数
   * @returns The index of the added listener / 添加的监听器的索引
   */
  public addListener(listener: (data?: unknown) => void): number {
    this.listeners.push(listener);
    return this.listeners.length - 1;
  }

  /**
   * Gets a listener function by its index
   * 通过索引获取监听器函数
   *
   * @param index - The index of the listener / 监听器的索引
   * @returns The listener function at the specified index / 指定索引处的监听器函数
   */
  public getListener(index: number): (data?: unknown) => void {
    return this.listeners[index];
  }

  /**
   * Removes a specific listener function
   * 移除特定的监听器函数
   *
   * @param listener - The listener function to remove / 要移除的监听器函数
   */
  public removeListener(listener: (data?: unknown) => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Removes a listener function by its index
   * 通过索引移除监听器函数
   *
   * @param index - The index of the listener to remove / 要移除的监听器的索引
   */
  public removeListenerByIndex(index: number): void {
    this.listeners.splice(index, 1);
  }

  /**
   * Removes all listeners
   * 移除所有监听器
   */
  public removeAllListeners(): void {
    this.listeners = [];
  }

  /**
   * Notifies all listeners with optional data
   * 通知所有监听器，可选择传递数据
   *
   * This method iterates through all listeners in reverse order and calls them.
   * If a listener is null/undefined, it's removed from the array.
   * 此方法以逆序遍历所有监听器并调用它们。
   * 如果监听器为null/undefined，则从数组中移除。
   *
   * @param data - Optional data to pass to listeners / 传递给监听器的可选数据
   */
  public notify(data?: unknown): void {
    for (let i = this.listeners.length - 1; i >= 0; i--) {
      const listener = this.listeners[i];
      if (listener) {
        listener(data);
      } else {
        this.listeners.splice(i, 1);
      }
    }
  }
}
