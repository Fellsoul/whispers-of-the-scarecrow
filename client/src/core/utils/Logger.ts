/**
 * 统一的日志工具类（客户端版本）
 * 根据全局debug配置控制是否输出日志
 */

// 全局debug开关（与服务器Settings同步）
let debugMode = true;

export class Logger {
  /**
   * 设置debug模式
   */
  static setDebugMode(enabled: boolean): void {
    debugMode = enabled;
  }

  /**
   * 获取当前debug模式
   */
  static isDebugEnabled(): boolean {
    return debugMode;
  }

  /**
   * 信息日志
   */
  static log(...args: unknown[]): void {
    if (debugMode) {
      console.log(...args);
    }
  }

  /**
   * 警告日志
   */
  static warn(...args: unknown[]): void {
    if (debugMode) {
      console.warn(...args);
    }
  }

  /**
   * 错误日志（始终输出，不受debug模式控制）
   */
  static error(...args: unknown[]): void {
    console.error(...args);
  }

  /**
   * 调试日志（仅在debug模式下输出）
   */
  static debug(...args: unknown[]): void {
    if (debugMode) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * 信息日志（带INFO标签）
   */
  static info(...args: unknown[]): void {
    if (debugMode) {
      console.log('[INFO]', ...args);
    }
  }
}
