/**
 * 角色技能接口
 */
export interface ICharacterSkill {
  /** 技能标题 */
  title: string;
  /** 技能描述 */
  desc: string;
  /** 技能图标URL */
  icon: string;
}

/**
 * 角色基础接口
 */
export interface ICharacter {
  /** 角色唯一ID */
  id: string;
  /** 角色名称 */
  name: string;
  /** 角色昵称（可选） */
  nickname?: string;
  /** 角色头像URL */
  portrait: string;
  /** 卷轴背景图URL */
  scrollImage: string;
  /** 角色介绍 */
  intro: string;
  /** 特殊技能标题 */
  specialSkillTitle: string;
  /** 技能1 */
  skill1: ICharacterSkill;
  /** 技能2 */
  skill2: ICharacterSkill;
  /** 角色阵营 */
  faction: 'Survivor' | 'Overseer';
  /** 是否默认解锁 */
  defaultUnlocked?: boolean;
  /** Gameplay角色配置ID（关联到BaseRole/SurvivorRole/OverseerRole） */
  gameplayRoleId?: string;
  /** 玩家皮肤名称 */
  skinName?: string;
}

/**
 * 角色数据传输对象（用于网络传输）
 */
export interface ICharacterDTO {
  id: string;
  name: string;
  nickname?: string;
  portrait: string;
  scrollImage: string;
  intro: string;
  specialSkillTitle: string;
  skill1: ICharacterSkill;
  skill2: ICharacterSkill;
  faction: 'Survivor' | 'Overseer';
  defaultUnlocked?: boolean;
  gameplayRoleId?: string;
  skinName?: string;
}
