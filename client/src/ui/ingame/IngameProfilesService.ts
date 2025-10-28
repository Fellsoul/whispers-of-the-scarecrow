import type { PlayerProfileData } from './events';

/**
 * IngameProfilesService - 游戏中玩家状态数据管理
 * 负责数据的存储、查询和状态管理
 */
export class IngameProfilesService {
  /** 玩家数据映射表 (userId -> PlayerProfileData) */
  private playerDataMap: Map<string, PlayerProfileData> = new Map();

  /** 玩家ID到槽位索引的映射 (userId -> slotIndex) */
  private userSlotMap: Map<string, number> = new Map();

  /** 槽位索引到玩家ID的映射 (slotIndex -> userId) */
  private slotUserMap: Map<number, string> = new Map();

  /** 最大玩家数 */
  private maxPlayers: number = 4;

  constructor() {}

  /**
   * 初始化服务
   * @param maxPlayers 最大玩家数
   */
  public initialize(maxPlayers: number): void {
    this.maxPlayers = maxPlayers;
    this.clear();
    console.log(
      `[IngameProfilesService] Initialized for ${maxPlayers} players`
    );
  }

  /**
   * 更新或添加玩家数据
   * @param data 玩家数据
   * @returns 分配的槽位索引，-1表示没有可用槽位
   */
  public updatePlayerData(data: PlayerProfileData): number {
    // 检查是否已存在
    let slotIndex = this.userSlotMap.get(data.userId);

    if (slotIndex === undefined) {
      // 新玩家，分配槽位
      slotIndex = this.findAvailableSlot();
      if (slotIndex === -1) {
        console.warn(
          `[IngameProfilesService] No available slot for player ${data.userId}`
        );
        return -1;
      }

      // 建立映射关系
      this.userSlotMap.set(data.userId, slotIndex);
      this.slotUserMap.set(slotIndex, data.userId);
    }

    // 更新数据
    this.playerDataMap.set(data.userId, data);

    console.log(
      `[IngameProfilesService] Updated player ${data.playerName} at slot ${slotIndex}`
    );

    return slotIndex;
  }

  /**
   * 批量更新玩家数据
   * @param dataArray 玩家数据数组
   */
  public updateBatch(dataArray: PlayerProfileData[]): void {
    dataArray.forEach((data) => this.updatePlayerData(data));
    console.log(
      `[IngameProfilesService] Batch updated ${dataArray.length} players`
    );
  }

  /**
   * 移除玩家数据
   * @param userId 玩家ID
   * @returns 被释放的槽位索引，-1表示未找到
   */
  public removePlayerData(userId: string): number {
    const slotIndex = this.userSlotMap.get(userId);
    if (slotIndex === undefined) {
      return -1;
    }

    // 清除映射关系
    this.userSlotMap.delete(userId);
    this.slotUserMap.delete(slotIndex);
    this.playerDataMap.delete(userId);

    console.log(
      `[IngameProfilesService] Removed player ${userId} from slot ${slotIndex}`
    );

    return slotIndex;
  }

  /**
   * 获取玩家数据
   * @param userId 玩家ID
   */
  public getPlayerData(userId: string): PlayerProfileData | null {
    return this.playerDataMap.get(userId) || null;
  }

  /**
   * 获取玩家槽位索引
   * @param userId 玩家ID
   */
  public getPlayerSlot(userId: string): number {
    return this.userSlotMap.get(userId) ?? -1;
  }

  /**
   * 获取槽位的玩家ID
   * @param slotIndex 槽位索引
   */
  public getSlotPlayer(slotIndex: number): string | null {
    return this.slotUserMap.get(slotIndex) || null;
  }

  /**
   * 查找可用槽位
   * @returns 槽位索引，-1表示没有可用槽位
   */
  private findAvailableSlot(): number {
    for (let i = 0; i < this.maxPlayers; i++) {
      if (!this.slotUserMap.has(i)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 获取所有玩家数据
   */
  public getAllPlayerData(): PlayerProfileData[] {
    return Array.from(this.playerDataMap.values());
  }

  /**
   * 获取在线玩家数量
   */
  public getPlayerCount(): number {
    return this.playerDataMap.size;
  }

  /**
   * 获取存活玩家数量
   */
  public getAlivePlayerCount(): number {
    return Array.from(this.playerDataMap.values()).filter(
      (data) => data.isAlive
    ).length;
  }

  /**
   * 检查槽位是否被占用
   * @param slotIndex 槽位索引
   */
  public isSlotOccupied(slotIndex: number): boolean {
    return this.slotUserMap.has(slotIndex);
  }

  /**
   * 检查玩家是否存在
   * @param userId 玩家ID
   */
  public hasPlayer(userId: string): boolean {
    return this.playerDataMap.has(userId);
  }

  /**
   * 获取所有已占用的槽位索引
   * @returns 槽位索引数组，按升序排列
   */
  public getOccupiedSlots(): number[] {
    return Array.from(this.slotUserMap.keys()).sort((a, b) => a - b);
  }

  /**
   * 清空所有数据
   */
  public clear(): void {
    this.playerDataMap.clear();
    this.userSlotMap.clear();
    this.slotUserMap.clear();
    console.log('[IngameProfilesService] Cleared all data');
  }

  /**
   * 获取槽位使用情况（调试用）
   */
  public getSlotUsage(): string {
    const usage = Array.from({ length: this.maxPlayers }, (_, i) => {
      const userId = this.slotUserMap.get(i);
      return userId ? `Slot${i}:${userId}` : `Slot${i}:empty`;
    });
    return usage.join(', ');
  }
}
