import { GameScene, GameMode } from './gameplay/const/enum';

export const Settings = {
  // 调试模式开关
  debug: true, // 设置为false将关闭所有console.log输出

  // 场景名称配置（用于通过world.url检测当前场景）
  lobbySceneUrl: new URL('https://view.dao3.fun/e/8ffde7513ba10b5a4614'),
  readinessSmallSceneUrl: new URL(
    'https://view.dao3.fun/e/4feb0d4d0163cbad5591'
  ),
  readinessLargeSceneUrl: new URL(
    'https://view.dao3.fun/e/your-large-scene-url-here'
  ),

  currentGameMode: GameMode.Small,

  // 匹配池类型配置
  matchPoolTypes: {
    Small: 'readinessSmallSceneUrl',
    Large: 'readinessLargeSceneUrl',
  } as const,
  //查询字符串map，用于youxObjectInitializingManager绑定场景实体；
  //格式：['entityName']，自动检索所有以entityName开头的实体
  objectQueryMap: {
    MatchPoolEntrePedalQueryStartsWith: ['MatchPoolEntrePedal'],
    MatchPoolBaseQueryStartsWith: ['MatchPoolBase'],
    SurvivorChairStartWith: ['ClassicChair'],
    OverseerChairStartWith: ['chairLuxurious'],
    IronBoardQueryStartsWith: ['IronBoard'], // 铁板机关前缀
  },
  // 匹配池最大玩家数
  maxPlayerSmall: 1,
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
      walkSpeed: 0.55,
      runSpeed: 0.55,
      walkAcceleration: 0.07,
      runAcceleration: 0.07,
      jumpPower: 0.6,
      jumpSpeedFactor: 0.4,
    },
    // Survivor（幸存者）移动速度
    survivor: {
      walkSpeed: 0.3,
      runSpeed: 0.5,
      walkAcceleration: 0.1,
      runAcceleration: 0.1,
      jumpPower: 0.6,
      jumpSpeedFactor: 0.4,
    },
  },

  defaultCharacter: 'char_survivor_01',

  // 游戏内出生点配置（16个位置，每局游戏随机选择4/8个）(256, 10, 256)
  ingameSpawnPositions: [
    { x: 188, y: 10, z: 46 },
    //{ x: 219, y: 10, z: 110 },
    //{ x: 188, y: 10, z: 174 },
    //{ x: 219, y: 10, z: 210 },
  ],

  // 黑幕过渡时长配置（毫秒）
  transitionConfig: {
    fadeInDuration: 500, // 黑幕渐显时长
    holdDuration: 2000, // 黑幕停留时长（用于初始化）
    fadeOutDuration: 1000, // 黑幕渐隐时长
  },

  /**
   * 获取当前场景类型（枚举）
   * 通过检测world.url与配置的场景名称对比
   */
  getCurrentSceneType(): GameScene {
    const { url } = world;
    console.log(`[Settings] Detecting scene type from URL: ${url.href}`);

    if (url.href === this.lobbySceneUrl.href) {
      return GameScene.Lobby;
    } else if (
      url.href === this.readinessSmallSceneUrl.href ||
      url.href === this.readinessLargeSceneUrl.href
    ) {
      return GameScene.Readiness;
    }

    // 默认返回Ingame（或根据实际需求调整）
    console.warn(
      `[Settings] Unknown project url: ${url.href}, defaulting to Ingame`
    );
    return GameScene.Ingame;
  },

  /**
   * 获取当前场景名称（包括编号）
   * 例如: "ReadinessSmall", "ReadinessLarge", "Lobby"
   * 通过world.projectName获取完整场景名称
   */
  getCurrentScene(): string {
    const { projectName } = world;
    console.log(`[Settings] Current project name: ${projectName}`);
    return projectName;
  },

  /**
   * 生成唯一的matchId
   * Generate unique match ID
   * @returns 唯一的matchId (时间戳 + 随机数)
   */
  generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
};
