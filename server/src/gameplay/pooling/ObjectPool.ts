import { Singleton } from '../../core/patterns/Singleton';

/**
 * Entity创建和配置接口
 */
interface EntityConfig {
  position?: GameVector3;
  mesh?: string;
  meshScale?: GameVector3;
  collides?: boolean;
  fixed?: boolean;
  gravity?: boolean;
  [key: string]: unknown; // 允许其他未知属性
}

/**
 * Entity对象池管理器
 * 用于复用GameEntity对象，减少频繁创建和销毁带来的性能开销
 */
export class ObjectPool extends Singleton<ObjectPool>() {
  // 对象池存储：key为entity类型标识，value为可用的entity数组
  constructor() {
    super();
  }

  /**
   * 将现有世界中的实体直接放入对象池
   * 适用于地图预置的静态对象收集到池中以便后续复用
   * @param poolKey 池标识符（建议使用类型或mesh名）
   * @param entity 现有实体
   */
  public addToPool(poolKey: string, entity: GameEntity): void {
    if (!this.pools.has(poolKey)) {
      this.pools.set(poolKey, []);
    }

    // 将实体重置到安全状态并放入池
    this.prepareForPool(entity);
    const pool = this.pools.get(poolKey)!;

    if (pool.length >= this.maxPoolSize) {
      // 池满则直接销毁，避免无限制增长
      entity.destroy();
      console.log(
        `PoolManager: Pool "${poolKey}" full while adding existing entity. Destroyed.`
      );
      return;
    }

    pool.push(entity);
    console.log(`PoolManager: Added existing entity to pool "${poolKey}"`);
  }

  private pools: Map<string, GameEntity[]> = new Map();

  // 活跃对象记录：用于跟踪正在使用的entity
  private activeEntities: Set<GameEntity> = new Set();

  // 每个池的最大容量
  private maxPoolSize: number = 50;

  /**
   * 从对象池获取entity
   * @param poolKey 池标识符（通常是mesh名称或entity类型）
   * @param createConfig entity创建配置
   * @returns 可用的GameEntity
   */
  public getEntity(poolKey: string, createConfig: EntityConfig): GameEntity {
    // 获取或创建对应的池
    if (!this.pools.has(poolKey)) {
      this.pools.set(poolKey, []);
    }

    const pool = this.pools.get(poolKey)!;

    // 尝试从池中获取可用entity
    let entity = pool.pop();

    if (!entity) {
      // 池中没有可用entity，创建新的
      entity = world.createEntity(
        createConfig as Partial<GameEntityConfig>
      ) as GameEntity;
      console.log(`PoolManager: Created new entity for pool "${poolKey}"`);
    } else {
      // 重置entity状态
      this.resetEntity(entity, createConfig);
      console.log(`PoolManager: Reused entity from pool "${poolKey}"`);
    }

    // 记录为活跃entity
    this.activeEntities.add(entity);

    return entity;
  }

  /**
   * 将entity归还到对象池
   * @param poolKey 池标识符
   * @param entity 要归还的entity
   */
  public releaseEntity(poolKey: string, entity: GameEntity): void {
    if (!entity || !this.activeEntities.has(entity)) {
      console.warn('PoolManager: Trying to release invalid or inactive entity');
      return;
    }

    // 从活跃列表中移除
    this.activeEntities.delete(entity);

    // 获取对应的池
    if (!this.pools.has(poolKey)) {
      this.pools.set(poolKey, []);
    }

    const pool = this.pools.get(poolKey)!;

    // 检查池容量
    if (pool.length >= this.maxPoolSize) {
      // 池已满，直接销毁entity
      entity.destroy();
      console.log(`PoolManager: Pool "${poolKey}" full, destroyed entity`);
      return;
    }

    // 重置entity到初始状态
    this.prepareForPool(entity);

    // 归还到池中
    pool.push(entity);
    console.log(`PoolManager: Released entity to pool "${poolKey}"`);
  }

  /**
   * 重置entity状态用于复用
   * @param entity 要重置的entity
   * @param config 新的配置
   */
  private resetEntity(entity: GameEntity, config: EntityConfig): void {
    // 重置位置
    if (config.position) {
      entity.position.copy(config.position);
    }

    // 重置mesh
    if (config.mesh) {
      // Type assertion needed due to strict GameModelAssets type
      (entity as unknown as { mesh: string }).mesh = config.mesh;
    }

    // 重置缩放
    if (config.meshScale) {
      entity.meshScale.copy(config.meshScale);
    }

    // 重置其他属性
    if (config.collides !== undefined) {
      entity.collides = config.collides;
    }

    if (config.fixed !== undefined) {
      entity.fixed = config.fixed;
    }

    if (config.gravity !== undefined) {
      entity.gravity = config.gravity;
    }
  }

  /**
   * 准备entity进入对象池（重置到安全状态）
   * @param entity 要准备的entity
   */
  private prepareForPool(entity: GameEntity): void {
    // 隐藏entity
    entity.meshInvisible = true;

    // 停止所有物理效果
    entity.fixed = true;
    entity.gravity = false;
    entity.collides = false;

    // 重置速度（如果有的话）
    if (entity.velocity) {
      entity.velocity.x = 0;
      entity.velocity.y = 0;
      entity.velocity.z = 0;
    }
  }

  /**
   * 清空指定池
   * @param poolKey 池标识符
   */
  public clearPool(poolKey: string): void {
    const pool = this.pools.get(poolKey);
    if (pool) {
      // 销毁池中所有entity
      pool.forEach((entity) => entity.destroy());
      pool.length = 0;
      console.log(`PoolManager: Cleared pool "${poolKey}"`);
    }
  }

  /**
   * 清空所有池
   */
  public clearAllPools(): void {
    this.pools.forEach((pool, poolKey) => {
      pool.forEach((entity) => entity.destroy());
      pool.length = 0;
      console.log(`PoolManager: Cleared pool "${poolKey}"`);
    });

    // 销毁所有活跃entity
    this.activeEntities.forEach((entity) => entity.destroy());
    this.activeEntities.clear();

    console.log('PoolManager: Cleared all pools and active entities');
  }

  /**
   * 获取池状态信息
   * @param poolKey 池标识符
   * @returns 池状态信息
   */
  public getPoolInfo(poolKey: string): { available: number; active: number } {
    const pool = this.pools.get(poolKey);
    const available = pool ? pool.length : 0;

    // 计算该池的活跃entity数量（简化统计）
    let active = 0;
    this.activeEntities.forEach(() => {
      // 这里可以根据需要添加更精确的统计逻辑
      active++;
    });

    return { available, active };
  }

  /**
   * 设置池的最大容量
   * @param size 最大容量
   */
  public setMaxPoolSize(size: number): void {
    this.maxPoolSize = Math.max(1, size);
  }

  public onDestroy(): void {
    this.clearAllPools();
  }
}
