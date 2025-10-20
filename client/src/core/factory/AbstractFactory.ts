/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

// 元数据键定义 / Metadata key definitions
const METADATA_KEYS = {
  IMPLEMENTATION: 'factory:implementation', // 实现类 / Implementation class
  DEPENDENCIES: 'factory:dependencies', // 依赖项 / Dependencies
  SINGLETON: 'factory:singleton', // 单例模式 / Singleton pattern
  CACHE_KEY: 'factory:cache_key', // 缓存键 / Cache key
  TOKEN: 'factory:token', // 字符串标识符 / String token
} as const;

// 工厂配置接口 / Factory configuration interface
export interface FactoryConfig {
  singleton?: boolean; // 是否为单例 / Whether to use singleton pattern
  cacheKey?: string; // 自定义缓存键 / Custom cache key
  dependencies?: string[]; // 依赖项列表 / List of dependencies
  token?: string; // 字符串标识符 / String token for registration
}

// 抽象工厂接口 / Abstract factory interface
export interface IAbstractFactory {
  create<T>(interfaceType: new () => T): T; // 创建实例 / Create instance
  createByToken<T>(token: string): T; // 通过标识符创建实例 / Create instance by token
  createWithDependencies<T>(
    interfaceType: new () => T,
    dependencies: unknown[]
  ): T; // 创建带依赖的实例 / Create instance with dependencies
  createWithDependenciesByToken<T>(token: string, dependencies: unknown[]): T; // 通过标识符创建带依赖的实例 / Create instance with dependencies by token
  register<T>(
    interfaceType: new () => T,
    implementationType: new () => T,
    config?: FactoryConfig
  ): void; // 注册映射关系 / Register mapping
  registerByToken<T>(
    token: string,
    implementationType: new (...args: any[]) => T,
    config?: FactoryConfig
  ): void; // 通过标识符注册 / Register by token
  unregister<T>(interfaceType: new () => T): void; // 注销映射关系 / Unregister mapping
  unregisterByToken(token: string): void; // 通过标识符注销 / Unregister by token
  clearCache(): void; // 清除缓存 / Clear cache
}

// 缓存项接口 / Cache item interface
interface CacheItem {
  instance: unknown; // 缓存的实例 / Cached instance
  timestamp: number; // 缓存时间戳 / Cache timestamp
  dependencies: unknown[]; // 依赖项 / Dependencies
}

// 注册项接口 / Registry item interface
interface RegistryItem {
  implementation: new () => unknown; // 实现类 / Implementation class
  config: FactoryConfig; // 配置 / Configuration
  token?: string; // 字符串标识符 / String token
}

// 抽象工厂实现类 / Abstract factory implementation class
export class AbstractFactory implements IAbstractFactory {
  private static instance: AbstractFactory; // 单例实例 / Singleton instance
  private cache: Map<string, CacheItem> = new Map(); // 实例缓存 / Instance cache
  private registry: Map<string, RegistryItem> = new Map(); // 注册表 / Registry
  private tokenRegistry: Map<string, RegistryItem> = new Map(); // 标识符注册表 / Token registry
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存过期时间 / 5 minutes cache TTL

  private constructor() {}

  // 单例模式获取实例 / Get singleton instance
  public static getInstance(): AbstractFactory {
    if (!AbstractFactory.instance) {
      AbstractFactory.instance = new AbstractFactory();
    }
    return AbstractFactory.instance;
  }

  /**
   * 注册接口和实现类的映射关系 / Register mapping between interface and implementation
   * @param interfaceType 接口类型 / Interface type
   * @param implementationType 实现类型 / Implementation type
   * @param config 工厂配置 / Factory configuration
   */
  public register<T>(
    interfaceType: new () => T,
    implementationType: new () => T,
    config: FactoryConfig = {}
  ): void {
    const interfaceKey = this.getTypeKey(interfaceType);
    const defaultConfig: FactoryConfig = {
      singleton: false,
      cacheKey: interfaceKey,
      dependencies: [],
      token: config.token || interfaceKey,
      ...config,
    };

    // 存储实现类和配置 / Store implementation class and configuration
    this.registry.set(interfaceKey, {
      implementation: implementationType,
      config: defaultConfig,
      token: defaultConfig.token,
    });

    // 如果配置了标识符，也注册到标识符注册表 / If token is configured, also register to token registry
    if (defaultConfig.token) {
      this.tokenRegistry.set(defaultConfig.token, {
        implementation: implementationType,
        config: defaultConfig,
        token: defaultConfig.token,
      });
    }

    // 设置元数据 / Set metadata
    (Reflect as any).defineMetadata(
      METADATA_KEYS.IMPLEMENTATION,
      implementationType,
      interfaceType
    );
    (Reflect as any).defineMetadata(
      METADATA_KEYS.DEPENDENCIES,
      defaultConfig.dependencies,
      interfaceType
    );
    (Reflect as any).defineMetadata(
      METADATA_KEYS.SINGLETON,
      defaultConfig.singleton,
      interfaceType
    );
    (Reflect as any).defineMetadata(
      METADATA_KEYS.CACHE_KEY,
      defaultConfig.cacheKey,
      interfaceType
    );
    (Reflect as any).defineMetadata(
      METADATA_KEYS.TOKEN,
      defaultConfig.token,
      interfaceType
    );
  }

  /**
   * 通过标识符注册实现类 / Register implementation by token
   * @param token 标识符 / Token
   * @param implementationType 实现类型 / Implementation type
   * @param config 工厂配置 / Factory configuration
   */
  public registerByToken<T>(
    token: string,
    implementationType: new (...args: any[]) => T,
    config: FactoryConfig = {}
  ): void {
    const defaultConfig: FactoryConfig = {
      singleton: false,
      cacheKey: token,
      dependencies: [],
      token: token,
      ...config,
    };

    // 存储到标识符注册表 / Store to token registry
    this.tokenRegistry.set(token, {
      implementation: implementationType,
      config: defaultConfig,
      token: token,
    });
  }

  /**
   * 创建实例（无依赖注入） / Create instance (without dependency injection)
   * @param interfaceType 接口类型 / Interface type
   * @returns 实例 / Instance
   */
  public create<T>(interfaceType: new () => T): T {
    const cacheKey = this.getCacheKey(interfaceType);

    // 检查缓存 / Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 获取实现类 / Get implementation class
    const implementation = this.getImplementation(interfaceType);
    if (!implementation) {
      throw new Error(`No implementation registered for ${interfaceType.name}`);
    }

    // 创建实例 / Create instance
    const instance = new implementation();

    // 缓存实例 / Cache instance
    this.cacheInstance(cacheKey, instance);

    return instance;
  }

  /**
   * 通过标识符创建实例 / Create instance by token
   * @param token 标识符 / Token
   * @returns 实例 / Instance
   */
  public createByToken<T>(token: string): T {
    const cacheKey = token;

    // 检查缓存 / Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 获取实现类 / Get implementation class
    const implementation = this.getImplementationByToken(token);
    if (!implementation) {
      throw new Error(`No implementation registered for token: ${token}`);
    }

    // 创建实例 / Create instance
    const instance = new implementation();

    // 缓存实例 / Cache instance
    this.cacheInstance(cacheKey, instance);

    return instance;
  }

  /**
   * 创建实例（带依赖注入） / Create instance (with dependency injection)
   * @param interfaceType 接口类型 / Interface type
   * @param dependencies 依赖项 / Dependencies
   * @returns 实例 / Instance
   */
  public createWithDependencies<T>(
    interfaceType: new () => T,
    dependencies: any[]
  ): T {
    const cacheKey = this.getCacheKey(interfaceType, dependencies);

    // 检查缓存 / Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 获取实现类 / Get implementation class
    const implementation = this.getImplementation(interfaceType);
    if (!implementation) {
      throw new Error(`No implementation registered for ${interfaceType.name}`);
    }

    // 创建实例（带依赖注入） / Create instance (with dependency injection)
    const instance = this.createInstanceWithDependencies(
      implementation,
      dependencies
    );

    // 缓存实例 / Cache instance
    this.cacheInstance(cacheKey, instance, dependencies);

    return instance;
  }

  /**
   * 通过标识符创建带依赖的实例 / Create instance with dependencies by token
   * @param token 标识符 / Token
   * @param dependencies 依赖项 / Dependencies
   * @returns 实例 / Instance
   */
  public createWithDependenciesByToken<T>(
    token: string,
    dependencies: any[]
  ): T {
    const cacheKey = `${token}_${dependencies.map((dep) => this.getTypeKey(dep)).join('_')}`;

    // 检查缓存 / Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 获取实现类 / Get implementation class
    const implementation = this.getImplementationByToken(token);
    if (!implementation) {
      throw new Error(`No implementation registered for token: ${token}`);
    }

    // 创建实例（带依赖注入） / Create instance (with dependency injection)
    const instance = this.createInstanceWithDependencies(
      implementation,
      dependencies
    );

    // 缓存实例 / Cache instance
    this.cacheInstance(cacheKey, instance, dependencies);

    return instance;
  }

  /**
   * 注销接口映射 / Unregister interface mapping
   * @param interfaceType 接口类型 / Interface type
   */
  public unregister<T>(interfaceType: new () => T): void {
    const interfaceKey = this.getTypeKey(interfaceType);
    const registryItem = this.registry.get(interfaceKey);

    if (registryItem && registryItem.token) {
      this.tokenRegistry.delete(registryItem.token);
    }

    this.registry.delete(interfaceKey);

    // 清除相关缓存 / Clear related cache
    this.clearCacheByPattern(interfaceKey);
  }

  /**
   * 通过标识符注销映射 / Unregister mapping by token
   * @param token 标识符 / Token
   */
  public unregisterByToken(token: string): void {
    this.tokenRegistry.delete(token);

    // 清除相关缓存 / Clear related cache
    this.clearCacheByPattern(token);
  }

  /**
   * 清除所有缓存 / Clear all cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取类型键 / Get type key
   */
  private getTypeKey(type: any): string {
    return type.name || type.constructor.name;
  }

  /**
   * 获取缓存键 / Get cache key
   */
  private getCacheKey(type: any, dependencies?: any[]): string {
    const baseKey = this.getTypeKey(type);
    if (dependencies && dependencies.length > 0) {
      const depsKey = dependencies.map((dep) => this.getTypeKey(dep)).join('_');
      return `${baseKey}_${depsKey}`;
    }
    return baseKey;
  }

  /**
   * 从缓存获取实例 / Get instance from cache
   */
  private getFromCache(cacheKey: string): any | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // 检查缓存是否过期 / Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.instance;
  }

  /**
   * 缓存实例 / Cache instance
   */
  private cacheInstance(
    cacheKey: string,
    instance: any,
    dependencies?: any[]
  ): void {
    // 检查是否为单例 / Check if singleton
    const isSingleton = this.isSingletonInstance(
      instance.constructor,
      cacheKey
    );

    if (isSingleton) {
      this.cache.set(cacheKey, {
        instance,
        timestamp: Date.now(),
        dependencies: dependencies || [],
      });
    }
  }

  /**
   * 检查是否为单例实例 / Check if singleton instance
   */
  private isSingletonInstance(constructor: any, cacheKey: string): boolean {
    // 从类型注册表检查 / Check from type registry
    const typeKey = this.getTypeKey(constructor);
    const typeRegistry = this.registry.get(typeKey);
    if (typeRegistry?.config.singleton) {
      return true;
    }

    // 从标识符注册表检查 / Check from token registry
    for (const [token, registryItem] of this.tokenRegistry) {
      if (
        registryItem.implementation === constructor &&
        registryItem.config.singleton
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取实现类 / Get implementation class
   */
  private getImplementation(interfaceType: any): any {
    // 首先从注册表获取 / First get from registry
    const interfaceKey = this.getTypeKey(interfaceType);
    const registered = this.registry.get(interfaceKey);
    if (registered) {
      return registered.implementation;
    }

    // 从元数据获取 / Get from metadata
    const implementation = (Reflect as any).getMetadata(
      METADATA_KEYS.IMPLEMENTATION,
      interfaceType
    );
    if (implementation) {
      return implementation;
    }

    return null;
  }

  /**
   * 通过标识符获取实现类 / Get implementation class by token
   */
  private getImplementationByToken(token: string): any {
    const registered = this.tokenRegistry.get(token);
    return registered ? registered.implementation : null;
  }

  /**
   * 创建带依赖注入的实例 / Create instance with dependency injection
   */
  private createInstanceWithDependencies(
    implementation: any,
    dependencies: any[]
  ): any {
    // 获取构造函数的参数类型 / Get constructor parameter types
    const paramTypes =
      (Reflect as any).getMetadata('design:paramtypes', implementation) || [];

    // 优先尝试使用传入的依赖进行构造 / Prefer constructing with provided dependencies
    if (dependencies && dependencies.length > 0) {
      try {
        return new implementation(...dependencies);
      } catch (e) {
        console.warn(
          `Failed to construct ${implementation.name} with provided dependencies (len=${dependencies.length}). Falling back to no-arg constructor.`,
          e
        );
      }
    }

    // 如果没有提供依赖或构造失败，则回退到无参构造 / Fallback to no-arg constructor
    return new implementation();
  }

  /**
   * 根据模式清除缓存 / Clear cache by pattern
   */
  private clearCacheByPattern(pattern: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存统计信息 / Get cache statistics
   */
  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * 获取注册表信息 / Get registry information
   */
  public getRegistryInfo(): {
    typeSize: number;
    tokenSize: number;
    typeEntries: string[];
    tokenEntries: string[];
  } {
    return {
      typeSize: this.registry.size,
      tokenSize: this.tokenRegistry.size,
      typeEntries: Array.from(this.registry.keys()),
      tokenEntries: Array.from(this.tokenRegistry.keys()),
    };
  }

  /**
   * 批量注册配置 / Batch register from configuration
   * @param config 配置对象 / Configuration object
   */
  public registerFromConfig(
    config: Record<
      string,
      {
        implementation: new (...args: any[]) => unknown;
        config?: FactoryConfig;
      }
    >
  ): void {
    for (const [token, item] of Object.entries(config)) {
      this.registerByToken(token, item.implementation, item.config);
    }
  }
}

// 装饰器：用于标记接口和实现类的关系 / Decorator: Mark relationship between interface and implementation
export function FactoryImplementation(
  implementationType: any,
  config?: FactoryConfig
) {
  return function (target: any) {
    const factory = AbstractFactory.getInstance();
    factory.register(target, implementationType, config);
  };
}

// 装饰器：通过标识符标记实现 / Decorator: Mark implementation by token
export function FactoryToken(token: string, config?: FactoryConfig) {
  return function (target: any) {
    const factory = AbstractFactory.getInstance();
    factory.registerByToken(token, target, config);
  };
}

// 装饰器：标记单例实现 / Decorator: Mark singleton implementation
export function Singleton(config?: Omit<FactoryConfig, 'singleton'>) {
  return function (target: any) {
    const factory = AbstractFactory.getInstance();
    factory.register(target, target, { ...config, singleton: true });
  };
}

// 装饰器：通过标识符标记单例实现 / Decorator: Mark singleton implementation by token
export function SingletonToken(
  token: string,
  config?: Omit<FactoryConfig, 'singleton'>
) {
  return function (target: any) {
    const factory = AbstractFactory.getInstance();
    factory.registerByToken(token, target, { ...config, singleton: true });
  };
}

// 装饰器：注入依赖 / Decorator: Inject dependencies
export function Inject(token?: string) {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) {
    // 参数装饰器，propertyKey 可能为 undefined
    if (propertyKey === undefined) {
      // 这是构造函数参数装饰器
      const existingInjections =
        (Reflect as any).getMetadata('design:paramtypes', target) || [];
      existingInjections[parameterIndex] =
        token || existingInjections[parameterIndex];
      (Reflect as any).defineMetadata(
        'design:paramtypes',
        existingInjections,
        target
      );
    }
  };
}

// 导出默认实例 / Export default instance
export const factory = AbstractFactory.getInstance();
