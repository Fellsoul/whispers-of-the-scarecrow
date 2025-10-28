/**
 * MatchPool Events - 匹配池事件定义
 */

/**
 * 匹配池事件名称
 */
export const MatchPoolEvents = {
  // 服务端触发的事件
  UPDATE: 'matchPool:update', // 匹配池状态更新
  JOINED: 'matchPool:joined', // 加入匹配池
  LEFT: 'matchPool:left', // 离开匹配池
  GAME_START: 'matchPool:gameStart', // 游戏开始
  NAVIGATE: 'matchPool:navigate', // 地图跳转指令
  WAITING_QUEUE: 'matchPool:waitingQueue', // 进入等待队列

  // 客户端触发的事件
  CLIENT_LEAVE: 'client:matchPool:leave', // 客户端请求离开
} as const;

/**
 * 匹配池更新数据
 */
export interface MatchPoolUpdateData {
  poolId: string;
  players: Array<{
    userId: string;
    name: string;
    avatar: string; // 玩家头像 URL
  }>;
  maxPlayers: number;
  countdownSeconds: number;
  isStarting: boolean;
  currentUserId?: string; // 当前玩家的userId，由服务端发送
}

/**
 * 匹配池加入数据
 */
export interface MatchPoolJoinedData {
  poolId: string;
  currentUserId?: string; // 当前玩家的userId，由服务端发送
}

/**
 * 匹配池离开数据
 */
export interface MatchPoolLeftData {
  poolId: string;
}

/**
 * 匹配池游戏开始数据
 */
export interface MatchPoolGameStartData {
  poolId: string;
  players: Array<{
    userId: string;
    name: string;
    avatar: string; // 玩家头像 URL
  }>;
}

/**
 * 等待队列数据
 */
export interface MatchPoolWaitingQueueData {
  poolId: string;
  position: number;
}

/**
 * 地图跳转指令数据
 */
export interface MatchPoolNavigateData {
  mapKey: string; // 地图键名（如 Readiness1, Readiness2）
  poolId: string;
}

/**
 * 客户端离开请求数据
 */
export interface ClientLeaveRequestData {
  userId: string;
  poolId: string;
}
