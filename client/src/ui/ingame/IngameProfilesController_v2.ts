import { EventBus } from '../../core/events/EventBus';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import { IngameProfilesUI } from './IngameProfilesUI';
import { IngameProfilesService } from './IngameProfilesService';
import { CharacterRegistry } from '@shares/character/CharacterRegistry';
import type { PlayerProfileData } from './events';
import {
  INGAME_PROFILE_UPDATE,
  INGAME_PROFILES_BATCH,
  INGAME_PROFILE_REMOVE,
  INGAME_PROFILES_REQUEST,
  INGAME_PROFILE_READY,
} from './events';
import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';

export type UiScreenInstance = UiIndex_screen;

/**
 * IngameProfilesController - 游戏中玩家状态控制器
 * 负责协调UI和Service，处理事件通信
 */
export class IngameProfilesController {
  private eventBus: EventBus;
  private communicationMgr: CommunicationMgr;
  private ui: IngameProfilesUI;
  private service: IngameProfilesService;

  constructor() {
    // 使用单例获取EventBus和CommunicationMgr
    this.eventBus = EventBus.instance;
    this.communicationMgr = CommunicationMgr.instance;

    // 内部创建UI和Service实例
    this.ui = new IngameProfilesUI();
    this.service = new IngameProfilesService();
  }

  /**
   * 初始化控制器
   * @param screen UI屏幕
   * @param maxPlayers 最大玩家数（4或8）
   * @param unlockedCharacters 已解锁的角色ID列表
   */
  public initialize(
    screen: UiScreenInstance,
    maxPlayers: number = 4,
    unlockedCharacters: string[] = []
  ): void {
    try {
      console.log('[IngameProfilesController] Starting initialization...');

      // 初始化Service
      this.service.initialize(maxPlayers);
      console.log('[IngameProfilesController] Service initialized');

      // 初始化UI
      this.ui.initialize(screen, maxPlayers, unlockedCharacters);
      console.log('[IngameProfilesController] UI initialized');

      // 订阅事件
      this.subscribeEvents();
      console.log('[IngameProfilesController] Events subscribed');

      // 自动请求服务端数据
      console.log(
        '[IngameProfilesController] About to request all profiles...'
      );
      this.requestAllProfiles();
      console.log('[IngameProfilesController] Request sent');

      console.log(
        `[IngameProfilesController] Initialized for ${maxPlayers} players, ${unlockedCharacters.length} unlocked characters`
      );
    } catch (error) {
      console.error('[IngameProfilesController] Initialization error:', error);
      throw error;
    }
  }

  /**
   * 订阅事件
   */
  private subscribeEvents(): void {
    // 监听服务端推送的单个玩家更新
    this.eventBus.on<PlayerProfileData>(INGAME_PROFILE_UPDATE, (data) => {
      if (data) {
        this.handleProfileUpdate(data);
      }
    });

    // 监听批量更新
    this.eventBus.on<PlayerProfileData[]>(
      INGAME_PROFILES_BATCH,
      (dataArray) => {
        if (dataArray) {
          this.handleBatchUpdate(dataArray);
        }
      }
    );

    // 监听玩家离开
    this.eventBus.on<{ userId: string }>(INGAME_PROFILE_REMOVE, (data) => {
      if (data) {
        this.handleProfileRemove(data.userId);
      }
    });

    // 监听玩家准备状态变化
    this.eventBus.on<{ userId: string; isReady: boolean }>(
      INGAME_PROFILE_READY,
      (data) => {
        if (data) {
          this.handleReadyStateChange(data.userId, data.isReady);
        }
      }
    );

    // 监听玩家血量变化
    this.eventBus.on<{ userId: string; currentHP: number; maxHP: number }>(
      'ingame:hp:update',
      (data) => {
        if (data) {
          this.handleHPUpdate(data.userId, data.currentHP, data.maxHP);
        }
      }
    );

    // 监听玩家携带物品变化
    this.eventBus.on<{ userId: string; itemImageUrl: string | null }>(
      'ingame:item:update',
      (data) => {
        if (data) {
          this.handleItemUpdate(data.userId, data.itemImageUrl);
        }
      }
    );

    // 监听服务端发送的当前玩家 userId
    this.eventBus.on<{ userId: string }>(
      'client:userId:set',
      (data) => {
        if (data && data.userId) {
          console.log(
            `[IngameProfilesController] Received current userId from server: ${data.userId}`
          );
          this.ui.setCurrentPlayerByUserId(data.userId);
        }
      }
    );

    console.log('[IngameProfilesController] Events subscribed');
  }

  /**
   * 处理单个玩家profile更新
   * @param data 玩家数据
   */
  private handleProfileUpdate(data: PlayerProfileData): void {
    // 检查是否为 Overseer 角色，如果是则不显示
    const character = CharacterRegistry.getById(data.characterId);
    console.log(
      `[IngameProfilesController] Checking player ${data.userId} (${data.playerName}): characterId=${data.characterId}, character=${character ? character.name : 'NOT_FOUND'}, faction=${character ? character.faction : 'UNKNOWN'}`
    );
    
    if (character && character.faction === 'Overseer') {
      console.log(
        `[IngameProfilesController] ⛔ Skipping profile update for Overseer ${data.userId} (${data.playerName})`
      );
      return;
    }

    // 1. 更新Service数据
    const slotIndex = this.service.updatePlayerData(data);

    if (slotIndex === -1) {
      console.warn(
        `[IngameProfilesController] No slot available for player ${data.userId}`
      );
      return;
    }

    // 2. 更新UI显示
    this.ui.updateProfile(slotIndex, data);

    // 3. 根据实际玩家数量更新显隐
    const occupiedSlots = this.service.getOccupiedSlots();
    this.ui.updateProfileVisibilityByCount(occupiedSlots);

    console.log(
      `[IngameProfilesController] Updated profile for ${data.playerName} at slot ${slotIndex}`
    );
  }

  /**
   * 处理批量更新
   * @param dataArray 玩家数据数组
   */
  private handleBatchUpdate(dataArray: PlayerProfileData[]): void {
    console.log(
      `[IngameProfilesController] Handling batch update of ${dataArray.length} players`
    );

    // 过滤掉 Overseer 角色
    const filteredData = dataArray.filter((data) => {
      const character = CharacterRegistry.getById(data.characterId);
      console.log(
        `[IngameProfilesController] Batch checking player ${data.userId} (${data.playerName}): characterId=${data.characterId}, character=${character ? character.name : 'NOT_FOUND'}, faction=${character ? character.faction : 'UNKNOWN'}`
      );
      
      if (character && character.faction === 'Overseer') {
        console.log(
          `[IngameProfilesController] ⛔ Filtering out Overseer ${data.userId} (${data.playerName}) from batch update`
        );
        return false;
      }
      return true;
    });

    console.log(
      `[IngameProfilesController] After filtering: ${filteredData.length} players (${dataArray.length - filteredData.length} Overseer(s) filtered)`
    );

    // 批量更新Service
    this.service.updateBatch(filteredData);

    // 逐个更新UI
    filteredData.forEach((data) => {
      const slotIndex = this.service.getPlayerSlot(data.userId);
      if (slotIndex !== -1) {
        this.ui.updateProfile(slotIndex, data);
      }
    });

    // 根据实际玩家数量更新显隐
    const occupiedSlots = this.service.getOccupiedSlots();
    this.ui.updateProfileVisibilityByCount(occupiedSlots);
  }

  /**
   * 处理玩家离开
   * @param userId 玩家ID
   */
  private handleProfileRemove(userId: string): void {
    // 1. 从Service移除
    const slotIndex = this.service.removePlayerData(userId);

    if (slotIndex === -1) {
      console.warn(`[IngameProfilesController] Player ${userId} not found`);
      return;
    }

    // 2. 隐藏UI
    this.ui.hideProfile(slotIndex);

    // 3. 根据剩余玩家数量更新显隐
    const occupiedSlots = this.service.getOccupiedSlots();
    this.ui.updateProfileVisibilityByCount(occupiedSlots);

    console.log(
      `[IngameProfilesController] Removed player ${userId} from slot ${slotIndex}`
    );
  }

  /**
   * 处理玩家准备状态变化
   * @param userId 玩家ID
   * @param isReady 是否准备
   */
  private handleReadyStateChange(userId: string, isReady: boolean): void {
    const slotIndex = this.service.getPlayerSlot(userId);

    if (slotIndex !== -1) {
      // 更新UI颜色
      this.ui.updateReadyState(slotIndex, isReady);

      console.log(
        `[IngameProfilesController] Updated ready state for player ${userId} at slot ${slotIndex}: ${isReady}`
      );
    }
  }

  /**
   * 请求服务端发送所有玩家状态
   */
  public requestAllProfiles(): void {
    this.communicationMgr.send(INGAME_PROFILES_REQUEST, {});
    console.log(
      '[IngameProfilesController] Requested all profiles from server'
    );
  }

  /**
   * 更新已解锁角色列表
   * @param unlockedCharacters 已解锁的角色ID列表
   */
  public updateUnlockedCharacters(unlockedCharacters: string[]): void {
    this.ui.updateUnlockedCharacters(unlockedCharacters);

    // 重新渲染所有profile（过滤掉 Overseer）
    const allData = this.service.getAllPlayerData();
    allData.forEach((data) => {
      // 检查是否为 Overseer
      const character = CharacterRegistry.getById(data.characterId);
      if (character && character.faction === 'Overseer') {
        return; // 跳过 Overseer
      }

      const slotIndex = this.service.getPlayerSlot(data.userId);
      if (slotIndex !== -1) {
        this.ui.updateProfile(slotIndex, data);
      }
    });

    console.log(
      `[IngameProfilesController] Updated unlocked characters: ${unlockedCharacters.length}`
    );
  }

  /**
   * 获取玩家数据
   * @param userId 玩家ID
   */
  public getPlayerData(userId: string): PlayerProfileData | null {
    return this.service.getPlayerData(userId);
  }

  /**
   * 获取在线玩家数量
   */
  public getPlayerCount(): number {
    return this.service.getPlayerCount();
  }

  /**
   * 获取存活玩家数量
   */
  public getAlivePlayerCount(): number {
    return this.service.getAlivePlayerCount();
  }

  /**
   * 显示/隐藏profiles容器
   * @param visible 是否可见
   */
  public setVisible(visible: boolean): void {
    this.ui.setVisible(visible);
  }

  /**
   * 清空所有profile
   */
  public clearAll(): void {
    this.service.clear();
    this.ui.clearAllProfiles();
    console.log('[IngameProfilesController] Cleared all profiles');
  }

  /**
   * 处理玩家血量更新
   * @param userId 玩家ID
   * @param currentHP 当前血量
   * @param maxHP 最大血量
   */
  private handleHPUpdate(userId: string, currentHP: number, maxHP: number): void {
    console.log(
      `[IngameProfilesController] HP update for ${userId}: ${currentHP}/${maxHP}`
    );
    this.ui.updatePlayerHP(userId, currentHP, maxHP);
  }

  /**
   * 处理玩家携带物品更新
   * @param userId 玩家ID
   * @param itemImageUrl 物品图片URL
   */
  private handleItemUpdate(userId: string, itemImageUrl: string | null): void {
    console.log(
      `[IngameProfilesController] Item update for ${userId}: ${itemImageUrl || 'none'}`
    );
    this.ui.updatePlayerCarryingItem(userId, itemImageUrl);
  }

  /**
   * 销毁控制器
   */
  public dispose(): void {
    // 清空数据
    this.clearAll();

    // 清理UI
    if (this.ui) {
      this.ui.dispose();
    }

    // 清理Service
    if (this.service) {
      this.service.clear();
    }

    console.log('[IngameProfilesController] Disposed');
  }

  /**
   * 获取槽位使用情况（调试）
   */
  public getSlotUsage(): string {
    return this.service.getSlotUsage();
  }
}
