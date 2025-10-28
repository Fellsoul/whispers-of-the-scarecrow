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
    const currentScene = Settings.getCurrentScene();
    console.log(
      `[ObjectManager] Initializing scene: ${currentScene} (projectName: ${world.projectName})`
    );

    switch (currentScene) {
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

  private initIngame(): void {}
}
