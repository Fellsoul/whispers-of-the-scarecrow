import { _decorator, Component } from '@dao3fun/component';
import { Logger } from '../../../core/utils/Logger';
import { CharacterManager } from '../../mgr/CharacterManager';
import {
  eulerToQuaternion,
  normalizeQuat,
  type Quat,
} from '../../../core/utils/quat';

const { apclass } = _decorator;

/**
 * IronBoard - 铁板组件
 * 可互动的翻板机关，玩家触发后翻转，可用于快速穿越
 *
 * 功能：
 * 1. 玩家接近时显示互动提示
 * 2. 第一次触发：板子沿x轴旋转56°
 * 3. 旋转完成后可再次触发传送玩家到另一侧
 * 4. 旋转期间如果碰到Overseer，使其眩晕5秒
 */
@apclass('IronBoard')
export class IronBoard extends Component<GameEntity> {
  /** 板子状态 */
  private boardState: 'idle' | 'rotating' | 'activated' = 'idle';

  /** 原始四元数 */
  private originalQuat: Quat = [0, 0, 0, 1];

  /** 目标四元数 */
  private targetQuat: Quat = [0, 0, 0, 1];

  /** 旋转进度 (0-1) */
  private rotationProgress: number = 0;

  /** 旋转持续时间（秒） */
  private readonly ROTATION_DURATION = 2.25;

  /** 互动范围 */
  private readonly INTERACT_RADIUS = 3;

  /** 旋转角度（度） */
  private readonly ROTATION_ANGLE = 128;

  /** 眩晕持续时间（秒） */
  private readonly STUN_DURATION = 5;

  /** 触发互动的玩家 */
  private triggeringPlayer: GameEntity | null = null;

  /** 碰撞检测事件令牌 */
  private collisionToken: GameEventHandlerToken | null = null;

  /** 互动事件令牌 */
  private interactToken: GameEventHandlerToken | null = null;

  /**
   * 组件启动
   */
  start() {
    // 记录原始四元数
    const { meshOrientation } = this.node.entity;
    this.originalQuat = [
      meshOrientation.x,
      meshOrientation.y,
      meshOrientation.z,
      meshOrientation.w,
    ];

    // 计算目标四元数（在原始旋转基础上沿x轴旋转56°）
    // 首先创建一个表示x轴旋转56°的四元数
    const rotationQuat = eulerToQuaternion(
      [this.ROTATION_ANGLE, 0, 0],
      'XYZ',
      'deg'
    );

    // 将旋转应用到原始四元数上
    this.targetQuat = this.multiplyQuaternions(this.originalQuat, rotationQuat);

    // 设置互动属性
    this.setupInteraction();

    Logger.log(`[IronBoard] Initialized for entity ${this.node.entity.id}`);
    Logger.log(`[IronBoard] Original quat: [${this.originalQuat.join(', ')}]`);
    Logger.log(`[IronBoard] Target quat: [${this.targetQuat.join(', ')}]`);
  }

  /**
   * 设置互动属性和监听
   */
  private setupInteraction(): void {
    const { entity } = this.node;

    // 设置互动属性
    entity.enableInteract = true;
    entity.interactRadius = this.INTERACT_RADIUS;
    entity.interactHint = '按 E 翻板';
    entity.interactColor = new GameRGBColor(0, 1, 0);

    // 监听互动事件
    this.setupIdleInteraction();

    Logger.log(`[IronBoard] Interaction setup complete for ${entity.id}`);
  }

  /**
   * 设置初始状态的互动监听
   */
  private setupIdleInteraction(): void {
    // 移除旧的监听
    if (this.interactToken) {
      this.interactToken.cancel();
    }

    // 监听互动事件
    this.interactToken = this.node.entity.onInteract((event) => {
      if (this.boardState === 'idle') {
        this.handleFirstInteract(event.entity);
      }
    });
  }

  /**
   * 处理第一次互动 - 开始旋转
   */
  private handleFirstInteract(player: GameEntity): void {
    if (this.boardState !== 'idle') {
      return;
    }

    Logger.log(
      `[IronBoard] First interact by player ${player.player?.userId || 'unknown'}`
    );

    this.boardState = 'rotating';
    this.triggeringPlayer = player;
    this.rotationProgress = 0;

    // 开始碰撞检测（检测旋转期间是否撞到Overseer）
    this.setupCollisionDetection();

    Logger.log(
      `[IronBoard] Started rotating for entity ${this.node.entity.id}`
    );
  }

  /**
   * 设置碰撞检测
   */
  private setupCollisionDetection(): void {
    // 移除旧的监听
    if (this.collisionToken) {
      this.collisionToken.cancel();
    }

    // 监听实体接触事件
    this.collisionToken = this.node.entity.onEntityContact((event) => {
      this.handleEntityContact(event.other);
    });
  }

  /**
   * 处理实体接触
   */
  private handleEntityContact(other: GameEntity): void {
    if (this.boardState !== 'rotating') {
      return;
    }

    // 检查是否是玩家实体
    if (!other.player) {
      return;
    }

    const { userId } = other.player;

    // 检查玩家是否是Overseer
    const characterState = CharacterManager.instance.getCharacterState(userId);
    if (!characterState) {
      return;
    }

    const characterId = characterState.character.id;
    const roleInstance = CharacterManager.instance.getRoleInstance(characterId);

    // Overseer 检测：roleInstance 为 null 表示不是幸存者，即为 Overseer
    // （因为当前只有 SurvivorRoleBase，Overseer 角色没有实例）
    if (roleInstance) {
      // 有角色实例说明是幸存者，跳过
      return;
    }

    // 眩晕Overseer
    this.stunPlayer(other);
  }

  /**
   * 眩晕玩家
   */
  private stunPlayer(player: GameEntity): void {
    if (!player.player) {
      return;
    }

    Logger.log(`[IronBoard] Stunning overseer ${player.player.userId}`);

    // 禁用玩家移动和跳跃
    const originalWalkSpeed = player.player.walkSpeed;
    const originalRunSpeed = player.player.runSpeed;
    const originalJumpEnabled = player.player.enableJump;

    player.player.walkSpeed = 0;
    player.player.runSpeed = 0;
    player.player.enableJump = false;

    // 5秒后恢复
    setTimeout(() => {
      if (player.player) {
        player.player.walkSpeed = originalWalkSpeed;
        player.player.runSpeed = originalRunSpeed;
        player.player.enableJump = originalJumpEnabled;
        Logger.log(`[IronBoard] Overseer ${player.player.userId} stun ended`);
      }
    }, this.STUN_DURATION * 1000);

    Logger.log(
      `[IronBoard] Overseer ${player.player.userId} stunned for ${this.STUN_DURATION} seconds`
    );
  }

  /**
   * 每帧更新
   */
  update(dt: number): void {
    if (this.boardState === 'rotating') {
      this.updateRotation(dt);
    }
  }

  /**
   * 更新旋转动画
   */
  private updateRotation(dt: number): void {
    // 更新旋转进度
    this.rotationProgress += dt / this.ROTATION_DURATION;

    if (this.rotationProgress >= 1) {
      // 旋转完成
      this.rotationProgress = 1;
      const finalQuat = this.slerpQuaternion(
        this.originalQuat,
        this.targetQuat,
        1
      );
      this.node.entity.meshOrientation.set(
        finalQuat[0],
        finalQuat[1],
        finalQuat[2],
        finalQuat[3]
      );
      this.onRotationComplete();
    } else {
      // 球面线性插值旋转
      const currentQuat = this.slerpQuaternion(
        this.originalQuat,
        this.targetQuat,
        this.rotationProgress
      );
      this.node.entity.meshOrientation.set(
        currentQuat[0],
        currentQuat[1],
        currentQuat[2],
        currentQuat[3]
      );
    }
  }

  /**
   * 四元数乘法
   */
  private multiplyQuaternions(a: Quat, b: Quat): Quat {
    const [ax, ay, az, aw] = a;
    const [bx, by, bz, bw] = b;

    return normalizeQuat([
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz,
    ]);
  }

  /**
   * 球面线性插值 (Slerp)
   */
  private slerpQuaternion(a: Quat, b: Quat, t: number): Quat {
    // 计算点积
    let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

    // 如果点积为负，反转一个四元数以取最短路径
    let b2 = b;
    if (dot < 0) {
      dot = -dot;
      b2 = [-b[0], -b[1], -b[2], -b[3]] as Quat;
    }

    // 如果四元数非常接近，使用线性插值
    if (dot > 0.9995) {
      return normalizeQuat([
        a[0] + t * (b2[0] - a[0]),
        a[1] + t * (b2[1] - a[1]),
        a[2] + t * (b2[2] - a[2]),
        a[3] + t * (b2[3] - a[3]),
      ]);
    }

    // 球面插值
    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);

    const s0 = Math.cos(theta) - (dot * sinTheta) / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    return normalizeQuat([
      s0 * a[0] + s1 * b2[0],
      s0 * a[1] + s1 * b2[1],
      s0 * a[2] + s1 * b2[2],
      s0 * a[3] + s1 * b2[3],
    ]);
  }

  /**
   * 旋转完成回调
   */
  private onRotationComplete(): void {
    Logger.log(
      `[IronBoard] Rotation complete for entity ${this.node.entity.id}`
    );

    this.boardState = 'activated';

    // 移除碰撞检测
    if (this.collisionToken) {
      this.collisionToken.cancel();
      this.collisionToken = null;
    }

    // 切换到激活状态的互动监听
    this.setupActivatedInteraction();
  }

  /**
   * 设置激活状态的互动监听
   */
  private setupActivatedInteraction(): void {
    // 移除旧的监听
    if (this.interactToken) {
      this.interactToken.cancel();
    }

    // 更新互动提示
    this.node.entity.interactHint = '按 E 传送';

    // 监听互动事件
    this.interactToken = this.node.entity.onInteract((event) => {
      if (this.boardState === 'activated') {
        this.handleSecondInteract(event.entity);
      }
    });
  }

  /**
   * 处理第二次互动 - 传送玩家
   */
  private handleSecondInteract(player: GameEntity): void {
    if (this.boardState !== 'activated') {
      return;
    }

    Logger.log(
      `[IronBoard] Second interact by player ${player.player?.userId || 'unknown'}`
    );

    // 计算传送目标位置（板子另一侧）
    const boardPos = this.node.entity.position;
    const boardRotation = this.node.entity.meshOrientation;

    // 根据板子旋转方向计算另一侧位置
    // 假设板子沿x轴旋转，传送到板子正面方向的另一侧
    // 这里简化处理：传送到板子位置上方，然后向前移动一定距离
    const teleportDistance = 5; // 传送距离

    // 计算前进方向（基于板子的y轴旋转）
    const yaw = boardRotation.y * (Math.PI / 180); // 转换为弧度
    const offsetX = Math.sin(yaw) * teleportDistance;
    const offsetZ = Math.cos(yaw) * teleportDistance;

    // 目标位置：板子上方 + 向前偏移
    const targetPosition = {
      x: boardPos.x + offsetX,
      y: boardPos.y + 2, // 上方2格
      z: boardPos.z + offsetZ,
    };

    // 传送玩家
    player.position.x = targetPosition.x;
    player.position.y = targetPosition.y;
    player.position.z = targetPosition.z;

    Logger.log(
      `[IronBoard] Teleported player ${player.player?.userId || 'unknown'} to (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`
    );
  }

  /**
   * 组件销毁
   */
  onDestroy(): void {
    // 清理事件监听
    if (this.interactToken) {
      this.interactToken.cancel();
    }

    if (this.collisionToken) {
      this.collisionToken.cancel();
    }

    Logger.log(
      `[IronBoard] Component destroyed for entity ${this.node.entity.id}`
    );
  }
}
