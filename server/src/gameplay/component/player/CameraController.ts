import { _decorator, Component } from '@dao3fun/component';
import { Settings } from '../../../Settings';
import { GameScene } from '../../const/enum';
import { Faction } from '@shares/core/Enum';
const { apclass } = _decorator;

/**
 * 相机视角配置接口
 */
interface CameraViewConfig {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  up?: { x: number; y: number; z: number };
  fovY?: number;
}

/**
 * CameraController - 玩家相机控制器
 * 负责管理玩家视角，特别是在Readiness场景中的固定视角
 */
@apclass('CameraController')
export class CameraController extends Component<GameEntity> {
  private isReadinessScene: boolean = false;
  private currentViewIndex: number = -1;
  private cameraApplied: boolean = false;
  private currentCameraConfig: CameraViewConfig | null = null;
  private initialCameraConfig: CameraViewConfig | null = null; // 保存初始配置
  private defaultCharacterIndex: number = 0; // 玩家在角色列表中的默认索引

  // 镜头插值相关
  private isLerping: boolean = false;
  private lerpStartTime: number = 0;
  private lerpDuration: number = 1000; // 1秒的插值时间
  private lerpStartPos: { x: number; y: number; z: number } | null = null;
  private lerpStartTarget: { x: number; y: number; z: number } | null = null;
  private lerpEndPos: { x: number; y: number; z: number } | null = null;
  private lerpEndTarget: { x: number; y: number; z: number } | null = null;
  private onLerpComplete: (() => void) | null = null;

  /**
   * 初始化相机设置
   * @param role 玩家角色
   * @param characterIndex 玩家在角色列表中的索引（用于切换角色视角）
   */
  public initializeCamera(role: Faction, characterIndex: number = 0): void {
    const currentScene = Settings.getCurrentScene();

    // 检查是否在Readiness场景
    if (currentScene === GameScene.Readiness) {
      this.isReadinessScene = true;
      this.defaultCharacterIndex = characterIndex; // 保存默认角色索引

      // 根据Faction切换相机配置
      if (role === Faction.Survivor) {
        this.initialCameraConfig = {
          position: Settings.readinessPlayerCameraConfig.position,
          target: Settings.readinessPlayerCameraConfig.target,
          up: Settings.readinessPlayerCameraConfig.up,
          fovY: Settings.readinessPlayerCameraConfig.fovY,
        };
      } else {
        this.initialCameraConfig = {
          position: Settings.readinessMonsterCameraConfig.position,
          target: Settings.readinessMonsterCameraConfig.target,
          up: Settings.readinessMonsterCameraConfig.up,
          fovY: Settings.readinessMonsterCameraConfig.fovY,
        };
      }

      // 当前配置也设置为初始配置
      this.currentCameraConfig = this.initialCameraConfig;

      console.log(
        `[CameraController] Configuration initialized with character index ${characterIndex}`
      );

      // 立即应用相机设置
      this.applyReadinessCamera();
    }
  }

  /**
   * 获取玩家的默认角色索引
   */
  public getDefaultCharacterIndex(): number {
    return this.defaultCharacterIndex;
  }

  /**
   * 应用Readiness场景的固定视角
   */
  private applyReadinessCamera(): void {
    const { player } = this.node.entity;
    if (!player || !this.currentCameraConfig) {
      return;
    }
    try {
      // 设置为固定视角模式
      player.cameraMode = GameCameraMode.FIXED;

      //设置pitch

      //设置yaw
      player.setCameraYaw(0);

      // 设置相机位置（分别设置x、y、z）
      const pos = this.currentCameraConfig.position;
      player.cameraPosition.x = pos.x;
      player.cameraPosition.y = pos.y;
      player.cameraPosition.z = pos.z;

      // 设置相机看向的目标点（分别设置x、y、z）
      const targetT = this.currentCameraConfig.target;
      player.cameraTarget.x = targetT.x;
      player.cameraTarget.y = targetT.y;
      player.cameraTarget.z = targetT.z;

      // 设置相机向上的矢量（分别设置x、y、z）
      if (this.currentCameraConfig.up) {
        const upT = this.currentCameraConfig.up;
        player.cameraUp.x = upT.x;
        player.cameraUp.y = upT.y;
        player.cameraUp.z = upT.z;
      }

      // 设置视场角
      if (this.currentCameraConfig.fovY !== undefined) {
        player.cameraFovY = this.currentCameraConfig.fovY;
      }

      this.cameraApplied = true;
    } catch (error) {
      console.error(
        '[CameraController] Failed to apply camera settings:',
        error
      );
    }
  }

  /**
   * 切换到指定角色的视角（使用lerp插值）
   * @param characterIndex 角色索引（在survivor或overseer列表中的索引）
   * @param isOverseer 是否是Overseer角色
   * @param onComplete 动画完成后的回调
   */
  public switchToCharacterView(
    characterIndex: number,
    isOverseer: boolean = false,
    onComplete?: () => void
  ): void {
    if (!this.isReadinessScene) {
      console.warn('[CameraController] Not in Readiness scene');
      return;
    }

    const { player } = this.node.entity;
    if (!player) {
      console.warn('[CameraController] Player not found');
      return;
    }

    // 如果正在插值，忽略新的请求
    if (this.isLerping) {
      console.warn('[CameraController] Camera is currently lerping');
      return;
    }

    // 获取对应的视角配置
    const viewPositions = isOverseer
      ? Settings.readinessMonsterViewPositions
      : Settings.readinessCharacterViewPositions;

    if (characterIndex < 0 || characterIndex >= viewPositions.length) {
      console.warn(
        `[CameraController] Invalid character index: ${characterIndex}`
      );
      return;
    }

    const viewConfig = viewPositions[characterIndex];

    // 记录当前相机位置作为起点
    this.lerpStartPos = {
      x: player.cameraPosition.x,
      y: player.cameraPosition.y,
      z: player.cameraPosition.z,
    };
    this.lerpStartTarget = {
      x: player.cameraTarget.x,
      y: player.cameraTarget.y,
      z: player.cameraTarget.z,
    };

    // 记录目标位置
    this.lerpEndPos = { ...viewConfig.position };
    this.lerpEndTarget = { ...viewConfig.target };

    // 开始插值
    this.isLerping = true;
    this.lerpStartTime = Date.now();
    this.currentCameraConfig = viewConfig;
    this.currentViewIndex = characterIndex;
    this.onLerpComplete = onComplete || null;

    console.log(
      `[CameraController] Starting lerp to ${isOverseer ? 'Overseer' : 'Survivor'} view #${characterIndex}`
    );
  }

  /**
   * 应用自定义视角配置
   */
  private applyCustomView(config: CameraViewConfig): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    try {
      player.cameraMode = GameCameraMode.FIXED;

      // 分别设置相机位置的x、y、z
      player.cameraPosition.x = config.position.x;
      player.cameraPosition.y = config.position.y;
      player.cameraPosition.z = config.position.z;

      // 分别设置相机目标的x、y、z
      player.cameraTarget.x = config.target.x;
      player.cameraTarget.y = config.target.y;
      player.cameraTarget.z = config.target.z;

      if (config.up) {
        player.cameraUp.x = config.up.x;
        player.cameraUp.y = config.up.y;
        player.cameraUp.z = config.up.z;
      }

      if (config.fovY !== undefined) {
        player.cameraFovY = config.fovY;
      }
    } catch (error) {
      console.error('[CameraController] Failed to apply custom view:', error);
    }
  }

  /**
   * 重置为默认Readiness视角（使用lerp插值）
   * @param onComplete 动画完成后的回调
   */
  public resetToDefaultView(onComplete?: () => void): void {
    if (!this.isReadinessScene || !this.initialCameraConfig) {
      console.warn(
        '[CameraController] Cannot reset: not in readiness scene or no initial config'
      );
      return;
    }

    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    // 如果正在插值，忽略新的请求
    if (this.isLerping) {
      console.warn('[CameraController] Camera is currently lerping');
      return;
    }

    // 记录当前相机位置作为起点
    this.lerpStartPos = {
      x: player.cameraPosition.x,
      y: player.cameraPosition.y,
      z: player.cameraPosition.z,
    };
    this.lerpStartTarget = {
      x: player.cameraTarget.x,
      y: player.cameraTarget.y,
      z: player.cameraTarget.z,
    };

    // 使用初始配置作为目标
    this.lerpEndPos = { ...this.initialCameraConfig.position };
    this.lerpEndTarget = { ...this.initialCameraConfig.target };

    // 开始插值
    this.isLerping = true;
    this.lerpStartTime = Date.now();
    this.currentViewIndex = -1;
    this.onLerpComplete = onComplete || null;

    // 恢复初始配置
    this.currentCameraConfig = this.initialCameraConfig;

    console.log(
      '[CameraController] Starting lerp to default Readiness view:',
      this.lerpEndPos,
      this.lerpEndTarget
    );
  }

  /**
   * 切换到第三人称跟随视角（用于离开Readiness场景）
   */
  public switchToFollowMode(): void {
    const { player } = this.node.entity;
    if (!player) {
      return;
    }

    try {
      player.cameraMode = GameCameraMode.FOLLOW;
      player.cameraDistance = 8.5;
      console.log('[CameraController] Switched to FOLLOW mode');
    } catch (error) {
      console.error(
        '[CameraController] Failed to switch to FOLLOW mode:',
        error
      );
    }
  }

  /**
   * 获取当前视角索引
   */
  public getCurrentViewIndex(): number {
    return this.currentViewIndex;
  }

  update(_deltaTime: number) {
    // 处理相机lerp插值
    if (this.isLerping) {
      this.updateCameraLerp();
    }
  }

  /**
   * 更新相机lerp插值
   */
  private updateCameraLerp(): void {
    const { player } = this.node.entity;
    if (
      !player ||
      !this.lerpStartPos ||
      !this.lerpStartTarget ||
      !this.lerpEndPos ||
      !this.lerpEndTarget
    ) {
      this.isLerping = false;
      return;
    }

    const elapsed = Date.now() - this.lerpStartTime;
    const progress = Math.min(elapsed / this.lerpDuration, 1);

    // 使用smoothstep缓动函数
    const t = this.smoothstep(progress);

    // 插值位置
    player.cameraPosition.x = this.lerp(
      this.lerpStartPos.x,
      this.lerpEndPos.x,
      t
    );
    player.cameraPosition.y = this.lerp(
      this.lerpStartPos.y,
      this.lerpEndPos.y,
      t
    );
    player.cameraPosition.z = this.lerp(
      this.lerpStartPos.z,
      this.lerpEndPos.z,
      t
    );

    // 插值目标
    player.cameraTarget.x = this.lerp(
      this.lerpStartTarget.x,
      this.lerpEndTarget.x,
      t
    );
    player.cameraTarget.y = this.lerp(
      this.lerpStartTarget.y,
      this.lerpEndTarget.y,
      t
    );
    player.cameraTarget.z = this.lerp(
      this.lerpStartTarget.z,
      this.lerpEndTarget.z,
      t
    );

    // 插值完成
    if (progress >= 1) {
      this.isLerping = false;

      // 应用最终配置
      if (this.currentCameraConfig) {
        if (this.currentCameraConfig.up) {
          player.cameraUp.x = this.currentCameraConfig.up.x;
          player.cameraUp.y = this.currentCameraConfig.up.y;
          player.cameraUp.z = this.currentCameraConfig.up.z;
        }
        if (this.currentCameraConfig.fovY !== undefined) {
          player.cameraFovY = this.currentCameraConfig.fovY;
        }
      }

      // 执行回调
      if (this.onLerpComplete) {
        this.onLerpComplete();
        this.onLerpComplete = null;
      }

      console.log('[CameraController] Lerp completed');
    }
  }

  /**
   * 线性插值
   */
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  /**
   * Smoothstep缓动函数（更丝滑的插值）
   */
  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }
}
