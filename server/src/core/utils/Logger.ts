import { Settings } from '../../Settings';

/**
 * 统一的日志工具类
 * 根据Settings.debug控制是否输出日志
 */
export class Logger {
  /**
   * 信息日志
   */
  static log(...args: unknown[]): void {
    if (Settings.debug) {
      console.log(...args);
    }
  }

  /**
   * 警告日志
   */
  static warn(...args: unknown[]): void {
    if (Settings.debug) {
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
    if (Settings.debug) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * 信息日志（带INFO标签）
   */
  static info(...args: unknown[]): void {
    if (Settings.debug) {
      console.log('[INFO]', ...args);
    }
  }
}
