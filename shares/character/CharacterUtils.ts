import type { Character } from './Character';
import { CharacterRegistry } from './CharacterRegistry';

/**
 * 角色工具类 - 提供角色相关的工具方法
 * Character Utils - Provides utility methods for character operations
 */
export class CharacterUtils {
  /**
   * 将逗号分隔的角色ID字符串转换为Character数组
   * Convert comma-separated character ID string to Character array
   * @param unlockedCharactersStr 逗号分隔的角色ID字符串
   * @returns Character数组
   */
  static parseUnlockedCharacters(unlockedCharactersStr: string): Character[] {
    if (!unlockedCharactersStr || unlockedCharactersStr.trim() === '') {
      return [];
    }

    const ids = unlockedCharactersStr
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '');

    return CharacterRegistry.getByIds(ids);
  }

  /**
   * 将Character数组转换为逗号分隔的ID字符串
   * Convert Character array to comma-separated ID string
   * @param characters Character数组
   * @returns 逗号分隔的ID字符串
   */
  static stringifyCharacters(characters: Character[]): string {
    return characters.map((char) => char.id).join(',');
  }

  /**
   * 获取玩家已解锁的角色列表（包括默认解锁）
   * Get player's unlocked characters (including default unlocked)
   * @param unlockedCharactersStr 玩家的解锁角色ID字符串
   * @returns 已解锁的Character数组
   */
  static getPlayerUnlockedCharacters(
    unlockedCharactersStr: string
  ): Character[] {
    // 获取默认解锁的角色
    const defaultUnlocked = CharacterRegistry.getDefaultUnlocked();

    // 获取玩家已解锁的角色
    const playerUnlocked = this.parseUnlockedCharacters(unlockedCharactersStr);

    // 合并并去重
    const allUnlocked = new Map<string, Character>();

    defaultUnlocked.forEach((char) => {
      allUnlocked.set(char.id, char);
    });

    playerUnlocked.forEach((char) => {
      allUnlocked.set(char.id, char);
    });

    return Array.from(allUnlocked.values());
  }

  /**
   * 获取玩家已解锁的特定阵营角色
   * Get player's unlocked characters by faction
   * @param unlockedCharactersStr 玩家的解锁角色ID字符串
   * @param faction 阵营
   * @returns 已解锁的Character数组
   */
  static getPlayerUnlockedCharactersByFaction(
    unlockedCharactersStr: string,
    faction: 'Survivor' | 'Overseer'
  ): Character[] {
    const unlocked = this.getPlayerUnlockedCharacters(unlockedCharactersStr);
    return unlocked.filter((char) => char.faction === faction);
  }

  /**
   * 检查玩家是否已解锁某个角色
   * Check if player has unlocked a character
   * @param characterId 角色ID
   * @param unlockedCharactersStr 玩家的解锁角色ID字符串
   * @returns 是否已解锁
   */
  static isCharacterUnlocked(
    characterId: string,
    unlockedCharactersStr: string
  ): boolean {
    // 检查是否是默认解锁角色
    const character = CharacterRegistry.getById(characterId);
    if (character?.defaultUnlocked) {
      return true;
    }

    // 检查玩家是否已解锁
    const unlockedIds = unlockedCharactersStr
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '');

    return unlockedIds.includes(characterId);
  }

  /**
   * 解锁角色（添加到解锁列表）
   * Unlock a character (add to unlocked list)
   * @param characterId 角色ID
   * @param unlockedCharactersStr 当前的解锁角色ID字符串
   * @returns 更新后的解锁角色ID字符串
   */
  static unlockCharacter(
    characterId: string,
    unlockedCharactersStr: string
  ): string {
    // 检查角色是否存在
    if (!CharacterRegistry.has(characterId)) {
      console.warn(`[CharacterUtils] Character not found: ${characterId}`);
      return unlockedCharactersStr;
    }

    // 检查是否已解锁
    if (this.isCharacterUnlocked(characterId, unlockedCharactersStr)) {
      console.log(
        `[CharacterUtils] Character already unlocked: ${characterId}`
      );
      return unlockedCharactersStr;
    }

    // 添加到解锁列表
    const unlockedIds = unlockedCharactersStr
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '');

    unlockedIds.push(characterId);

    return unlockedIds.join(',');
  }

  /**
   * 批量解锁角色
   * Unlock multiple characters
   * @param characterIds 角色ID数组
   * @param unlockedCharactersStr 当前的解锁角色ID字符串
   * @returns 更新后的解锁角色ID字符串
   */
  static unlockCharacters(
    characterIds: string[],
    unlockedCharactersStr: string
  ): string {
    let result = unlockedCharactersStr;
    characterIds.forEach((id) => {
      result = this.unlockCharacter(id, result);
    });
    return result;
  }

  /**
   * 获取玩家未解锁的角色
   * Get player's locked characters
   * @param unlockedCharactersStr 玩家的解锁角色ID字符串
   * @returns 未解锁的Character数组
   */
  static getPlayerLockedCharacters(unlockedCharactersStr: string): Character[] {
    const allCharacters = CharacterRegistry.getAll();
    const unlocked = this.getPlayerUnlockedCharacters(unlockedCharactersStr);
    const unlockedIds = new Set(unlocked.map((char) => char.id));

    return allCharacters.filter((char) => !unlockedIds.has(char.id));
  }

  /**
   * 获取角色的Gameplay Role ID
   * Get character's gameplay role ID
   * @param characterId 角色ID
   * @returns Gameplay Role ID
   */
  static getGameplayRoleId(characterId: string): string | null {
    const character = CharacterRegistry.getById(characterId);
    return character?.gameplayRoleId || null;
  }
}
