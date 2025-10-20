import { Singleton } from '../../core/patterns/Singleton';
import type { IPlayerData } from '@shares/IPlayerData';

/**
 * 存储管理器
 * Storage Manager - Handles all game data storage operations
 */
export class StorageManager extends Singleton<StorageManager>() {
  private playerGroupStorage: GameDataStorage<IPlayerData> | null = null;
  private readonly STORAGE_KEY = 'player_data';

  constructor() {
    super();
  }

  /**
   * 初始化存储管理器
   * Initialize the storage manager
   */
  public initialize(): void {
    try {
      this.playerGroupStorage = storage.getGroupStorage<IPlayerData>(
        this.STORAGE_KEY
      );
      console.log('StorageManager: 初始化成功 / Initialized successfully');
    } catch (error) {
      console.error(
        'StorageManager: 初始化失败 / Initialization failed',
        error
      );
    }
  }

  /**
   * 获取玩家数据
   * Get player data
   * @param userId 玩家ID / Player ID
   * @returns 玩家扩展数据 / Player extended data
   */
  public async getPlayerData(userId: string): Promise<IPlayerData | null> {
    if (!this.playerGroupStorage) {
      console.error('StorageManager: 存储未初始化 / Storage not initialized');
      return null;
    }

    try {
      const result = await this.playerGroupStorage.get(userId);

      if (result && result.value) {
        return result.value;
      }

      // 如果玩家数据不存在，返回默认数据
      // If player data doesn't exist, return default data
      return this.createDefaultPlayerData(userId);
    } catch (error) {
      console.error(
        `StorageManager: 获取玩家数据失败 / Failed to get player data for ${userId}`,
        error
      );
      return null;
    }
  }

  /**
   * 保存玩家数据
   * Save player data
   * @param playerData 玩家扩展数据 / Player extended data
   */
  public async savePlayerData(playerData: IPlayerData): Promise<boolean> {
    if (!this.playerGroupStorage) {
      console.error('StorageManager: 存储未初始化 / Storage not initialized');
      return false;
    }

    try {
      await this.playerGroupStorage.set(playerData.userId, playerData);
      console.log(
        `StorageManager: 玩家数据已保存 / Player data saved for ${playerData.userId}`
      );
      return true;
    } catch (error) {
      console.error(
        `StorageManager: 保存玩家数据失败 / Failed to save player data for ${playerData.userId}`,
        error
      );
      return false;
    }
  }

  /**
   * 更新玩家数据
   * Update player data using a handler function
   * @param userId 玩家ID / Player ID
   * @param updateHandler 更新处理函数 / Update handler function
   */
  public async updatePlayerData(
    userId: string,
    updateHandler: (prevData: IPlayerData) => IPlayerData
  ): Promise<boolean> {
    if (!this.playerGroupStorage) {
      console.error('StorageManager: 存储未初始化 / Storage not initialized');
      return false;
    }

    try {
      await this.playerGroupStorage.update(userId, (prevValue) => {
        const prevData =
          prevValue && prevValue.value
            ? prevValue.value
            : this.createDefaultPlayerData(userId);

        return updateHandler(prevData);
      });

      console.log(
        `StorageManager: 玩家数据已更新 / Player data updated for ${userId}`
      );
      return true;
    } catch (error) {
      console.error(
        `StorageManager: 更新玩家数据失败 / Failed to update player data for ${userId}`,
        error
      );
      return false;
    }
  }

  /**
   * 删除玩家数据
   * Remove player data
   * @param userId 玩家ID / Player ID
   */
  public async removePlayerData(userId: string): Promise<boolean> {
    if (!this.playerGroupStorage) {
      console.error('StorageManager: 存储未初始化 / Storage not initialized');
      return false;
    }

    try {
      await this.playerGroupStorage.remove(userId);
      console.log(
        `StorageManager: 玩家数据已删除 / Player data removed for ${userId}`
      );
      return true;
    } catch (error) {
      console.error(
        `StorageManager: 删除玩家数据失败 / Failed to remove player data for ${userId}`,
        error
      );
      return false;
    }
  }

  /**
   * 增加玩家游戏场数
   * Increment player total games
   * @param userId 玩家ID / Player ID
   * @param isWin 是否胜利 / Whether the player won
   * @param rating 本场评分 / Rating for this game
   * @param playTime 本场游戏时长(秒) / Play time for this game in seconds
   */
  public async recordGameResult(
    userId: string,
    isWin: boolean,
    rating: number,
    playTime: number
  ): Promise<void> {
    await this.updatePlayerData(userId, (prevData) => {
      const newTotalGames = prevData.totalGames + 1;
      const newWins = isWin ? prevData.wins + 1 : prevData.wins;
      const newTotalRating =
        prevData.averageRating * prevData.totalGames + rating;
      const newAverageRating = newTotalRating / newTotalGames;
      const newTotalPlayTime = prevData.totalPlayTime + playTime;

      return {
        ...prevData,
        totalGames: newTotalGames,
        wins: newWins,
        averageRating: newAverageRating,
        totalPlayTime: newTotalPlayTime,
      };
    });
  }

  /**
   * 解锁角色
   * Unlock a character
   * @param userId 玩家ID / Player ID
   * @param characterId 角色ID / Character ID
   */
  public async unlockCharacter(
    userId: string,
    characterId: string
  ): Promise<void> {
    await this.updatePlayerData(userId, (prevData) => {
      const unlockedList = prevData.unlockedCharacters
        .split(',')
        .filter((id: string) => id);

      if (!unlockedList.includes(characterId)) {
        unlockedList.push(characterId);
      }

      return {
        ...prevData,
        unlockedCharacters: unlockedList.join(','),
      };
    });
  }

  /**
   * 升级玩家等级
   * Level up player
   * @param userId 玩家ID / Player ID
   */
  public async levelUp(userId: string): Promise<void> {
    await this.updatePlayerData(userId, (prevData) => ({
      ...prevData,
      level: prevData.level + 1,
    }));
  }

  /**
   * 设置VIP等级
   * Set VIP level
   * @param userId 玩家ID / Player ID
   * @param vipLevel VIP等级 / VIP level
   */
  public async setVipLevel(userId: string, vipLevel: number): Promise<void> {
    await this.updatePlayerData(userId, (prevData) => ({
      ...prevData,
      vipLevel,
    }));
  }

  /**
   * 创建默认玩家数据
   * Create default player data
   * @param userId 玩家ID / Player ID
   */
  private createDefaultPlayerData(userId: string): IPlayerData {
    return {
      userId,
      totalGames: 0,
      wins: 0,
      averageRating: 0,
      unlockedCharacters: '',
      totalPlayTime: 0,
      level: 1,
      vipLevel: 0,
    };
  }

  /**
   * 销毁存储管理器
   * Destroy the storage manager
   */
  public async destroy(): Promise<void> {
    if (this.playerGroupStorage) {
      console.log('StorageManager: 正在销毁 / Destroying...');
      // 注意：通常不需要调用 destroy()，除非要删除所有数据
      // Note: Usually no need to call destroy() unless you want to delete all data
      this.playerGroupStorage = null;
    }
  }
}
