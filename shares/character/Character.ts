import type { ICharacter, ICharacterSkill, ICharacterDTO } from './ICharacter';

/**
 * 角色类实现
 */
export class Character implements ICharacter {
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

  constructor(data: ICharacterDTO) {
    this.id = data.id;
    this.name = data.name;
    this.nickname = data.nickname;
    this.portrait = data.portrait;
    this.scrollImage = data.scrollImage;
    this.intro = data.intro;
    this.specialSkillTitle = data.specialSkillTitle;
    this.skill1 = data.skill1;
    this.skill2 = data.skill2;
    this.faction = data.faction;
    this.defaultUnlocked = data.defaultUnlocked;
    this.gameplayRoleId = data.gameplayRoleId;
    this.skinName = data.skinName;
  }

  /**
   * 从DTO创建Character实例
   */
  static fromDTO(dto: ICharacterDTO): Character {
    return new Character(dto);
  }

  /**
   * 转换为DTO
   */
  toDTO(): ICharacterDTO {
    return {
      id: this.id,
      name: this.name,
      nickname: this.nickname,
      portrait: this.portrait,
      scrollImage: this.scrollImage,
      intro: this.intro,
      specialSkillTitle: this.specialSkillTitle,
      skill1: this.skill1,
      skill2: this.skill2,
      faction: this.faction,
      defaultUnlocked: this.defaultUnlocked,
      gameplayRoleId: this.gameplayRoleId,
      skinName: this.skinName,
    };
  }

  /**
   * 验证角色数据完整性
   */
  validate(): boolean {
    if (!this.id || !this.name || !this.portrait) {
      return false;
    }
    if (!this.skill1?.title || !this.skill2?.title) {
      return false;
    }
    return true;
  }

  /**
   * 获取显示名称（优先昵称）
   */
  getDisplayName(): string {
    return this.nickname || this.name;
  }
}
