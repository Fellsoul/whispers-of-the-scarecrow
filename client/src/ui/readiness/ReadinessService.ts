/**
 * ReadinessService - 客户端本地状态管理、计时/动画调度、可视逻辑
 */

import type { Character } from '@shares/character/Character';
import type { ReadinessState } from './types';
import { ReadinessPhase } from './types';

export class ReadinessService {
  private state: ReadinessState;
  private characters: Character[] = [];

  constructor() {
    this.state = {
      phase: ReadinessPhase.Idle,
      currentIndex: 0,
      isReady: false,
      totalPlayers: 0,
      preparedPlayers: 0,
      countdownSec: null,
      isAllTeleported: false,
    };
  }

  /**
   * 初始化角色列表（仅包含 Survivor 阵营角色）
   */
  initCharacters(characters: Character[]): void {
    // 过滤掉 Overseer 阵营的角色，只保留 Survivor
    this.characters = characters.filter(
      (char) => char.faction === 'Survivor'
    );
    
    console.log(
      `[ReadinessService] Initialized ${this.characters.length} Survivor characters (${characters.length - this.characters.length} Overseer(s) filtered)`
    );
  }

  /**
   * 获取当前角色
   */
  getCurrentCharacter(): Character | null {
    if (this.characters.length === 0) {
      return null;
    }
    return this.characters[this.state.currentIndex] || null;
  }

  /**
   * 获取当前索引
   */
  getCurrentIndex(): number {
    return this.state.currentIndex;
  }

  /**
   * 设置索引（支持循环）
   */
  setIndex(delta: number): void {
    if (this.characters.length === 0) {
      return;
    }

    let newIndex = this.state.currentIndex + delta;

    // 循环越界处理
    if (newIndex < 0) {
      newIndex = this.characters.length - 1;
    } else if (newIndex >= this.characters.length) {
      newIndex = 0;
    }

    this.state.currentIndex = newIndex;
    console.log(
      `[ReadinessService] Index changed to ${newIndex}: ${this.getCurrentCharacter()?.name}`
    );
  }

  /**
   * 进入卷轴视图
   */
  enterScrollView(): void {
    this.state.phase = ReadinessPhase.ShowingScroll;
    console.log('[ReadinessService] Entered scroll view');
  }

  /**
   * 离开卷轴视图
   */
  leaveScrollView(): void {
    this.state.phase = ReadinessPhase.Choosing;
    console.log('[ReadinessService] Left scroll view');
  }

  /**
   * 确认选择
   */
  confirmSelection(): void {
    this.state.isReady = true;
    this.state.phase = ReadinessPhase.Confirmed;
    console.log('[ReadinessService] Selection confirmed');
  }

  /**
   * 取消确认
   */
  cancelConfirmation(): void {
    this.state.isReady = false;
    this.state.phase = ReadinessPhase.Choosing;
    console.log('[ReadinessService] Confirmation canceled');
  }

  /**
   * 设置倒计时
   */
  setCountdown(sec: number | null): void {
    this.state.countdownSec = sec;
    if (sec !== null) {
      this.state.phase = ReadinessPhase.Countdown;
    }
  }

  /**
   * 设置准备人数
   */
  setPrepared(prepared: number, total: number): void {
    this.state.preparedPlayers = prepared;
    this.state.totalPlayers = total;
  }

  /**
   * 设置所有人传送就位状态
   */
  setAllTeleported(flag: boolean): void {
    this.state.isAllTeleported = flag;
    console.log(`[ReadinessService] All teleported: ${flag}`);
  }

  /**
   * 锁定状态（游戏即将开始）
   */
  lock(): void {
    this.state.phase = ReadinessPhase.Locked;
    this.state.isReady = true;
    console.log('[ReadinessService] Locked for game start');
  }

  /**
   * 格式化时间为 mm:ss
   */
  formatTime(sec: number | null): string {
    if (sec === null || sec < 0) {
      return '-- : --';
    }

    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 获取准备数文本
   */
  getPreparedText(): string {
    return `${this.state.preparedPlayers} / ${this.state.totalPlayers}`;
  }

  /**
   * 获取状态
   */
  getState(): Readonly<ReadinessState> {
    return { ...this.state };
  }

  /**
   * 检查是否已准备
   */
  isReady(): boolean {
    return this.state.isReady;
  }

  /**
   * 检查是否锁定
   */
  isLocked(): boolean {
    return this.state.phase === ReadinessPhase.Locked;
  }

  /**
   * 获取角色列表
   */
  getCharacters(): Character[] {
    return this.characters;
  }
}
