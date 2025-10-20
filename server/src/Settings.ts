import { GameScene } from './gameplay/const/enum';

export const Settings = {
  currentScene: GameScene.Lobby,
  //查询字符串map，用于ObjectInitializingManager绑定场景实体；
  //格式：['entityName']，自动检索所有以entityName开头的实体
  objectQueryMap: {
    MatchPoolEntrePedalQueryStartsWith: ['MatchPoolEntrePedal'],
    MatchPoolBaseQueryStartsWith: ['MatchPoolBase'],
  },
  // 匹配池最大玩家数
  maxPlayerSmall: 5,
  maxPlayerLarge: 10,
  // 匹配池倒计时时长（秒）
  countdownDurationSmall: 10,
  countdownDurationLarge: 10,
  // 游戏结束后，返回匹配池等待时长（秒）
  postGameWaitDurationSmall: 20,
  postGameWaitDurationLarge: 20,
  //匹配池中心位置偏移
  matchPoolCenterOffset: {
    x: 0,
    y: 4,
    z: 0,
  },
};
