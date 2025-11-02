import { Singleton } from '../../core/patterns/Singleton';
import { Settings } from '../../Settings';
import { GameMode, GameScene } from '../const/enum';
import { EntityNode } from '@dao3fun/component';
import { MatchPoolManager } from './MatchPoolManager';
import { IronBoard } from '../component/ironBoard/IronBoard';
import { QteObject } from '../component/qteObject/QteObject';
import { QTE_CONFIG_MAP } from '@shares/data/qteObjects';
import { Logger } from '../../core/utils/Logger';
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
  
  // Ingame 实体是否已初始化
  private ingameEntitiesInitialized: boolean = false;

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

  public initIngame(): void {
    /*
     * 初始化游戏内实体
     * 这会在游戏开始时调用（从Readiness过渡到Ingame时）
     */
    
    // 防止重复初始化
    if (this.ingameEntitiesInitialized) {
      Logger.warn(
        '[ObjectManager] ⚠️ Ingame entities already initialized, skipping duplicate initialization'
      );
      return;
    }
    
    console.log('[ObjectManager] Initializing ingame entities...');

    // 标记为已初始化
    this.ingameEntitiesInitialized = true;

    // 初始化铁板机关
    this.initIronBoards();

    // 初始化 QTE 互动对象
    this.initQteObjects();

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
  private initIronBoards(): void {
    // 查找所有名称以 "IronBoard" 开头的实体
    const ironBoardNodes = this.getEntityNodesByStartsWith(
      Settings.objectQueryMap['IronBoardQueryStartsWith']
    );

    console.log(`[ObjectManager] Found ${ironBoardNodes.length} iron board(s)`);

    // 为每个铁板添加 IronBoard 组件
    ironBoardNodes.forEach((node, index) => {
      // 检查是否已经添加了组件
      let ironBoardComponent = node.getComponent(IronBoard);
      if (!ironBoardComponent) {
        node.addComponent(IronBoard);
      } 
    });
  }

  /**
   * 初始化 QTE 互动对象
   * Initialize QTE interactive objects
   */
  private initQteObjects(): void {
    // 查找所有 QTE 对象
    const qteObjectNodes = this.getEntityNodesByStartsWith(
      Settings.objectQueryMap['QteObjectQueryStartsWith']
    );

    // 按前缀分组所有实体
    const groupedNodes: Map<string, EntityNode<GameEntity>[]> = new Map();
    
    qteObjectNodes.forEach((node) => {
      const entityId = node.entity.id;
      
      // 查找匹配的前缀
      for (const prefix of Settings.objectQueryMap['QteObjectQueryStartsWith']) {
        if (entityId.startsWith(prefix)) {
          if (!groupedNodes.has(prefix)) {
            groupedNodes.set(prefix, []);
          }
          groupedNodes.get(prefix)!.push(node);
          break;
        }
      }
    });

    let initializedCount = 0;
    let destroyedCount = 0;

    // 对每个前缀的实体进行处理
    groupedNodes.forEach((nodes, prefix) => {
      const maxCount = (Settings.qteObjectLimits as Record<string, number>)[prefix];
      const foundCount = nodes.length;

      let selectedNodes: EntityNode<GameEntity>[] = [];
      let nodesToDestroy: EntityNode<GameEntity>[] = [];

      if (foundCount > maxCount) {
        // 数量超过限制，随机选择
        const shuffled = [...nodes].sort(() => Math.random() - 0.5);
        selectedNodes = shuffled.slice(0, maxCount);
        nodesToDestroy = shuffled.slice(maxCount);

        // 销毁多余的实体
        nodesToDestroy.forEach((node) => {
          try {
            node.entity.destroy();
            destroyedCount++;
          } catch (error) {
            Logger.error(`[ObjectManager] Failed to destroy entity ${node.entity.id}:`, error);
          }
        });
      } else {
        // 数量未超过限制，全部保留
        selectedNodes = nodes;
        Logger.log(`[ObjectManager] ${prefix}: All ${foundCount} entities retained`);
      }

      // 为选中的实体添加 QteObject 组件
      const matchedConfig = QTE_CONFIG_MAP[prefix];
      
      if (!matchedConfig) {
        Logger.warn(`[ObjectManager] No config found for prefix: ${prefix}`);
        return;
      }

      selectedNodes.forEach((node) => {
        const entityId = node.entity.id;
        
        // 添加 QteObject 组件
        let qteComponent = node.getComponent(QteObject);
        const isNewComponent = !qteComponent;
        
        if (!qteComponent) {
          node.addComponent(QteObject);
          qteComponent = node.getComponent(QteObject);
        }
        
        if (qteComponent && isNewComponent) {
          // 只在新组件时初始化
          qteComponent.initialize({
            ...matchedConfig,
            id: entityId, // 使用实际的实体 ID
            entityNode: node, // 绑定 EntityNode
          });

          initializedCount++;
          Logger.log(
            `[ObjectManager] ✅ Initialized QTE object: ${entityId} (type: ${prefix})`
          );
        } else if (qteComponent && !isNewComponent) {
          Logger.log(
            `[ObjectManager] QTE object already initialized: ${entityId}, skipping`
          );
        }
      });
    });

    Logger.log(
      `[ObjectManager] QTE objects summary: ${initializedCount} initialized, ${destroyedCount} destroyed`
    );
  }
}
