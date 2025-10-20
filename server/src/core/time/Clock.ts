/*
服务端中运行时间系统；即所有用户的游戏时间固定为服务器时间
7.5秒为游戏中10分钟 （≈80倍速）
一天默认从早上6点开始；到凌晨2点刷新到白天（6点），每次刷新更新客户端date信息
仅时间为全局共用，所玩日期为用户个人、团队所有
*/

// 速度：使 1 个游戏日（20 小时 = 1200 分钟）= 876 秒真实时间
// 每 1 秒真实时间推进 1200/876 = 100/73 分钟游戏时间（≈ 1.369863 分钟/秒）
const GAME_MINUTES_PER_REAL_SECOND = 100 / 73;

// 游戏时间窗口：06:00 开始，到次日 02:00 结束（共 20 小时 = 1200 分钟）
const GAME_DAY_START_MIN = 6 * 60; // 360
const GAME_DAY_END_MIN = 26 * 60; // 1560 (次日 02:00)
const GAME_WINDOW_MINUTES = GAME_DAY_END_MIN - GAME_DAY_START_MIN; // 1200

export type GameClock = {
  hour: number; // 0-23
  minute: number; // 0-59
  // 从 06:00 开始累计的游戏分钟（0-1199）
  minutesSinceStart: number;
  // 自服务器启动以来的“天数”计数（每次 02:00 -> 06:00 视为下一天）
  dayIndex: number;
};

type TimerEvents = {
  minute: (clock: GameClock) => void;
  rollover: (clock: GameClock) => void; // 02:00 -> 06:00 的切换事件
};

// 轻量级事件系统，避免引入 Node 的 EventEmitter 类型依赖
class Emitter<EvtMap> {
  private listeners: { [K in keyof EvtMap]?: Set<EvtMap[K]> } = {};

  on<K extends keyof EvtMap>(event: K, fn: EvtMap[K]): void {
    const set = (this.listeners[event] ??= new Set());
    set.add(fn);
  }

  off<K extends keyof EvtMap>(event: K, fn: EvtMap[K]): void {
    this.listeners[event]?.delete(fn);
  }

  emit<K extends keyof EvtMap>(
    event: K,
    ...args: EvtMap[K] extends (...a: infer P) => unknown ? P : never
  ): void {
    const set = this.listeners[event];
    if (!set) {
      return;
    }
    for (const fn of set as Set<(...a: unknown[]) => unknown>) {
      (fn as (...a: typeof args) => unknown)(...args);
    }
  }
}

function modulo(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export class Timer {
  private emitter = new Emitter<TimerEvents>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private realAnchorMs = 0; // 真实时间起点（ms）
  private gameAnchorMinutes = GAME_DAY_START_MIN; // 游戏时间起点（分钟，06:00）
  private dayIndex = 0;
  private lastEmittedMinuteAbs = -1; // 上次发出的绝对游戏分钟（含天数）

  // === 控制 ===
  start(): void {
    if (this.intervalId) {
      return;
    }
    this.realAnchorMs = Date.now();
    // 每 250ms 计算一次，保证分钟跳变足够及时（1 游戏分钟 = 750ms 实时）
    this.intervalId = setInterval(() => this.tick(), 250);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // === 事件订阅 ===
  on<T extends keyof TimerEvents>(event: T, listener: TimerEvents[T]): void {
    this.emitter.on(event, listener);
  }

  off<T extends keyof TimerEvents>(event: T, listener: TimerEvents[T]): void {
    this.emitter.off(event, listener);
  }

  // === 查询 ===
  getClock(): GameClock {
    const { minutesSinceStart, dayIndex } = this.computeWindowMinutes();
    const totalMinutes = GAME_DAY_START_MIN + minutesSinceStart; // 相对一天 0:00 的分钟数（360..1559）
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    return { hour, minute, minutesSinceStart, dayIndex };
  }

  // === 内部 ===
  private tick(): void {
    const { minutesSinceStart, dayIndex } = this.computeWindowMinutes();
    // 绝对分钟数（包含天数），用于避免重复发同一分钟
    const absoluteMinute = dayIndex * GAME_WINDOW_MINUTES + minutesSinceStart;

    if (absoluteMinute !== this.lastEmittedMinuteAbs) {
      this.lastEmittedMinuteAbs = absoluteMinute;
      const clock = this.getClock();
      this.emitter.emit('minute', clock);

      // 在窗口尾巴 02:00 之前一分钟（即 01:59 -> 02:00）进入 rollover
      if (minutesSinceStart === GAME_WINDOW_MINUTES - 1) {
        // 下一刻即将回到 06:00
        // 先更新锚点，确保回绕后时间从 06:00 开始
        this.rolloverToNextDay();
        const rolledClock = this.getClock();
        this.emitter.emit('rollover', rolledClock);
      }
    }
  }

  private computeWindowMinutes(): {
    minutesSinceStart: number;
    dayIndex: number;
  } {
    const elapsedRealSec = (Date.now() - this.realAnchorMs) / 1000;
    const elapsedGameMin = Math.floor(
      elapsedRealSec * GAME_MINUTES_PER_REAL_SECOND
    );

    // 在当前窗口内的分钟（0..WINDOW-1）与天数
    const totalSinceStart =
      this.gameAnchorMinutes - GAME_DAY_START_MIN + elapsedGameMin; // >= 0
    const dayIndex = Math.floor(totalSinceStart / GAME_WINDOW_MINUTES);
    const minutesSinceStart = modulo(totalSinceStart, GAME_WINDOW_MINUTES);
    return { minutesSinceStart, dayIndex: this.dayIndex + dayIndex };
  }

  private rolloverToNextDay(): void {
    // 将新的锚点设为当前真实时刻，对应游戏时间回到 06:00，dayIndex+1
    const now = Date.now();
    const current = this.getClock();
    // 重新锚定到 06:00
    this.realAnchorMs = now;
    this.gameAnchorMinutes = GAME_DAY_START_MIN;
    this.dayIndex = current.dayIndex + 1;
  }
}

export const timer = new Timer();
// 默认启动全局计时器
timer.start();
