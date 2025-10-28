import { GameScene, GameMode } from './gameplay/const/enum';

export const Settings = {
  // 场景名称配置（用于通过world.projectName检测当前场景）
  lobbySceneUrl: new URL('https://view.dao3.fun/e/8ffde7513ba10b5a4614'),
  readinessSceneUrl: new URL('https://view.dao3.fun/e/4feb0d4d0163cbad5591'),

  currentGameMode: GameMode.Small,
  //查询字符串map，用于youxObjectInitializingManager绑定场景实体；
  //格式：['entityName']，自动检索所有以entityName开头的实体
  objectQueryMap: {
    MatchPoolEntrePedalQueryStartsWith: ['MatchPoolEntrePedal'],
    MatchPoolBaseQueryStartsWith: ['MatchPoolBase'],
    SurvivorChairStartWith: ['ClassicChair'],
    OverseerChairStartWith: ['chairLuxurious'],
  },
  // 匹配池最大玩家数
  maxPlayerSmall: 2,
  maxPlayerLarge: 10,
  // 匹配池倒计时时长（ms）
  countdownDurationSmall: 10000,
  countdownDurationLarge: 10000,
  // 游戏结束后，返回匹配池等待时长（秒）
  postGameWaitDurationSmall: 20,
  postGameWaitDurationLarge: 20,
  //匹配池中心位置偏移
  matchPoolCenterOffset: {
    x: 0,
    y: 4,
    z: 0,
  },
  matchPoolPedalTeleportOffset: {
    x: -3,
    y: 3,
    z: 0,
  },
  //准备模式的倒计时（ms）
  readyCountdownDuration: 120000,
  //准备模式的孩子阵营位置序列(小地图 4人)
  readyPlayerPositionsSmall: [
    { x: 20, y: 10, z: 248 },
    { x: 16, y: 10, z: 248 },
    { x: 12, y: 10, z: 248 },
    { x: 8, y: 10, z: 248 },
  ],
  //准备模式的怪物位置(小地图 1人)
  readyMonsterPositionSmall: { x: 20, y: 10, z: 236 },
  //准备模式的孩子阵营位置序列(大地图 8人)
  readyPlayerPositionsLarge: [
    { x: 20, y: 8, z: 248 },
    { x: 16, y: 8, z: 248 },
    { x: 12, y: 8, z: 248 },
    { x: 8, y: 8, z: 248 },
    { x: 21, y: 8, z: 246 },
    { x: 18, y: 8, z: 248 },
    { x: 14, y: 8, z: 248 },
    { x: 10, y: 8, z: 248 },
  ],
  //准备模式的怪物位置(大地图 2人)
  readyMonsterPositionLarge: [
    { x: 20, y: 8, z: 236 },
    { x: 9, y: 8, z: 235 },
  ],

  //准备模式的相机设置（怪物）
  readinessMonsterCameraConfig: {
    // 固定相机位置
    position: { x: 15, y: 12, z: 226 },
    // 相机看向的目标点
    target: { x: 15, y: 12, z: 254 },
    // 相机向上的矢量
    up: { x: 0, y: 1, z: 0 },
    // 垂直方向的视场角
    fovY: 0.25,
  },
  //准备模式的相机设置（孩子）
  readinessPlayerCameraConfig: {
    // 固定相机位置
    position: { x: 15, y: 12, z: 235 },
    // 相机看向的目标点
    target: { x: 15, y: 12, z: 254 },
    // 相机向上的矢量
    up: { x: 0, y: 1, z: 0 },
    // 垂直方向的视场角
    fovY: 0.25,
  },

  //角色切换时的视角位置列表（用于查看不同角色）
  readinessCharacterViewPositions: [
    // 对应readyPlayerPositionsSmall/Large中的角色
    { position: { x: 20, y: 11, z: 244 }, target: { x: 18, y: 10, z: 249 } },
    { position: { x: 16, y: 10, z: 250 }, target: { x: 16, y: 8, z: 248 } },
    { position: { x: 12, y: 10, z: 250 }, target: { x: 12, y: 8, z: 248 } },
    { position: { x: 8, y: 10, z: 250 }, target: { x: 8, y: 8, z: 248 } },
    { position: { x: 21, y: 10, z: 248 }, target: { x: 21, y: 8, z: 246 } },
    { position: { x: 18, y: 10, z: 250 }, target: { x: 18, y: 8, z: 248 } },
    { position: { x: 14, y: 10, z: 250 }, target: { x: 14, y: 8, z: 248 } },
    { position: { x: 10, y: 10, z: 250 }, target: { x: 10, y: 8, z: 248 } },
  ],

  //怪物视角位置列表
  readinessMonsterViewPositions: [
    { position: { x: 20, y: 10, z: 230 }, target: { x: 20, y: 10, z: 238 } },
    { position: { x: 9, y: 10, z: 237 }, target: { x: 9, y: 8, z: 235 } },
  ],

  //角色移动速度配置
  characterMovementConfig: {
    // Overseer（怪物）移动速度
    overseer: {
      walkSpeed: 0.35,
      runSpeed: 0.35,
      walkAcceleration: 0.07,
      runAcceleration: 0.07,
    },
    // Survivor（幸存者）移动速度
    survivor: {
      walkSpeed: 0.3,
      runSpeed: 0.3,
      walkAcceleration: 0.1,
      runAcceleration: 0.1,
    },
  },

  defaultCharacter: 'char_survivor_01',

  /**
   * 获取当前场景类型
   * 通过检测world.projectName与配置的场景名称对比
   */
  getCurrentScene(): GameScene {
    const { url } = world;
    console.log(url.href);
    console.log(this.lobbySceneUrl.href);
    if (url.href === this.lobbySceneUrl.href) {
      return GameScene.Lobby;
    } else if (url.href === this.readinessSceneUrl.href) {
      return GameScene.Readiness;
    }

    // 默认返回Ingame（或根据实际需求调整）
    console.warn(
      `[Settings] Unknown project url: ${url}, defaulting to Ingame`
    );
    return GameScene.Ingame;
  },
};
