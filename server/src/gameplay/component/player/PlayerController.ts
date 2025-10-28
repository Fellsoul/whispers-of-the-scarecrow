import { _decorator, Component } from '@dao3fun/component';
import { Settings } from '../../../Settings';
import { Faction } from '@shares/core/Enum';

const { apclass } = _decorator;

/**
 * PlayerController - 玩家控制器
 * 负责设置玩家的移动速度、输入限制等
 */
@apclass('PlayerController')
export class PlayerController extends Component<GameEntity> {
  private faction: Faction | null = null;
  private initialized: boolean = false;

  start() {
    // 组件启动时可以进行一些初始化
  }

  /**
   * 初始化玩家控制器，设置角色预设
   * @param faction 阵营类型（Overseer或Survivor）
   */
  public initialize(faction: Faction): void {
    const { player } = this.node.entity;
    if (!player) {
      console.warn('[PlayerController] Player not found');
      return;
    }

    this.faction = faction;

    try {
      // 获取对应阵营的移动配置
      const movementConfig =
        faction === Faction.Overseer
          ? Settings.characterMovementConfig.overseer
          : Settings.characterMovementConfig.survivor;
      // 设置移动速度
      player.walkSpeed = movementConfig.walkSpeed;
      player.runSpeed = movementConfig.runSpeed;
      player.walkAcceleration = movementConfig.walkAcceleration;
      player.runAcceleration = movementConfig.runAcceleration;

      // 禁用跳跃
      player.enableJump = false;

      // 禁用蹲伏
      player.enableCrouch = false;

      // 禁用双重跳跃
      player.enableDoubleJump = false;

      // 禁用飞行
      player.canFly = false;

      //如果是监管者，放大scale
      if (faction === Faction.Overseer) {
        player.scale = 1.7;
      }

      this.initialized = true;

      console.log(
        `[PlayerController] Initialized ${faction} - ` +
          `walkSpeed:${movementConfig.walkSpeed}, ` +
          `runSpeed:${movementConfig.runSpeed}, ` +
          `jump:disabled, crouch:disabled`
      );
    } catch (error) {
      console.error('[PlayerController] Failed to initialize:', error);
    }
  }

  /**
   * 设置移动速度（运行时动态修改）
   * @param walkSpeed 步行速度
   * @param runSpeed 跑步速度
   */
  public setMovementSpeed(walkSpeed: number, runSpeed: number): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    player.walkSpeed = walkSpeed;
    player.runSpeed = runSpeed;
    console.log(
      `[PlayerController] Speed updated - walk:${walkSpeed}, run:${runSpeed}`
    );
  }

  /**
   * 启用/禁用跳跃
   * @param enabled 是否启用
   */
  public setJumpEnabled(enabled: boolean): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    player.enableJump = enabled;
    console.log(`[PlayerController] Jump ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * 启用/禁用蹲伏
   * @param enabled 是否启用
   */
  public setCrouchEnabled(enabled: boolean): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    player.enableCrouch = enabled;
    console.log(
      `[PlayerController] Crouch ${enabled ? 'enabled' : 'disabled'}`
    );
  }

  /**
   * 获取当前阵营类型
   */
  public getFaction(): Faction | null {
    return this.faction;
  }

  /**
   * 检查是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 锁定玩家移动（禁用所有输入方向）
   * BOTH表示同时禁用水平和垂直方向
   */
  public lockPlayer(): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    // 禁用所有输入方向（水平+垂直）
    player.disableInputDirection = GameInputDirection.BOTH;
    console.log('[PlayerController] Player movement locked (disabled: BOTH)');
  }

  /**
   * 解锁玩家移动（启用所有输入方向）
   */
  public unlockPlayer(): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    // 恢复所有输入方向
    player.disableInputDirection = GameInputDirection.NONE;
    console.log('[PlayerController] Player movement unlocked (disabled: NONE)');
  }

  /**
   * 检查玩家是否被锁定
   */
  public isPlayerLocked(): boolean {
    const { player } = this.node.entity;
    if (!player) {
      return false;
    }

    return player.disableInputDirection === GameInputDirection.BOTH;
  }

  /**
   * 锁定水平方向移动（左右）
   */
  public lockHorizontal(): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    player.disableInputDirection = GameInputDirection.HORIZONTAL;
    console.log('[PlayerController] Horizontal movement locked');
  }

  /**
   * 锁定垂直方向移动（前后）
   */
  public lockVertical(): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    player.disableInputDirection = GameInputDirection.VERTICAL;
    console.log('[PlayerController] Vertical movement locked');
  }

  /**
   * 禁用特定方向的输入
   * @param direction 要禁用的方向
   */
  public disableDirection(direction: GameInputDirection): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    player.disableInputDirection = direction;
    console.log(`[PlayerController] Disabled input direction: ${direction}`);
  }

  update(_deltaTime: number) {
    // 可以在这里添加持续的控制逻辑
  }
}
