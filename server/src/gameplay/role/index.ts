/**
 * Character Classes Index
 * 角色类索引文件
 *
 * 包含所有可玩角色的实现类
 */

export { EmilyGreenwood, emilyGreenwood } from './EmilyGreenwood';
export { ThomasHawthorne, thomasHawthorne } from './ThomasHawthorne';
export { LilianNoble, lilianNoble } from './LilianNoble';
export { SebastianMoore, sebastianMoore } from './SebastianMoore';

import { emilyGreenwood } from './EmilyGreenwood';
import { thomasHawthorne } from './ThomasHawthorne';
import { lilianNoble } from './LilianNoble';
import { sebastianMoore } from './SebastianMoore';
import type { SurvivorRole } from '@shares/gameplay/Survivor';

/**
 * 所有角色实例的映射表
 */
export const CharacterMap: Record<string, SurvivorRole> = {
  char_survivor_01: emilyGreenwood,
  char_survivor_02: thomasHawthorne,
  char_survivor_03: lilianNoble,
  char_survivor_04: sebastianMoore,
};

/**
 * 根据角色ID获取角色实例
 */
export function getCharacterById(
  characterId: string
): SurvivorRole | undefined {
  return CharacterMap[characterId];
}

/**
 * 获取所有可用角色ID
 */
export function getAllCharacterIds(): string[] {
  return Object.keys(CharacterMap);
}

/**
 * 检查角色ID是否有效
 */
export function isValidCharacterId(characterId: string): boolean {
  return characterId in CharacterMap;
}
