import { Singleton } from '../../core/patterns/Singleton';
import { Settings } from '../../Settings';
import { GameMode, GameScene } from '../const/enum';
import { EntityNode } from '@dao3fun/component';
import { MatchPoolManager } from './MatchPoolManager';
/**
 * 对象管理器
 * 检测当前地图类型，在世界选中所有需要初始化的对象添加component
 * 对于特定环境区域，自动生成环境实体
 */
export class ObjectManager extends Singleton<ObjectManager>() {
  constructor() {
    super();
  }

  // 场景中所有静态实体 (即在游戏开始时维护的实体数组)
  private allEntities: Array<GameEntity> = [];

  /**
   * 获取所有实体
   */
  private getAllEntities(): void {
    this.allEntities = world.querySelectorAll('*');
  }
  /**
   * 根据名称前缀查找实体 / Find entities by name prefix
   * 先获取所有实体，然后过滤出名称以指定前缀开头的实体
   */
  private getEntityNodesByStartsWith(prefixes: string[]): EntityNode[] {
    const found: EntityNode[] = [];

    for (const entity of this.allEntities) {
      const entityNode = new EntityNode(entity);
      const entityId = entity.id;
      // 检查实体名称是否以任一前缀开头
      for (const prefix of prefixes) {
        if (entityId.startsWith(prefix)) {
          found.push(entityNode);
          break; // 匹配到一个前缀就跳出内层循环
        }
      }
    }

    return found;
  }

  public start(): void {
    // 启用obb
    world.useOBB = true;
    // 获取当前地图所有实体
    this.getAllEntities();

    // 检测当前地图类型（通过world.projectName）
    const currentSceneType = Settings.getCurrentSceneType();
    const currentSceneName = Settings.getCurrentScene();
    console.log(
      `[ObjectManager] Initializing scene: ${currentSceneName} (type: ${currentSceneType})`
    );

    switch (currentSceneType) {
      case GameScene.Lobby:
        this.initLobby();
        break;
      case GameScene.Readiness:
        this.initReadiness();
        break;
      case GameScene.Ingame:
        this.initIngame();
        break;
      default:
        break;
    }
  }

  private initLobby(): void {
    /*
     *初始化Lobby匹配池object
     */
    MatchPoolManager.instance.matchPoolEntrePedals =
      this.getEntityNodesByStartsWith(
        Settings.objectQueryMap['MatchPoolEntrePedalQueryStartsWith']
      );
    MatchPoolManager.instance.matchPoolBases = this.getEntityNodesByStartsWith(
      Settings.objectQueryMap['MatchPoolBaseQueryStartsWith']
    );
    // 匹配池初始化
    MatchPoolManager.instance.initMatchPool();
  }

  private initReadiness(): void {
    /*
     *检查游戏类型，根据大小地图，隐藏椅子
     */
    if (Settings.currentGameMode === GameMode.Small) {
      MatchPoolManager.instance.matchPoolEntrePedals =
        this.getEntityNodesByStartsWith(
          Settings.objectQueryMap['MatchPoolEntrePedalQueryStartsWith']
        );
    }
    MatchPoolManager.instance.matchPoolBases = this.getEntityNodesByStartsWith(
      Settings.objectQueryMap['MatchPoolBaseQueryStartsWith']
    );
    // 匹配池初始化
    MatchPoolManager.instance.initMatchPool();
  }

  public async initIngame(): Promise<void> {
    /*
     * 初始化游戏内实体
     * 这会在游戏开始时调用（从Readiness过渡到Ingame时）
     */
    console.log('[ObjectManager] Initializing ingame entities...');

    // 初始化铁板机关
    await this.initIronBoards();

    // TODO: 根据游戏模式初始化不同的实体
    // 例如：
    // - 初始化Survivor椅子
    // - 初始化Overseer区域
    // - 初始化机关、道具等游戏实体

    if (Settings.currentGameMode === GameMode.Small) {
      // 小地图初始化
      console.log('[ObjectManager] Initializing Small map entities');
      // this.initSurvivorChairs();
      // this.initOverseerArea();
    } else {
      // 大地图初始化
      console.log('[ObjectManager] Initializing Large map entities');
      // this.initSurvivorChairs();
      // this.initOverseerArea();
    }

    console.log('[ObjectManager] Ingame entities initialized');
  }

  /**
   * 初始化铁板机关
   * Initialize iron boards
   */
  private async initIronBoards(): Promise<void> {
    // 动态导入 IronBoard 组件
    const { IronBoard } = await import('../component/ironBoard/IronBoard');

    // 查找所有名称以 "ironBoard" 开头的实体
    const ironBoardNodes = this.getEntityNodesByStartsWith(
      Settings.objectQueryMap['IronBoardQueryStartsWith']
    );

    console.log(`[ObjectManager] Found ${ironBoardNodes.length} iron board(s)`);

    // 为每个铁板添加 IronBoard 组件
    ironBoardNodes.forEach((node, index) => {
      node.addComponent(IronBoard);
      console.log(
        `[ObjectManager] Added IronBoard component to entity ${node.entity.id} (${index + 1}/${ironBoardNodes.length})`
      );
    });

    console.log(
      `[ObjectManager] Iron boards initialized: ${ironBoardNodes.length} board(s)`
    );
  }
}
