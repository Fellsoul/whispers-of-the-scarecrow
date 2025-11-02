import { _decorator, Component } from '@dao3fun/component';
import { Logger } from '../../../core/utils/Logger';
import { CharacterManager } from '../../mgr/CharacterManager';
import { DeathController } from '../player/DeathController';
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

  /** Overseer 锁定持续时间（秒） */
  private readonly OVERSEER_LOCK_DURATION = 3;

  /** 当前触发交互的玩家 */
  private currentInteractPlayer: GameEntity | null = null;

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

    const userId = player.player?.userId;
    if (!userId) {
      return;
    }

    // 检查玩家是否死亡或濒死
    if (DeathController.isPlayerDeadOrDying(userId)) {
      Logger.log(`[IronBoard] ❌ Player ${userId} is dead/dying, cannot interact with board`);
      return;
    }

    // 检查玩家角色 - Overseer 不能在翻板阶段操作
    const characterState = CharacterManager.instance.getCharacterState(userId);
    if (characterState && characterState.character.faction === 'Overseer') {
      Logger.log(`[IronBoard] ⛔ Overseer ${userId} cannot interact during rotation phase`);
      return;
    }

    Logger.log(
      `[IronBoard] First interact by player ${userId}`
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
   * 销毁板子实体
   */
  private destroyBoard(): void {
    Logger.log(`[IronBoard] Destroying board entity ${this.node.entity.id}`);

    // 清理事件监听
    if (this.interactToken) {
      this.interactToken.cancel();
      this.interactToken = null;
    }

    if (this.collisionToken) {
      this.collisionToken.cancel();
      this.collisionToken = null;
    }

    // 禁用实体（隐藏并移除碰撞）
    const entity = this.node.entity;
    entity.enableInteract = false;
    entity.collides = false;
    entity.meshInvisible = true;

    Logger.log(`[IronBoard] Board entity ${entity.id} disabled and hidden`);
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

    // 监听互动事件
    this.interactToken = this.node.entity.onInteract((event) => {
      if (this.boardState === 'activated') {
        this.handleSecondInteract(event.entity);
      }
    });
  }

  /**
   * 处理第二次互动 - 传送玩家（Survivor）或锁定后摧毁（Overseer）
   */
  private handleSecondInteract(player: GameEntity): void {
    if (this.boardState !== 'activated') {
      return;
    }

    const userId = player.player?.userId;
    if (!userId) {
      return;
    }

    // 检查玩家是否死亡或濒死
    if (DeathController.isPlayerDeadOrDying(userId)) {
      Logger.log(`[IronBoard] ❌ Player ${userId} is dead/dying, cannot interact with board`);
      return;
    }

    Logger.log(
      `[IronBoard] Second interact by player ${userId}`
    );

    // 检查玩家角色
    const characterState = CharacterManager.instance.getCharacterState(userId);
    if (!characterState) {
      return;
    }

    if (characterState.character.faction === 'Overseer') {
      // Overseer: 锁定3秒后摧毁板子
      this.handleOverseerInteract(player);
    } else {
      // Survivor: 传送到另一侧
      this.teleportPlayer(player);
    }
  }

  /**
   * 处理 Overseer 互动 - 锁定3秒后摧毁板子
   */
  private handleOverseerInteract(player: GameEntity): void {
    const userId = player.player?.userId || 'unknown';
    Logger.log(`[IronBoard] 🔒 Overseer ${userId} locked for ${this.OVERSEER_LOCK_DURATION} seconds before destroying board`);

    // 锁定玩家
    if (player.player) {
      const originalWalkSpeed = player.player.walkSpeed;
      const originalRunSpeed = player.player.runSpeed;
      const originalJumpEnabled = player.player.enableJump;

      player.player.walkSpeed = 0;
      player.player.runSpeed = 0;
      player.player.enableJump = false;

      // 3秒后解锁并摧毁板子
      setTimeout(() => {
        // 恢复玩家移动
        if (player.player) {
          player.player.walkSpeed = originalWalkSpeed;
          player.player.runSpeed = originalRunSpeed;
          player.player.enableJump = originalJumpEnabled;
          Logger.log(`[IronBoard] 🔓 Overseer ${userId} unlocked after ${this.OVERSEER_LOCK_DURATION}s`);
        }

        // 摧毁板子
        this.destroyBoard();
      }, this.OVERSEER_LOCK_DURATION * 1000);
    }
  }

  /**
   * 传送玩家到板子另一侧
   * 1. 判断玩家在板子的左侧还是右侧（使用原始位置）
   * 2. 先传送到板子位置
   * 3. 传送到相反侧
   */
  private teleportPlayer(player: GameEntity): void {
    const userId = player.player?.userId || 'unknown';
    const boardPos = this.node.entity.position;
    
    // 保存玩家原始位置的副本（不是引用！）
    const originalPlayerPos = {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
    };

    Logger.log(`[IronBoard] 🚪 Player ${userId} teleporting through board`);
    Logger.log(`[IronBoard]   Player original pos: (${originalPlayerPos.x.toFixed(2)}, ${originalPlayerPos.y.toFixed(2)}, ${originalPlayerPos.z.toFixed(2)})`);
    Logger.log(`[IronBoard]   Board pos: (${boardPos.x.toFixed(2)}, ${boardPos.y.toFixed(2)}, ${boardPos.z.toFixed(2)})`);

    // 步骤1：计算玩家在板子的哪一侧（左/右）- 在传送之前计算！
    // 获取板子的前向量（根据板子的 meshOrientation）
    const boardQuat = this.node.entity.meshOrientation;
    
    // 将四元数转换为前向量（假设板子初始朝向是 Z 轴正方向）
    // 前向量 = 四元数旋转 (0, 0, 1)
    const forward = this.rotateVectorByQuaternion(
      { x: 0, y: 0, z: 1 },
      [boardQuat.x, boardQuat.y, boardQuat.z, boardQuat.w]
    );

    // 计算板子的右向量（右向量 = 前向量 × 上向量）
    // 上向量固定为 (0, 1, 0)
    const right = {
      x: forward.z,
      y: 0,
      z: -forward.x,
    };

    // 计算玩家相对于板子的方向向量（使用原始位置）
    const toPlayer = {
      x: originalPlayerPos.x - boardPos.x,
      y: 0, // 忽略 Y 轴
      z: originalPlayerPos.z - boardPos.z,
    };

    // 计算点积，判断玩家在左侧还是右侧
    const dotProduct = toPlayer.x * right.x + toPlayer.z * right.z;

    Logger.log(`[IronBoard]   Board forward: (${forward.x.toFixed(2)}, ${forward.y.toFixed(2)}, ${forward.z.toFixed(2)})`);
    Logger.log(`[IronBoard]   Board right: (${right.x.toFixed(2)}, ${right.y.toFixed(2)}, ${right.z.toFixed(2)})`);
    Logger.log(`[IronBoard]   To player vector: (${toPlayer.x.toFixed(2)}, ${toPlayer.z.toFixed(2)})`);
    Logger.log(`[IronBoard]   Dot product: ${dotProduct.toFixed(2)} (${dotProduct > 0 ? 'RIGHT' : 'LEFT'} side)`);

    // 步骤2：先传送到板子位置
    player.position.x = boardPos.x;
    player.position.y = boardPos.y;
    player.position.z = boardPos.z;
    Logger.log(`[IronBoard]   → Step 2: Teleported to board position`);

    // 步骤3：传送到相反侧
    const teleportDistance = 3; // 传送距离（格）
    const sideMultiplier = dotProduct > 0 ? -1 : 1; // 如果在右侧，传送到左侧；反之亦然

    const targetPosition = {
      x: boardPos.x + right.x * teleportDistance * sideMultiplier,
      y: boardPos.y + 1, // 上方1格，避免卡入地面
      z: boardPos.z + right.z * teleportDistance * sideMultiplier,
    };

    // 传送玩家到目标位置
    player.position.x = targetPosition.x;
    player.position.y = targetPosition.y;
    player.position.z = targetPosition.z;

    Logger.log(
      `[IronBoard] ✅ Step 3: Teleported player ${userId} to ${dotProduct > 0 ? 'LEFT' : 'RIGHT'} side: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)})`
    );
  }

  /**
   * 使用四元数旋转向量
   */
  private rotateVectorByQuaternion(
    v: { x: number; y: number; z: number },
    q: Quat
  ): { x: number; y: number; z: number } {
    // 四元数旋转公式: v' = q * v * q^-1
    // 简化计算（v 作为纯四元数）
    const [qx, qy, qz, qw] = q;
    const vx = v.x;
    const vy = v.y;
    const vz = v.z;

    // 计算 q * v
    const t0 = qw * vx + qy * vz - qz * vy;
    const t1 = qw * vy + qz * vx - qx * vz;
    const t2 = qw * vz + qx * vy - qy * vx;
    const t3 = -qx * vx - qy * vy - qz * vz;

    // 计算 (q * v) * q^-1
    return {
      x: t0 * qw - t3 * qx - t1 * qz + t2 * qy,
      y: t1 * qw - t3 * qy - t2 * qx + t0 * qz,
      z: t2 * qw - t3 * qz - t0 * qy + t1 * qx,
    };
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
