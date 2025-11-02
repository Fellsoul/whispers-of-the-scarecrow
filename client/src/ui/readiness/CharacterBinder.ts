/**
 * CharacterBinder - 负责将角色数据绑定到UI节点（单一职责，只赋值不存状态）
 */

import type { Character } from '@shares/character/Character';
import type { UiRefs } from './types';
import i18n from '@root/i18n';

/**
 * 占位图URL
 */
const PLACEHOLDER = {
  portrait: '', // 占位头像
  scroll: '', // 占位卷轴
  icon: '', // 占位技能图标
};

export class CharacterBinder {
  private static currentCharacter: Character | null = null;
  private static currentUiRefs: UiRefs | null = null;
  private static languageListenerSetup: boolean = false;

  /**
   * 设置语言切换监听器（只设置一次）
   */
  private static setupLanguageListener(): void {
    if (this.languageListenerSetup) {
      return;
    }

    i18n.on('languageChanged', (lng: string) => {
      console.log(
        `[CharacterBinder] Language changed to ${lng}, rebinding character`
      );

      // 如果有当前绑定的角色，重新绑定
      if (this.currentCharacter && this.currentUiRefs) {
        this.bind(this.currentCharacter, this.currentUiRefs);
      }
    });

    this.languageListenerSetup = true;
    console.log('[CharacterBinder] Language listener setup complete');
  }
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

    // 设置语言监听器（只在第一次调用时设置）
    this.setupLanguageListener();

    // 保存当前绑定的角色和UI引用
    this.currentCharacter = character;
    this.currentUiRefs = uiRefs;

    console.log(`[CharacterBinder] Binding character: ${character.id}`);

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

    // 绑定文本 - 使用 i18next 获取翻译
    if (uiRefs.characterName) {
      uiRefs.characterName.textContent = i18n.t(
        `character:${character.id}.name`,
        character.id
      );
    }

    if (uiRefs.characterNickname) {
      const nickname = i18n.t(`character:${character.id}.nickname`, '');
      uiRefs.characterNickname.textContent = nickname;
      uiRefs.characterNickname.visible = !!nickname;
    }

    if (uiRefs.characterIntro) {
      uiRefs.characterIntro.textContent = i18n.t(
        `character:${character.id}.intro`,
        ''
      );
    }

    if (uiRefs.characterSpecialSkillTitle) {
      uiRefs.characterSpecialSkillTitle.textContent = i18n.t(
        `character:${character.id}.specialSkillTitle`,
        ''
      );
    }

    // 绑定技能1 - 使用 i18next 获取翻译
    const skill1Title = i18n.t(`character:${character.id}.skill1.title`, '');
    const skill1Desc = i18n.t(`character:${character.id}.skill1.desc`, '');
    console.log(`[CharacterBinder] Skill1 - Title: "${skill1Title}", Desc: "${skill1Desc}", Icon: "${character.skill1?.icon}"`);
    console.log(`[CharacterBinder] Skill1 - uiRefs.skill1image exists: ${!!uiRefs.skill1image}, character.skill1 exists: ${!!character.skill1}`);
    
    if (skill1Title && skill1Desc) {
      if (uiRefs.characterSkill1Intro) {
        uiRefs.characterSkill1Intro.textContent = `${skill1Title}\n${skill1Desc}`;
      }
      if (uiRefs.skill1image && character.skill1?.icon) {
        uiRefs.skill1image.image = character.skill1.icon || PLACEHOLDER.icon;
        uiRefs.skill1image.visible = true; // 确保图片可见
        console.log(`[CharacterBinder] ✅ Skill1 image set to: ${character.skill1.icon}, visible: ${uiRefs.skill1image.visible}`);
      } else {
        console.warn(`[CharacterBinder] ❌ Skill1 image NOT set - uiRefs.skill1image: ${!!uiRefs.skill1image}, icon: ${character.skill1?.icon}`);
        if (uiRefs.skill1image) {
          uiRefs.skill1image.visible = false;
        }
      }
    } else {
      console.warn(`[CharacterBinder] ❌ Skill1 text missing - cannot display skill1`);
    }

    // 绑定技能2 - 使用 i18next 获取翻译
    const skill2Title = i18n.t(`character:${character.id}.skill2.title`, '');
    const skill2Desc = i18n.t(`character:${character.id}.skill2.desc`, '');
    console.log(`[CharacterBinder] Skill2 - Title: "${skill2Title}", Desc: "${skill2Desc}", Icon: "${character.skill2?.icon}"`);
    console.log(`[CharacterBinder] Skill2 - uiRefs.skill2image exists: ${!!uiRefs.skill2image}, character.skill2 exists: ${!!character.skill2}`);
    
    if (skill2Title && skill2Desc) {
      if (uiRefs.characterSkill2Intro) {
        uiRefs.characterSkill2Intro.textContent = `${skill2Title}\n${skill2Desc}`;
      }
      if (uiRefs.skill2image && character.skill2?.icon) {
        uiRefs.skill2image.image = character.skill2.icon || PLACEHOLDER.icon;
        uiRefs.skill2image.visible = true; // 确保图片可见
        console.log(`[CharacterBinder] ✅ Skill2 image set to: ${character.skill2.icon}, visible: ${uiRefs.skill2image.visible}`);
      } else {
        console.warn(`[CharacterBinder] ❌ Skill2 image NOT set - uiRefs.skill2image: ${!!uiRefs.skill2image}, icon: ${character.skill2?.icon}`);
        if (uiRefs.skill2image) {
          uiRefs.skill2image.visible = false;
        }
      }
    } else {
      console.warn(`[CharacterBinder] ❌ Skill2 text missing - cannot display skill2`);
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
