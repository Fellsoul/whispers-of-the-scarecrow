/**
 * 玩家扩展数据接口
 * Player Extended Data Interface
 */
export interface IPlayerData {
  /** 玩家ID / Player ID */
  userId: string;

  /** 总游戏场数 / Total games played */
  totalGames: number;

  /** 胜场数 / Total wins */
  wins: number;

  /** 场均评分 / Average rating per game */
  averageRating: number;

  /** 角色解锁列表 / Character unlock list (comma-separated string) */
  unlockedCharacters: string;

  /** 总游戏时长(秒) / Total game time in seconds */
  totalPlayTime: number;

  /** 玩家等级 / Player level */
  level: number;

  /** VIP等级 / VIP level */
  vipLevel: number;
}
