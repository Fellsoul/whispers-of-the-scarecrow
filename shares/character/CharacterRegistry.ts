import type { ICharacterDTO } from './ICharacter';
import { Character } from './Character';
import { charactersData } from '@shares/data/charactersData';

/**
 * 角色注册表 - 管理所有可用角色的配置
 * Character Registry - Manages all available character configurations
 */
export class CharacterRegistry {
  private static characters: Map<string, Character> = new Map();
  private static initialized = false;

  /**
   * 初始化角色注册表
   * Initialize character registry
   */
  static initialize(): void {
    if (this.initialized) {
      console.warn('[CharacterRegistry] Already initialized');
      return;
    }

    try {
      // 使用静态导入的角色数据
      this.registerBatch(charactersData);
      this.initialized = true;
      console.log(
        `[CharacterRegistry] Initialized with ${this.characters.size} characters`
      );
    } catch (error) {
      console.error('[CharacterRegistry] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * 注册角色
   * Register a character
   */
  static register(dto: ICharacterDTO): void {
    const character = Character.fromDTO(dto);
    this.characters.set(dto.id, character);
    console.log(
      `[CharacterRegistry] Registered character: ${dto.id} - ${dto.name}`
    );
  }

  /**
   * 批量注册角色
   * Register multiple characters
   */
  static registerBatch(dtos: ICharacterDTO[]): void {
    dtos.forEach((dto) => this.register(dto));
  }

  /**
   * 根据ID获取角色
   * Get character by ID
   */
  static getById(id: string): Character | null {
    return this.characters.get(id) || null;
  }

  /**
   * 根据ID列表获取角色
   * Get characters by IDs
   */
  static getByIds(ids: string[]): Character[] {
    return ids
      .map((id) => this.getById(id))
      .filter((char): char is Character => char !== null);
  }

  /**
   * 获取所有角色
   * Get all characters
   */
  static getAll(): Character[] {
    return Array.from(this.characters.values());
  }

  /**
   * 根据阵营获取角色
   * Get characters by faction
   */
  static getByFaction(faction: 'Survivor' | 'Overseer'): Character[] {
    return Array.from(this.characters.values()).filter(
      (char) => char.faction === faction
    );
  }

  /**
   * 获取默认解锁的角色
   * Get default unlocked characters
   */
  static getDefaultUnlocked(): Character[] {
    return Array.from(this.characters.values()).filter(
      (char) => char.defaultUnlocked === true
    );
  }

  /**
   * 获取默认解锁的角色ID列表
   * Get default unlocked character IDs
   */
  static getDefaultUnlockedIds(): string[] {
    return this.getDefaultUnlocked().map((char) => char.id);
  }

  /**
   * 检查角色是否存在
   * Check if character exists
   */
  static has(id: string): boolean {
    return this.characters.has(id);
  }

  /**
   * 清空注册表（用于测试）
   * Clear registry (for testing)
   */
  static clear(): void {
    this.characters.clear();
    this.initialized = false;
    console.log('[CharacterRegistry] Cleared');
  }

  /**
   * 获取注册的角色数量
   * Get count of registered characters
   */
  static count(): number {
    return this.characters.size;
  }
}
