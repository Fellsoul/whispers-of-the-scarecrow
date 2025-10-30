import { Singleton } from '../../core/patterns/Singleton';
import { EventBus } from '../../core/events/EventBus';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import { CharacterManager, CharacterEventType } from './CharacterManager';

/**
 * IngameProfileManager - 游戏中玩家状态广播管理器
 * 负责将CharacterManager的状态同步到所有客户端
 */
export class IngameProfileManager extends Singleton<IngameProfileManager>() {
  private eventBus: EventBus;
  private commMgr: CommunicationMgr;
  private charMgr: CharacterManager;

  constructor() {
    super();
    this.eventBus = EventBus.instance;
    this.commMgr = CommunicationMgr.instance;
    this.charMgr = CharacterManager.instance;
  }

  /**
   * 初始化管理器
   */
  public initialize(): void {
    this.subscribeCharacterEvents();
    this.subscribeClientRequests();
    console.log('[IngameProfileManager] Initialized');
  }

  /**
   * 订阅CharacterManager的事件，同步到客户端
   */
  private subscribeCharacterEvents(): void {
    // 监听HP变化
    this.eventBus.on(CharacterEventType.HP_CHANGED, (data: unknown) => {
      const eventData = data as { userId: string };
      this.broadcastProfileUpdate(eventData.userId);
    });

    // 监听状态效果变化
    this.eventBus.on(CharacterEventType.STATUS_ADDED, (data: unknown) => {
      const eventData = data as { userId: string };
      this.broadcastProfileUpdate(eventData.userId);
    });

    this.eventBus.on(CharacterEventType.STATUS_REMOVED, (data: unknown) => {
      const eventData = data as { userId: string };
      this.broadcastProfileUpdate(eventData.userId);
    });

    // 监听死亡/复活
    this.eventBus.on(CharacterEventType.DIED, (data: unknown) => {
      const eventData = data as { userId: string };
      this.broadcastProfileUpdate(eventData.userId);
    });

    this.eventBus.on(CharacterEventType.REVIVED, (data: unknown) => {
      const eventData = data as { userId: string };
      this.broadcastProfileUpdate(eventData.userId);
    });
  }

  /**
   * 订阅客户端请求
   */
  private subscribeClientRequests(): void {
    // 监听客户端请求所有玩家状态
    this.eventBus.on('ingame:profiles:request', () => {
      this.broadcastAllProfiles();
    });

    // 监听客户端角色切换事件（来自Readiness场景）
    this.eventBus.on('readiness:character:changed', (data: unknown) => {
      const eventData = data as {
        characterId: string;
        _senderEntity?: GameEntity;
      };
      const userId = eventData._senderEntity?.player?.userId;

      if (!userId) {
        console.warn(
          '[IngameProfileManager] Character change event without valid userId'
        );
        return;
      }

      console.log(
        `[IngameProfileManager] Player ${userId} changed character to ${eventData.characterId}`
      );

      // 更新CharacterManager中的角色ID（如果需要）
      this.charMgr.updateCharacterId(userId, eventData.characterId);

      // 广播给所有客户端
      this.broadcastProfileUpdate(userId);
    });

    // 监听客户端准备状态变化（来自Readiness场景）
    this.eventBus.on('readiness:player:state', (data: unknown) => {
      const eventData = data as {
        isReady: boolean;
        characterId: string;
        _senderEntity?: GameEntity;
      };
      const userId = eventData._senderEntity?.player?.userId;

      if (!userId) {
        console.warn(
          '[IngameProfileManager] Ready state event without valid userId'
        );
        return;
      }

      console.log(
        `[IngameProfileManager] Player ${userId} ready state changed to ${eventData.isReady}`
      );

      // 广播准备状态给所有客户端
      this.broadcastReadyStateUpdate(userId, eventData.isReady);
    });
  }

  /**
   * 广播单个玩家的状态更新
   * @param userId 玩家ID
   */
  private broadcastProfileUpdate(userId: string): void {
    const state = this.charMgr.getCharacterState(userId);
    if (!state) {
      return;
    }

    const profileData = {
      userId: state.userId,
      playerName: state.entity.player?.name || 'Unknown',
      avatar: state.entity.player?.avatar || '', // 玩家头像
      characterId: state.character.id,
      currentHP: state.currentHP,
      maxHP: state.maxHP,
      isAlive: state.isAlive,
      carryingItem: undefined, // TODO: 从PlayerController获取
      statusEffects: state.statusEffects.map((e) => e.id),
    };

    // 广播给所有客户端
    this.commMgr.sendBroad('ingame:profile:update', profileData);

    console.log(
      `[IngameProfileManager] Broadcast profile update for ${userId}`
    );
  }

  /**
   * 广播所有玩家的状态
   */
  public broadcastAllProfiles(): void {
    const allStates = this.charMgr.getAllCharacterStates();
    const profiles = allStates.map((state) => ({
      userId: state.userId,
      playerName: state.entity.player?.name || 'Unknown',
      avatar: state.entity.player?.avatar || '', // 玩家头像
      characterId: state.character.id,
      currentHP: state.currentHP,
      maxHP: state.maxHP,
      isAlive: state.isAlive,
      carryingItem: undefined, // TODO: 从PlayerController获取
      statusEffects: state.statusEffects.map((e) => e.id),
    }));

    this.commMgr.sendBroad('ingame:profiles:batch', profiles);

    console.log(`[IngameProfileManager] Broadcast ${profiles.length} profiles`);
  }

  /**
   * 广播玩家准备状态更新
   * @param userId 玩家ID
   * @param isReady 是否准备
   */
  private broadcastReadyStateUpdate(userId: string, isReady: boolean): void {
    // 广播准备状态给所有客户端
    this.commMgr.sendBroad('ingame:profile:ready', {
      userId,
      isReady,
    });

    console.log(
      `[IngameProfileManager] Broadcast ready state for ${userId}: ${isReady}`
    );
  }

  /**
   * 通知玩家离开
   * @param userId 玩家ID
   */
  public notifyPlayerLeft(userId: string): void {
    this.commMgr.sendBroad('ingame:profile:remove', { userId });
    console.log(`[IngameProfileManager] Notified player ${userId} left`);
  }
}
