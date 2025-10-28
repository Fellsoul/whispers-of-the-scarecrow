/**
 * CharacterBinder - 负责将角色数据绑定到UI节点（单一职责，只赋值不存状态）
 */

import type { Character } from '@shares/character/Character';
import type { UiRefs } from './types';

/**
 * 占位图URL
 */
const PLACEHOLDER = {
  portrait: '', // 占位头像
  scroll: '', // 占位卷轴
  icon: '', // 占位技能图标
};

export class CharacterBinder {
  /**
   * 绑定角色数据到UI
   * @param character 角色数据
   * @param uiRefs UI节点引用
   */
  static bind(character: Character | null, uiRefs: UiRefs): void {
    if (!character) {
      console.warn('[CharacterBinder] Character is null, skipping bind');
      return;
    }

    console.log(`[CharacterBinder] Binding character: ${character.name}`);

    // 绑定头像
    if (uiRefs.characterPortrait) {
      uiRefs.characterPortrait.image =
        character.portrait || PLACEHOLDER.portrait;
    }

    // 绑定卷轴背景
    if (uiRefs.characterIntroScroll) {
      uiRefs.characterIntroScroll.image =
        character.scrollImage || PLACEHOLDER.scroll;
    }

    // 绑定文本
    if (uiRefs.characterName) {
      uiRefs.characterName.textContent = character.name || '';
    }

    if (uiRefs.characterNickname) {
      uiRefs.characterNickname.textContent = character.nickname || '';
      uiRefs.characterNickname.visible = !!character.nickname;
    }

    if (uiRefs.characterIntro) {
      uiRefs.characterIntro.textContent = character.intro || '';
    }

    if (uiRefs.characterSpecialSkillTitle) {
      uiRefs.characterSpecialSkillTitle.textContent =
        character.specialSkillTitle || '';
    }

    // 绑定技能1
    if (character.skill1) {
      if (uiRefs.characterSkill1Intro) {
        uiRefs.characterSkill1Intro.textContent = `${character.skill1.title}\n${character.skill1.desc}`;
      }
      if (uiRefs.skill1image) {
        uiRefs.skill1image.image = character.skill1.icon || PLACEHOLDER.icon;
      }
    }

    // 绑定技能2
    if (character.skill2) {
      if (uiRefs.characterSkill2Intro) {
        uiRefs.characterSkill2Intro.textContent = `${character.skill2.title}\n${character.skill2.desc}`;
      }
      if (uiRefs.skill2image) {
        uiRefs.skill2image.image = character.skill2.icon || PLACEHOLDER.icon;
      }
    }

    // 资源缺失警告
    if (!character.portrait) {
      console.warn(
        `[CharacterBinder] Missing portrait for character: ${character.id}`
      );
    }
    if (!character.scrollImage) {
      console.warn(
        `[CharacterBinder] Missing scrollImage for character: ${character.id}`
      );
    }
  }

  /**
   * 清空UI显示
   */
  static clear(uiRefs: UiRefs): void {
    console.log('[CharacterBinder] Clearing UI');

    if (uiRefs.characterPortrait) {
      uiRefs.characterPortrait.image = PLACEHOLDER.portrait;
    }
    if (uiRefs.characterIntroScroll) {
      uiRefs.characterIntroScroll.image = PLACEHOLDER.scroll;
    }
    if (uiRefs.characterName) {
      uiRefs.characterName.textContent = '';
    }
    if (uiRefs.characterNickname) {
      uiRefs.characterNickname.textContent = '';
    }
    if (uiRefs.characterIntro) {
      uiRefs.characterIntro.textContent = '';
    }
    if (uiRefs.characterSpecialSkillTitle) {
      uiRefs.characterSpecialSkillTitle.textContent = '';
    }
    if (uiRefs.characterSkill1Intro) {
      uiRefs.characterSkill1Intro.textContent = '';
    }
    if (uiRefs.characterSkill2Intro) {
      uiRefs.characterSkill2Intro.textContent = '';
    }
    if (uiRefs.skill1image) {
      uiRefs.skill1image.image = PLACEHOLDER.icon;
    }
    if (uiRefs.skill2image) {
      uiRefs.skill2image.image = PLACEHOLDER.icon;
    }
  }
}
