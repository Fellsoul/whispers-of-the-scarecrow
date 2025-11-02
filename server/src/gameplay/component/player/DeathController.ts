import { _decorator, Component, EntityNode } from '@dao3fun/component';
import { EventBus } from '../../../core/events/EventBus';
import { CommunicationMgr } from '../../../presentation/CommunicationGateway';
import { CharacterManager } from '../../mgr/CharacterManager';
import { PlayerManager } from '../../mgr/PlayerManager';
import { Logger } from '../../../core/utils/Logger';
import type { QteObject } from '../qteObject/QteObject';


const { apclass } = _decorator;

/**
 * DeathController - 玩家死亡和受伤处理组件
 * 
 * 【架构说明】
 * 血量管理：所有角色血量数据存储在 RoleController 的 roleInstance 中
 * - RoleController: 管理角色的 HP、状态、技能等游戏机制
 * - CharacterManager: 缓存角色分配信息（faction、角色ID），血量从 RoleController 同步
 * - DeathController: 监听血量事件，处理死亡逻辑，通过事件系统与 RoleController 交互
 * 
 * 【事件流】
 * 1. 受伤：PlayerController -> 'player:damaged' -> DeathController（接收血量信息）
 * 2. 治疗：DeathController -> 'player:userId:heal' -> RoleController（恢复血量）
 * 3. 死亡判定：基于接收到的 currentHP 参数判断
 * 
 * 【功能】
 * - 受伤时的血迹粒子特效
 * - 死亡时的倒地动画和状态管理
 * - 生成救援 QTE 实体
 * - 60秒倒计时和救援逻辑
 */
@apclass('DeathController')
export class DeathController extends Component<GameEntity> {
  /** 玩家 userId */
  private userId: string = '';

  /** 当前是否处于死亡状态 */
  private isDead: boolean = false;

  /** 死亡倒计时（毫秒） */
  private deathCountdown: number = 0;

  /** 最大死亡倒计时时间（60秒） */
  private readonly MAX_DEATH_TIME: number = 60000;

  /** 受伤粒子特效实体 */
  private bloodParticleEntity: GameEntity | null = null;

  /** 受伤粒子特效剩余时间（毫秒） */
  private bloodParticleTimer: number = 0;

  /** 救援 QTE 实体 */
  private rescueQteEntity: GameEntity | null = null;

  /** 事件总线 */
  private eventBus: EventBus = EventBus.instance;

  /** 通信管理器 */
  private commMgr: CommunicationMgr = CommunicationMgr.instance;

  /** 原始的玩家朝向（用于恢复） */
  private originalOrientation: GameQuaternion | null = null;

  start() {
    // 获取玩家 userId
    if (this.node.entity.player) {
      this.userId = this.node.entity.player.userId;
      Logger.log(`[DeathController] Component started for player ${this.userId}`);
    } else {
      Logger.error('[DeathController] Player not found in entity');
      return;
    }

    // 监听玩家受伤事件
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听玩家受伤事件（由 IngameProfileManager 或其他系统发出）
    this.eventBus.on<{ userId: string; damage: number; currentHP: number }>(
      'player:damaged',
      (data) => {
        if (data && data.userId === this.userId) {
          this.handleDamage(data.damage, data.currentHP);
        }
      }
    );

    // 监听救援成功事件
    this.eventBus.on<{ userId: string }>('player:rescued', (data) => {
      if (data && data.userId === this.userId) {
        this.handleRescue();
      }
    });

    Logger.log(`[DeathController] Event listeners setup for player ${this.userId}`);
  }

  /**
   * 处理玩家受伤
   */
  private handleDamage(damage: number, currentHP: number): void {
    Logger.log(
      `[DeathController] Player ${this.userId} took ${damage} damage, current HP: ${currentHP}`
    );

    // 显示血迹粒子特效（持续1秒）
    this.showBloodParticles();

    // 如果血量归零，触发死亡
    if (currentHP <= 0 && !this.isDead) {
      this.handleDeath();
    }
  }

  /**
   * 显示血迹粒子特效
   */
  private showBloodParticles(): void {
    // 如果已有粒子特效，重置计时器
    if (this.bloodParticleEntity) {
      this.bloodParticleTimer = 1000;
      return;
    }

    try {
      // 创建粒子特效实体
      this.bloodParticleEntity = world.createEntity({
        mesh: '',
        meshColor: new GameRGBAColor(0.00,0.00,0.00,1.00),
        meshScale: new GameVector3(0.1, 0.1, 0.1),
        collides: false,
        gravity: false,
        fixed: true,
        particleRate: 50,
        particleRateSpread: 10,
        particleLimit: 100,
        particleLifetime: 0.5,
        particleLifetimeSpread: 0.2,
        particleColor: [
          new GameRGBColor(2, 0, 0), // 鲜红色（发光）
          new GameRGBColor(1.5, 0, 0),
          new GameRGBColor(1, 0, 0),
          new GameRGBColor(0.5, 0, 0),
          new GameRGBColor(0.2, 0, 0), // 暗红色
        ],
        particleSize: [0.3, 0.4, 0.3, 0.2, 0.1],
        particleSizeSpread: 0.1,
        particleVelocity: new GameVector3(0, 0.05, 0),
        particleVelocitySpread: new GameVector3(0.15, 0.15, 0.15),
        particleAcceleration: new GameVector3(0, -0.02, 0),
        particleDamping: 0.95,
        particleNoise: 0.05,
        particleNoiseFrequency: 2,
      });

      // 将粒子实体绑定到玩家位置
      if (this.bloodParticleEntity) {
        this.bloodParticleEntity.position.copy(this.node.entity.position);
      }
      if (this.bloodParticleEntity) {
        this.bloodParticleEntity.position.y += 1; // 稍微高一点
      }

      // 设置计时器（1秒）
      this.bloodParticleTimer = 1000;

      Logger.log(`[DeathController] Blood particles created for player ${this.userId}`);
    } catch (error) {
      Logger.error('[DeathController] Failed to create blood particles:', error);
    }
  }

  /**
   * 处理玩家死亡
   */
  private handleDeath(): void {
    Logger.log(`[DeathController] Player ${this.userId} is dying...`);

    this.isDead = true;
    this.deathCountdown = this.MAX_DEATH_TIME;

    // 保存原始朝向
    this.originalOrientation = new GameQuaternion(this.node.entity.meshOrientation.x, this.node.entity.meshOrientation.y, this.node.entity.meshOrientation.z, this.node.entity.meshOrientation.w);

    // 让玩家倒地（X轴旋转90度）
    this.makePlayerFallDown();

    // 锁定玩家移动
    this.lockPlayerMovement();

    // 生成救援 QTE 实体
    this.spawnRescueQte();

    // 通知客户端玩家死亡
    this.commMgr.sendBroad('player:death', {
      userId: this.userId,
      countdown: this.MAX_DEATH_TIME,
    });

    Logger.log(
      `[DeathController] Player ${this.userId} has fallen, rescue countdown started (${this.MAX_DEATH_TIME / 1000}s)`
    );
  }

  /**
   * 让玩家倒地（X轴旋转90度）
   */
  private makePlayerFallDown(): void {
    try {
      const player = this.node.entity.player;
      if (!player) return;

      // 使用四元数旋转（X轴旋转90度）
      // 将欧拉角 (90, 0, 0) 转换为四元数
      const radians = (Math.PI / 2); // 90度
      const s = Math.sin(radians / 2);
      const c = Math.cos(radians / 2);

      // 绕X轴旋转的四元数: (sin(θ/2), 0, 0, cos(θ/2))
      const fallDownQuat = new GameQuaternion(s, 0, 0, c);

      // 应用旋转到玩家模型
      this.node.entity.meshOrientation = fallDownQuat;

      Logger.log(`[DeathController] Player ${this.userId} fell down (X-axis rotated 90°)`);
    } catch (error) {
      Logger.error('[DeathController] Failed to make player fall down:', error);
    }
  }

  /**
   * 锁定玩家移动（使用 PlayerController 的方法）
   */
  private lockPlayerMovement(): void {
    try {
      const playerInfo = PlayerManager.instance.getOnlinePlayer(this.userId);
      if (!playerInfo || !playerInfo.entityNode) {
        Logger.error(`[DeathController] Cannot lock player: player info not found for ${this.userId}`);
        return;
      }

      // 获取 PlayerController 组件
      const playerController = playerInfo.entityNode.getComponent('PlayerController' as any);
      if (playerController && typeof (playerController as any).lockPlayer === 'function') {
        (playerController as any).lockPlayer();
        Logger.log(`[DeathController] Player ${this.userId} movement locked via PlayerController`);
      } else {
        Logger.error(`[DeathController] PlayerController not found or lockPlayer method unavailable for ${this.userId}`);
      }
    } catch (error) {
      Logger.error('[DeathController] Failed to lock player movement:', error);
    }
  }

  /**
   * 解锁玩家移动（使用 PlayerController 的方法）
   */
  private unlockPlayerMovement(): void {
    try {
      const playerInfo = PlayerManager.instance.getOnlinePlayer(this.userId);
      if (!playerInfo || !playerInfo.entityNode) {
        Logger.error(`[DeathController] Cannot unlock player: player info not found for ${this.userId}`);
        return;
      }

      // 获取 PlayerController 组件
      const playerController = playerInfo.entityNode.getComponent('PlayerController' as any);
      if (playerController && typeof (playerController as any).unlockPlayer === 'function') {
        (playerController as any).unlockPlayer();
        Logger.log(`[DeathController] Player ${this.userId} movement unlocked via PlayerController`);
      } else {
        Logger.error(`[DeathController] PlayerController not found or unlockPlayer method unavailable for ${this.userId}`);
      }
    } catch (error) {
      Logger.error('[DeathController] Failed to unlock player movement:', error);
    }
  }

  /**
   * 生成救援 QTE 实体
   */
  private spawnRescueQte(): void {
    try {
      const playerPos = this.node.entity.position;

      // 在玩家位置上方创建救援 QTE 实体
      this.rescueQteEntity = world.createEntity({
        mesh: 'mesh/heartMesh.vb' as GameModelAssets, // 使用心形模型
        meshColor: new GameRGBAColor(1.00, 0.20, 0.20, 1.00),
        meshScale: new GameVector3(0.04, 0.04, 0.04),
        collides: false,
        gravity: false,
        fixed: true,
        position: new GameVector3(playerPos.x, playerPos.y + 1.5, playerPos.z),
      });

      // 为救援实体添加交互功能
      if (this.rescueQteEntity) {
        this.rescueQteEntity.enableInteract = true;
      this.rescueQteEntity.interactRadius = 3;
      this.rescueQteEntity.interactColor = new GameRGBColor(1, 0, 0);
      this.rescueQteEntity.interactHint = `救援玩家`;

      // 添加 EntityNode 包装器以便添加组件
      const rescueNode = new EntityNode(this.rescueQteEntity);

      // 动态导入并添加 QteObject 组件（异步处理）
      this.addRescueQteComponent(rescueNode);

      Logger.log(
        `[DeathController] Rescue QTE entity spawned at [${playerPos.x}, ${playerPos.y + 1.5}, ${playerPos.z}]`
      );
    }} catch (error) {
      Logger.error('[DeathController] Failed to spawn rescue QTE:', error);
    }
  }

  /**
   * 添加救援 QTE 组件
   */
  private async addRescueQteComponent(rescueNode: EntityNode<GameEntity>): Promise<void> {
    try {
      const { QteObject } = await import('../qteObject/QteObject');

      rescueNode.addComponent(QteObject);
      const qteComponent = rescueNode.getComponent(QteObject);

      if (qteComponent) {
        // 配置救援 QTE（类型断言以访问 initialize 方法）
        const qteInit = qteComponent as unknown as {
          initialize: (config: {
            baseDuration: number;
            qteCount: number;
            requiredItems: string[];
            allowProgressCache: boolean;
            displayNameKey: string;
            interactionHintKey: string;
            completeEvent?: {
              eventName: string;
              eventData?: Record<string, unknown>;
            };
          }) => void;
        };

        qteInit.initialize({
          baseDuration: 2000, // 2秒 QTE
          qteCount: 1,
          requiredItems: [], // 不需要物品
          allowProgressCache: false, // 不允许缓存进度
          displayNameKey: 'rescue',
          interactionHintKey: 'rescue_hint',
          completeEvent: {
            eventName: 'player:rescued',
            eventData: {
              rescuedUserId: this.userId,
            },
          },
        });

        // 监听救援完成事件（通过 EventBus）
        this.eventBus.on<{ rescuedUserId: string; userId: string }>('player:rescued', (data) => {
          if (data && data.rescuedUserId === this.userId) {
            Logger.log(`[DeathController] Received rescue event for ${this.userId} from ${data.userId}`);
            this.handleRescue();
          }
        });

        // 设置交互过滤器：只允许非 overseer、非自己的玩家交互
        this.setupRescueInteractionFilter();

        Logger.log(`[DeathController] Rescue QTE component added and configured`);
      }
    } catch (error) {
      Logger.error('[DeathController] Failed to add rescue QTE component:', error);
    }
  }

  /**
   * 设置救援交互过滤器
   */
  private setupRescueInteractionFilter(): void {
    if (!this.rescueQteEntity) return;

    // 监听交互触发事件
    this.rescueQteEntity.onInteract(({ entity }) => {
      if (!entity.player) return false;

      const rescuerUserId = entity.player.userId;

      // 不允许自己救自己
      if (rescuerUserId === this.userId) {
        Logger.log(`[DeathController] ❌ Player ${rescuerUserId} cannot rescue themselves`);
        return false;
      }

      // 不允许 overseer 救援
      const rescuerCharacter = CharacterManager.instance.getCharacterState(rescuerUserId);
      if (rescuerCharacter && rescuerCharacter.character.faction === 'Overseer') {
        Logger.log(`[DeathController] ❌ Overseer ${rescuerUserId} cannot rescue players`);
        return false;
      }

      // 不允许濒死状态的玩家救援别人
      if (this.isPlayerDying(rescuerUserId)) {
        Logger.log(`[DeathController] ❌ Dying player ${rescuerUserId} cannot rescue others`);
        return false;
      }

      Logger.log(`[DeathController] ✅ Player ${rescuerUserId} can rescue ${this.userId}`);
      return true;
    });
  }

  /**
   * 检查玩家是否处于濒死状态
   * @param userId 玩家ID
   * @returns true = 濒死，false = 正常
   */
  private isPlayerDying(userId: string): boolean {
    const playerInfo = PlayerManager.instance.getOnlinePlayer(userId);
    if (!playerInfo || !playerInfo.entityNode) {
      return false;
    }

    // 获取该玩家的 DeathController 组件
    const deathController = playerInfo.entityNode.getComponent('DeathController' as any);
    if (!deathController) {
      return false;
    }

    // 通过类型断言访问 isDying 方法
    const deathCtrl = deathController as unknown as { isDying: () => boolean };
    if (typeof deathCtrl.isDying === 'function') {
      return deathCtrl.isDying();
    }

    return false;
  }

  /**
   * 公共方法：获取当前是否处于濒死状态
   */
  public isDying(): boolean {
    return this.isDead;
  }

  /**
   * 静态方法：检查指定玩家是否死亡或濒死（不能进行交互）
   * @param userId 玩家ID
   * @returns true = 死亡/濒死，false = 正常可交互
   */
  public static isPlayerDeadOrDying(userId: string): boolean {
    const playerInfo = PlayerManager.instance.getOnlinePlayer(userId);
    if (!playerInfo || !playerInfo.entityNode) {
      return false;
    }

    // 获取该玩家的 DeathController 组件
    const deathController = playerInfo.entityNode.getComponent('DeathController' as any) as any;
    if (!deathController) {
      return false;
    }

    // 检查是否濒死
    if (typeof deathController.isDying === 'function' && deathController.isDying()) {
      return true;
    }

    // 检查是否彻底死亡（spectator 模式）
    const player = playerInfo.entity?.player;
    if (player && player.spectator) {
      return true;
    }

    return false;
  }

  /**
   * 清空玩家背包
   */
  private clearPlayerInventory(): void {
    const playerInfo = PlayerManager.instance.getOnlinePlayer(this.userId);
    if (!playerInfo || !playerInfo.entityNode) {
      Logger.warn(`[DeathController] Cannot clear inventory - player info not found for ${this.userId}`);
      return;
    }

    // 获取 InventoryController 组件
    const inventoryController = playerInfo.entityNode.getComponent('InventoryController' as any);
    if (inventoryController && typeof (inventoryController as any).clearInventory === 'function') {
      (inventoryController as any).clearInventory();
      Logger.log(`[DeathController] Cleared inventory for player ${this.userId}`);
    } else {
      Logger.warn(`[DeathController] InventoryController not found for player ${this.userId}`);
    }
  }

  /**
   * 处理救援成功
   */
  private handleRescue(): void {
    if (!this.isDead) return;

    // 检查玩家是否已经彻底死亡（spectator 模式）
    const player = this.node.entity.player;
    if (player && player.spectator) {
      Logger.log(`[DeathController] ❌ Cannot rescue ${this.userId} - player is permanently dead (spectator mode)`);
      return;
    }

    Logger.log(`[DeathController] Player ${this.userId} was rescued!`);

    this.isDead = false;
    this.deathCountdown = 0;

    // 恢复玩家朝向
    if (this.originalOrientation) {
      this.node.entity.meshOrientation = this.originalOrientation;
      this.originalOrientation = null;
    }

    // 解锁玩家移动
    this.unlockPlayerMovement();

    // 恢复玩家血量（25%）- 通过 RoleController 的事件系统
    const playerInfo = PlayerManager.instance.getOnlinePlayer(this.userId);
    if (playerInfo && playerInfo.entityNode) {
      const roleController = playerInfo.entityNode.getComponent('RoleController' as any);
      if (roleController && typeof (roleController as any).getRoleStatus === 'function') {
        const status = (roleController as any).getRoleStatus();
        if (status) {
          const restoredHP = Math.floor(status.maxHP * 0.25);
          
          Logger.log(`[DeathController] 🏥 Player ${this.userId} rescue heal - Current HP: ${status.currentHP}, Max HP: ${status.maxHP}, Restore amount: ${restoredHP}`);
          
          // 触发 RoleController 的 heal 事件（修正：使用 role: 前缀）
          this.eventBus.emit(`role:${this.userId}:heal`, {
            amount: restoredHP,
          });
          
          // 延迟检查血量是否恢复
          setTimeout(() => {
            const newStatus = (roleController as any).getRoleStatus();
            Logger.log(`[DeathController] 🩺 After heal - Current HP: ${newStatus.currentHP}/${newStatus.maxHP}`);
          }, 100);
        } else {
          Logger.error(`[DeathController] ❌ Cannot get role status for ${this.userId}`);
        }
      } else {
        Logger.error(`[DeathController] ❌ RoleController not found for ${this.userId}`);
      }
    } else {
      Logger.error(`[DeathController] ❌ Player info or entityNode not found for ${this.userId}`);
    }

    // 销毁救援 QTE 实体
    if (this.rescueQteEntity) {
      this.rescueQteEntity.destroy();
      this.rescueQteEntity = null;
    }

    // 通知客户端玩家复活
    this.commMgr.sendBroad('player:revived', {
      userId: this.userId,
    });

    Logger.log(`[DeathController] Player ${this.userId} has been revived`);
  }

  /**
   * 处理死亡超时（60秒倒计时结束）
   * 玩家彻底死亡，变成观察者模式
   */
  private handleDeathTimeout(): void {
    Logger.log(`[DeathController] Player ${this.userId} death timeout - permanent death (spectator mode)`);

    const player = this.node.entity.player;
    if (!player) {
      Logger.error(`[DeathController] Player not found for ${this.userId}`);
      return;
    }

    // 设置为观察者模式（可穿墙）
    player.spectator = true;
    
    // 设置为隐身
    player.invisible = true;
    
    // 降低金属度（使玩家更透明）
    player.metalness = 0;

    Logger.log(`[DeathController] Player ${this.userId} set to spectator mode (invisible, spectator, metalness=0)`);

    // 确保玩家移动保持锁定（彻底死亡后不能移动）
    this.lockPlayerMovement();
    Logger.log(`[DeathController] Player ${this.userId} movement locked (permanent death)`);

    // 清空背包物品
    this.clearPlayerInventory();

    // 销毁救援 QTE 实体（玩家已彻底死亡，不能再被救援）
    if (this.rescueQteEntity) {
      this.rescueQteEntity.destroy();
      this.rescueQteEntity = null;
      Logger.log(`[DeathController] Rescue QTE destroyed for ${this.userId} (permanent death)`);
    }

    // 通知客户端玩家彻底死亡（更新 UI 为死亡状态）
    this.commMgr.sendBroad('player:permanent_death', {
      userId: this.userId,
    });

    Logger.log(`[DeathController] Player ${this.userId} permanently dead - UI updated to Dead status`);
  }

  update(deltaTime: number) {
    // 更新血迹粒子特效计时器
    if (this.bloodParticleTimer > 0) {
      this.bloodParticleTimer -= deltaTime;

      if (this.bloodParticleTimer <= 0 && this.bloodParticleEntity) {
        // 销毁粒子实体
        this.bloodParticleEntity.destroy();
        this.bloodParticleEntity = null;
        Logger.log(`[DeathController] Blood particles destroyed for player ${this.userId}`);
      }
    }

    // 更新死亡倒计时
    if (this.isDead && this.deathCountdown > 0) {
      this.deathCountdown -= deltaTime;

      // 每5秒广播一次倒计时状态
      if (Math.floor(this.deathCountdown / 1000) % 5 === 0) {
        this.commMgr.sendBroad('player:death:countdown', {
          userId: this.userId,
          remainingTime: this.deathCountdown,
        });
      }

      // 倒计时结束
      if (this.deathCountdown <= 0) {
        this.handleDeathTimeout();
      }
    }
  }

  /**
   * 组件销毁时清理
   */
  onDestroy(): void {
    // 清理粒子实体
    if (this.bloodParticleEntity) {
      this.bloodParticleEntity.destroy();
      this.bloodParticleEntity = null;
    }

    // 清理救援 QTE 实体
    if (this.rescueQteEntity) {
      this.rescueQteEntity.destroy();
      this.rescueQteEntity = null;
    }

    // 移除事件监听
    this.eventBus.off('player:damaged');
    this.eventBus.off('player:rescued');

    Logger.log(`[DeathController] Component destroyed for player ${this.userId}`);
  }
}