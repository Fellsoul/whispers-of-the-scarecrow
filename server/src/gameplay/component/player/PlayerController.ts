import { _decorator, Component } from '@dao3fun/component';
import { Settings } from '../../../Settings';
import { Faction } from '@shares/core/Enum';
import { CharacterManager } from '../../mgr/CharacterManager';
import { PlayerManager } from '../../mgr/PlayerManager';
import { CommunicationMgr } from '../../../presentation/CommunicationGateway';
import { EventBus } from '../../../core/events/EventBus';
import * as quat from '../../../core/utils/quat';

const { apclass } = _decorator;

/**
 * PlayerController - 玩家控制器
 * 负责设置玩家的移动速度、输入限制等
 */
@apclass('PlayerController')
export class PlayerController extends Component<GameEntity> {
  private faction: Faction | null = null;
  private initialized: boolean = false;

  private baseWalkSpeed: number = 0;
  private baseRunSpeed: number = 0;

  // 通信管理器
  private communicationMgr: CommunicationMgr = CommunicationMgr.instance;

  // 事件总线
  private eventBus: EventBus = EventBus.instance;

  // 镰刀攻击相关
  private scytheAttacking: boolean = false;
  private scytheRotationProgress: number = 0;
  private scytheOriginalOrientation: GameQuaternion | null = null;
  private scytheHoldTimer: number = 0;
  private scytheAttackHit: boolean = false; // 记录本次攻击是否命中
  private attackOnCooldown: boolean = false; // 攻击冷却标志
  private readonly SCYTHE_ROTATION_ANGLE = 50; // 度
  private readonly SCYTHE_ANIMATION_DURATION = 0.5; // 秒
  private readonly SCYTHE_HOLD_DURATION = 1; // 停留时间（秒）
  private readonly SCYTHE_ATTACK_RANGE = 6; // 攻击距离（格）
  private readonly SCYTHE_ATTACK_ANGLE = 60; // 扇形角度（度）
  private readonly SCYTHE_COOLDOWN_HIT = 4000; // 命中后冷却时间（毫秒）
  private readonly SCYTHE_COOLDOWN_MISS = 2000; // 未命中冷却时间（毫秒）
  private attackButtonToken: GameEventHandlerToken | null = null;

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
      player.jumpPower = movementConfig.jumpPower;
      player.jumpSpeedFactor = movementConfig.jumpSpeedFactor;
      this.baseWalkSpeed = movementConfig.walkSpeed;
      this.baseRunSpeed = movementConfig.runSpeed;

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

      // 重置玩家朝向（X轴旋转归零，防止卡到地底）
      this.node.entity.meshOrientation = new GameQuaternion(0, 0, 0, 1);
      console.log(`[PlayerController] Reset player orientation (X-axis to 0)`);

      this.initialized = true;

      // 如果是 Overseer，设置镰刀攻击监听
      if (faction === Faction.Overseer) {
        this.setupScytheAttack();
      }

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
   * 设置镰刀攻击监听（仅 Overseer）
   */
  private setupScytheAttack(): void {
    const { player } = this.node.entity;
    if (!player) {
      console.warn('[PlayerController] Cannot setup scythe attack: player not found');
      return;
    }

    // 监听鼠标左键或 buttonA
    this.attackButtonToken = player.onPress(({ button }) => {
      if (button === GameButtonType.ACTION0 && !this.scytheAttacking) {
        this.startScytheAttack();
      } else if (this.scytheAttacking) {
      }
    });

  }

  /**
   * 开始镰刀攻击
   */
  private startScytheAttack(): void {
    const userId = this.node.entity.player?.userId;
    if (!userId) {
      console.warn('[PlayerController] Cannot start attack: userId not found');
      return;
    }

    // 检查攻击是否在冷却中
    if (this.attackOnCooldown) {
      console.log(`[PlayerController] Attack on cooldown for Overseer ${userId} - cannot attack yet`);
      return;
    }

    // 获取角色状态和镰刀装备
    const characterState = CharacterManager.instance.getCharacterState(userId);
    if (!characterState) {
      console.warn(`[PlayerController] Cannot start attack: character state not found for ${userId}`);
      return;
    }

    const scythe = (characterState as any).scytheWearable as GameWearable | undefined;
    if (!scythe) {
      console.warn(`[PlayerController] Scythe not found for Overseer ${userId}`);
      return;
    }

    console.log(`[PlayerController] 🔥 Starting scythe attack for Overseer ${userId}`);

    this.scytheAttacking = true;
    this.scytheRotationProgress = 0;
    this.scytheHoldTimer = 0;

    // 保存原始方向
    this.scytheOriginalOrientation = new GameQuaternion(
      scythe.orientation.x,
      scythe.orientation.y,
      scythe.orientation.z,
      scythe.orientation.w
    );

    // 执行伤害判定（在挥砍的瞬间）并记录是否命中
    this.scytheAttackHit = this.performScytheAttack();
    console.log(`[PlayerController] Attack hit result: ${this.scytheAttackHit}`);
  }

  /**
   * 执行镰刀伤害判定
   * 攻击范围：60 度扇形，半径 4 格
   * @returns 是否命中目标
   */
  private performScytheAttack(): boolean {
    const userId = this.node.entity.player?.userId;
    if (!userId) {
      console.warn('[PlayerController] Cannot perform attack: userId not found');
      return false;
    }

    const overseerPos = this.node.entity.position;
    const overseerDir = this.getForwardDirection();

    console.log(`[PlayerController] 🗡️ Overseer ${userId} performing scythe attack`);
    console.log(`[PlayerController]   Position: (${overseerPos.x.toFixed(2)}, ${overseerPos.y.toFixed(2)}, ${overseerPos.z.toFixed(2)})`);
    console.log(`[PlayerController]   Direction: (${overseerDir.x.toFixed(2)}, ${overseerDir.z.toFixed(2)})`);
    console.log(`[PlayerController]   Attack Range: ${this.SCYTHE_ATTACK_RANGE}, Angle: ${this.SCYTHE_ATTACK_ANGLE}°`);

    // 获取所有在线玩家
    const onlinePlayerIds = PlayerManager.instance.getOnlinePlayerIds();
    console.log(`[PlayerController]   Online players: ${onlinePlayerIds.length} total`);
    
    let checkedCount = 0;
    let survivorCount = 0;
    let hitCount = 0;

    for (const targetUserId of onlinePlayerIds) {
      checkedCount++;
      
      if (targetUserId === userId) {
        console.log(`[PlayerController]     Player ${checkedCount}: ${targetUserId} (SELF - skipped)`);
        continue; // 跳过自己
      }

      // 检查是否是 Survivor
      const targetState = CharacterManager.instance.getCharacterState(targetUserId);
      if (!targetState) {
        console.log(`[PlayerController]     Player ${checkedCount}: ${targetUserId} (NO CHARACTER STATE)`);
        continue;
      }
      
      if (targetState.character.faction !== 'Survivor') {
        console.log(`[PlayerController]     Player ${checkedCount}: ${targetUserId} (${targetState.character.faction} - not Survivor)`);
        continue;
      }

      survivorCount++;

      const playerInfo = PlayerManager.instance.getOnlinePlayer(targetUserId);
      if (!playerInfo) {
        console.log(`[PlayerController]     Player ${checkedCount}: ${targetUserId} (NO PLAYER INFO)`);
        continue;
      }

      const targetEntity = playerInfo.entity as GamePlayerEntity;
      const targetPos = targetEntity.position;

      // 计算距离（XZ 平面）
      const dx = targetPos.x - overseerPos.x;
      const dz = targetPos.z - overseerPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // 检查距离
      if (distance > this.SCYTHE_ATTACK_RANGE) {
        console.log(`[PlayerController]     Player ${checkedCount}: ${targetUserId} - Distance: ${distance.toFixed(2)} (out of range)`);
        continue;
      }

      // 计算目标方向与前方方向的夹角
      const targetDir = { x: dx / distance, z: dz / distance };
      const dotProduct = overseerDir.x * targetDir.x + overseerDir.z * targetDir.z;
      const angleRad = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
      const angleDeg = (angleRad * 180) / Math.PI;

      console.log(`[PlayerController]     Player ${checkedCount}: ${targetUserId} - Distance: ${distance.toFixed(2)}, Angle: ${angleDeg.toFixed(1)}°`);

      // 检查是否在扇形范围内
      if (angleDeg <= this.SCYTHE_ATTACK_ANGLE / 2) {
        // 命中！造成伤害
        const damage = Math.floor(targetState.maxHP * 0.5); // 50% 最大生命值
        CharacterManager.instance.modifyHP(targetUserId, -damage);
        hitCount++;

        console.log(`[PlayerController]     ⚔️ HIT! Player ${targetUserId} at distance ${distance.toFixed(2)}, angle ${angleDeg.toFixed(1)}° - Dealt ${damage} damage`);

        // 获取更新后的状态
        const updatedState = CharacterManager.instance.getCharacterState(targetUserId);
        if (updatedState) {
          // 发送受伤事件给 DeathController
          this.eventBus.emit('player:damaged', {
            userId: targetUserId,
            damage: damage,
            currentHP: updatedState.currentHP,
          });

          // 广播血量变化事件到所有客户端
          this.communicationMgr.sendBroad('ingame:hp:update', {
            userId: targetUserId,
            currentHP: updatedState.currentHP,
            maxHP: updatedState.maxHP,
          });
          console.log(
            `[PlayerController] Broadcast HP update for ${targetUserId}: ${updatedState.currentHP}/${updatedState.maxHP}`
          );
        }
      }
    }

    console.log(`[PlayerController]   Summary: Checked ${checkedCount} players, ${survivorCount} Survivors, ${hitCount} hits`);
    
    if (hitCount === 0) {
      console.log('[PlayerController] 🎯 Scythe attack missed - no targets in range');
    } else {
      console.log(`[PlayerController] 🎯 Scythe attack hit ${hitCount} survivor(s)!`);
    }

    return hitCount > 0;
  }

  /**
   * 获取玩家朝向（前方方向向量）
   * 使用 player.facingDirection 来获取实际的朝向
   */
  private getForwardDirection(): { x: number; z: number } {
    const player = this.node.entity.player;
    if (!player || !player.facingDirection) {
      console.warn('[PlayerController] Cannot get forward direction: facingDirection not found, using default (0, -1)');
      return { x: 0, z: -1 }; // 默认朝南
    }

    const facingDir = player.facingDirection;
    const { x, z } = facingDir;
    
    // 归一化向量（确保长度为1）
    const length = Math.sqrt(x * x + z * z);
    const normalizedX = length > 0 ? x / length : 0;
    const normalizedZ = length > 0 ? z / length : -1;
    
    console.log(
      `[PlayerController] Facing direction: (${x.toFixed(3)}, ${z.toFixed(3)}), ` +
      `normalized: (${normalizedX.toFixed(3)}, ${normalizedZ.toFixed(3)})`
    );
    
    return { x: normalizedX, z: normalizedZ };
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

  /**
   * 获取基础行走速度
   */
  public getBaseWalkSpeed(): number {
    return this.baseWalkSpeed;
  }

  /**
   * 获取基础跑步速度
   */
  public getBaseRunSpeed(): number {
    return this.baseRunSpeed;
  }

  update(deltaTime: number) {
    // 更新镰刀攻击动画
    if (this.scytheAttacking) {
      this.updateScytheAttack(deltaTime);
    }
  }

  /**
   * 更新镰刀攻击动画
   */
  private updateScytheAttack(deltaTime: number): void {
    const userId = this.node.entity.player?.userId;
    if (!userId) {
      return;
    }

    const characterState = CharacterManager.instance.getCharacterState(userId);
    if (!characterState) {
      return;
    }

    const scythe = (characterState as any).scytheWearable as GameWearable | undefined;
    if (!scythe || !this.scytheOriginalOrientation) {
      this.scytheAttacking = false;
      return;
    }

    // 阶段 1: 向下挥砍（0 -> 70 度）
    if (this.scytheRotationProgress < 1) {
      this.scytheRotationProgress += deltaTime / this.SCYTHE_ANIMATION_DURATION;

      if (this.scytheRotationProgress >= 1) {
        this.scytheRotationProgress = 1;
      }

      // 计算当前旋转角度
      const currentAngle = this.SCYTHE_ROTATION_ANGLE * this.scytheRotationProgress;
      const angleRad = (currentAngle * Math.PI) / 180;

      // 创建 z 轴旋转四元数
      const halfAngle = angleRad / 2;
      const rotationQuat = new GameQuaternion(
        0,
        0,
        Math.sin(halfAngle),
        Math.cos(halfAngle)
      );

      // 应用旋转到原始方向
      scythe.orientation = this.multiplyQuaternions(
        this.scytheOriginalOrientation,
        rotationQuat
      );

      return;
    }

    // 阶段 2: 停留
    if (this.scytheHoldTimer < this.SCYTHE_HOLD_DURATION) {
      this.scytheHoldTimer += deltaTime;
      return;
    }

    // 阶段 3: 收回（70 度 -> 0）
    this.scytheRotationProgress += deltaTime / this.SCYTHE_ANIMATION_DURATION;

    if (this.scytheRotationProgress >= 2) {
      // 动画完成，恢复原始状态
      scythe.orientation = this.scytheOriginalOrientation;
      this.scytheAttacking = false;
      this.scytheRotationProgress = 0;
      this.scytheHoldTimer = 0;

      // 根据攻击结果锁定玩家和攻击
      const lockDuration = this.scytheAttackHit 
        ? this.SCYTHE_COOLDOWN_HIT 
        : this.SCYTHE_COOLDOWN_MISS;
      
      console.log(`[PlayerController] Scythe attack animation completed for ${userId}`);
      console.log(`[PlayerController] Attack ${this.scytheAttackHit ? 'HIT' : 'MISSED'} - Locking player and attack for ${lockDuration}ms`);
      
      // 锁定移动和攻击
      this.lockPlayer();
      this.attackOnCooldown = true;
      
      setTimeout(() => {
        this.unlockPlayer();
        this.attackOnCooldown = false;
        console.log(`[PlayerController] Player ${userId} unlocked after ${lockDuration}ms cooldown (movement and attack)`);
      }, lockDuration);

      return;
    }

    // 计算当前旋转角度（从 50 度回到 0）
    const returnProgress = this.scytheRotationProgress - 1; // 0 到 1
    const currentAngle = this.SCYTHE_ROTATION_ANGLE * (1 - returnProgress);
    const angleRad = (currentAngle * Math.PI) / 180;

    // 创建 z 轴旋转四元数
    const halfAngle = angleRad / 2;
    const rotationQuat = new GameQuaternion(
      0,
      0,
      Math.sin(halfAngle),
      Math.cos(halfAngle)
    );

    // 应用旋转到原始方向
    scythe.orientation = this.multiplyQuaternions(
      this.scytheOriginalOrientation,
      rotationQuat
    );
  }

  /**
   * 四元数乘法
   */
  private multiplyQuaternions(a: GameQuaternion, b: GameQuaternion): GameQuaternion {
    const ax = a.x, ay = a.y, az = a.z, aw = a.w;
    const bx = b.x, by = b.y, bz = b.z, bw = b.w;

    return new GameQuaternion(
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz
    );
  }

  /**
   * 组件销毁时清理
   */
  onDestroy(): void {
    if (this.attackButtonToken) {
      this.attackButtonToken.cancel();
      this.attackButtonToken = null;
    }
  }
}
