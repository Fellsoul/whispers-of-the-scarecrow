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

  /** 怪物场次 / Monster games played */
  monsterGames?: number;

  /** 怪物率 / Monster rate (怪物场次/总场次) */
  monsterRate?: number;

  /** 角色熟悉度 / Character familiarity (角色ID -> 熟悉度值) */
  characterFamiliarity?: Record<string, number>;

  /** 比赛场次 / Match count (用于书本条件显示) */
  matchCount?: number;

  /** 已获得的成就ID列表 / Achievements (用于书本条件显示) */
  achievements?: string[];

  /** 自定义数据 / Custom data (用于书本条件显示) */
  customData?: Record<string, unknown>;
}
