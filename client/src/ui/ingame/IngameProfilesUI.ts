import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';
import type { PlayerProfileData } from './events';
import { CharacterRegistry } from '@shares/character/CharacterRegistry';

/**
 * Profile UI引用
 */
interface ProfileUIRefs {
  container: UiImage;
  avatar: UiImage;
  carryingItem: UiImage;
  characterName: UiText;
  characterNickname: UiText;
  healthBarClip: UiBox;
  healthBar: UiImage;
  playerName: UiText;
  statusCircle: UiImage;
  statusFigure: UiImage;
}

export type UiScreenInstance = UiIndex_screen;
/**
 * IngameProfilesUI - 游戏中玩家状态UI管理
 * 负责UI元素的获取和更新显示
 */
export class IngameProfilesUI {
  private uiScreen: UiScreenInstance | null = null;
  private profiles: (ProfileUIRefs | null)[] = [];
  private maxPlayers: number = 4;
  private unlockedCharacters: Set<string> = new Set();

  /** 缓存的profile容器列表 */
  private profileContainers: UiImage[] = [];

  constructor(screen?: UiScreenInstance) {
    if (screen) {
      this.uiScreen = screen;
    }
  }

  /**
   * 初始化UI
   * @param screen UI屏幕
   * @param maxPlayers 最大玩家数
   * @param unlockedCharacters 已解锁的角色列表
   */
  public initialize(
    screen: UiScreenInstance,
    maxPlayers: number,
    unlockedCharacters: string[]
  ): void {
    this.uiScreen = screen;
    this.maxPlayers = maxPlayers;
    this.unlockedCharacters = new Set(unlockedCharacters);

    // 通过遍历container获取所有profile
    this.cacheProfileContainers();

    // 获取所有profile的UI引用
    this.profiles = [];
    for (let i = 0; i < this.profileContainers.length; i++) {
      this.profiles.push(this.getProfileUIRefs(i));
    }

    // 根据地图大小显隐profile
    this.updateProfileVisibility();

    // 清空所有profile
    this.clearAllProfiles();

    console.log(
      `[IngameProfilesUI] Initialized for ${maxPlayers} players, ${this.profileContainers.length} profiles cached, ${unlockedCharacters.length} unlocked characters`
    );
  }

  /**
   * 缓存profile容器列表
   * 遍历ingameProfilesContainer的children，找到所有profile容器
   */
  private cacheProfileContainers(): void {
    const ingameProfilesContainer = this.getIngameProfilesContainer();
    if (!ingameProfilesContainer || !ingameProfilesContainer.children) {
      console.warn(
        '[IngameProfilesUI] ingameProfilesContainer not found or has no children'
      );
      return;
    }

    // 筛选出所有名称为profileN的容器
    this.profileContainers = [];
    for (const child of ingameProfilesContainer.children) {
      // 检查是否是profile容器（名称格式为profile1, profile2, ...）
      if (
        child.name &&
        child.name.startsWith('profile') &&
        child instanceof UiImage
      ) {
        this.profileContainers.push(child as UiImage);
      }
    }

    // 按名称排序确保顺序正确 (profile1, profile2, ...)
    this.profileContainers.sort((a, b) => {
      const indexA = parseInt(a.name.replace('profile', '')) || 0;
      const indexB = parseInt(b.name.replace('profile', '')) || 0;
      return indexA - indexB;
    });

    console.log(
      `[IngameProfilesUI] Cached ${this.profileContainers.length} profile containers`
    );
  }

  /**
   * 获取游戏中profiles容器
   */
  private getIngameProfilesContainer(): UiBox | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiBox_ingameProfilesContainer || null;
  }

  /**
   * 获取指定profile的UI引用
   * @param profileIndex profile索引 (0-7)
   */
  private getProfileUIRefs(profileIndex: number): ProfileUIRefs | null {
    if (profileIndex < 0 || profileIndex >= this.profileContainers.length) {
      return null;
    }

    try {
      const container = this.profileContainers[profileIndex];
      if (!container || !container.children) {
        console.warn(
          `[IngameProfilesUI] Profile${profileIndex + 1} container not found`
        );
        return null;
      }

      // 通过遍历children获取各个UI元素
      const avatar = container.children.find(
        (child) => child.name === 'avatar'
      ) as UiImage;
      const carryingItem = container.children.find(
        (child) => child.name === 'carryingItem'
      ) as UiImage;
      const characterName = container.children.find(
        (child) => child.name === 'characterName'
      ) as UiText;
      const characterNickname = container.children.find(
        (child) => child.name === 'characterNickname'
      ) as UiText;
      const healthBarClip = container.children.find(
        (child) => child.name === 'healthBarClip'
      ) as UiBox;
      const playerName = container.children.find(
        (child) => child.name === 'name'
      ) as UiText;
      const statusCircle = container.children.find(
        (child) => child.name === 'statusCircle'
      ) as UiImage;
      const statusFigure = container.children.find(
        (child) => child.name === 'statusFigure'
      ) as UiImage;

      // 获取healthBar (healthBarClip的子元素)
      let healthBar: UiImage | undefined;
      if (healthBarClip && healthBarClip.children) {
        healthBar = healthBarClip.children.find(
          (child) => child.name === 'healthBar'
        ) as UiImage;
      }

      // 检查必需元素是否存在
      if (!avatar || !playerName || !healthBarClip || !healthBar) {
        console.warn(
          `[IngameProfilesUI] Profile${profileIndex + 1} missing required elements:`,
          {
            avatar: !!avatar,
            playerName: !!playerName,
            healthBarClip: !!healthBarClip,
            healthBar: !!healthBar,
          }
        );
        return null;
      }

      // 打印所有子元素的name，用于调试
      console.log(
        `[IngameProfilesUI] Profile${profileIndex + 1} children names:`,
        container.children.map((c) => c.name)
      );

      // 检查可选元素
      console.log(
        `[IngameProfilesUI] Profile${profileIndex + 1} optional elements:`,
        {
          characterName: !!characterName,
          characterNickname: !!characterNickname,
          carryingItem: !!carryingItem,
        }
      );

      return {
        container,
        avatar,
        carryingItem,
        characterName,
        characterNickname,
        healthBarClip,
        healthBar,
        playerName,
        statusCircle,
        statusFigure,
      };
    } catch (error) {
      console.error(
        `[IngameProfilesUI] Failed to get UI refs for profile${profileIndex + 1}:`,
        error
      );
      return null;
    }
  }

  /**
   * 根据地图大小更新profile显隐
   */
  private updateProfileVisibility(): void {
    for (let i = 0; i < this.profiles.length; i++) {
      const profile = this.profiles[i];
      if (profile) {
        const shouldShow = i < this.maxPlayers;
        profile.container.visible = shouldShow;
      }
    }
    console.log(
      `[IngameProfilesUI] Showing ${this.maxPlayers} profiles (by maxPlayers)`
    );
  }

  /**
   * 根据实际玩家数量更新profile显隐
   * @param occupiedSlots 已占用的槽位索引数组
   */
  public updateProfileVisibilityByCount(occupiedSlots: number[]): void {
    for (let i = 0; i < this.profiles.length; i++) {
      const profile = this.profiles[i];
      if (profile) {
        // 只显示：1) 在maxPlayers范围内 且 2) 有玩家数据的槽位
        const inRange = i < this.maxPlayers;
        const hasPlayer = occupiedSlots.includes(i);
        profile.container.visible = inRange && hasPlayer;
      }
    }
    console.log(
      `[IngameProfilesUI] Updated visibility: ${occupiedSlots.length} profiles shown (${occupiedSlots.join(', ')})`
    );
  }

  /**
   * 更新玩家profile显示
   * @param slotIndex profile槽位索引 (0-7)
   * @param data 玩家数据
   */
  public updateProfile(slotIndex: number, data: PlayerProfileData): void {
    if (slotIndex < 0 || slotIndex >= this.profiles.length) {
      console.warn(`[IngameProfilesUI] Invalid slotIndex: ${slotIndex}`);
      return;
    }

    const profile = this.profiles[slotIndex];
    if (!profile) {
      console.warn(`[IngameProfilesUI] Profile not found at slot ${slotIndex}`);
      return;
    }

    console.log(`[IngameProfilesUI] Updating profile at slot ${slotIndex}:`, {
      playerName: data.playerName,
      characterId: data.characterId,
      hasPlayerNameElement: !!profile.playerName,
      hasCharacterNameElement: !!profile.characterName,
      hasCharacterNicknameElement: !!profile.characterNickname,
    });

    // 更新玩家昵称（永远显示玩家的昵称）
    if (profile.playerName) {
      profile.playerName.textContent = data.playerName;
      console.log(`[IngameProfilesUI] Set playerName to: ${data.playerName}`);
    } else {
      console.warn(`[IngameProfilesUI] playerName element not found`);
    }

    // 获取角色信息
    const character = CharacterRegistry.getById(data.characterId);
    const isUnlocked = this.unlockedCharacters.has(data.characterId);

    console.log(`[IngameProfilesUI] Character info:`, {
      characterId: data.characterId,
      found: !!character,
      isUnlocked,
      characterName: character?.name,
      characterNickname: character?.nickname,
    });

    // 更新角色名称（未解锁显示"???"）
    if (profile.characterName) {
      const displayName = isUnlocked && character ? character.name : '???';
      profile.characterName.textContent = displayName;
      console.log(`[IngameProfilesUI] Set characterName to: ${displayName}`);
    } else {
      console.warn(`[IngameProfilesUI] characterName element not found`);
    }

    // 更新角色昵称（默认显示，不受解锁限制）
    if (profile.characterNickname) {
      if (character) {
        const displayNickname = character.nickname || character.name;
        profile.characterNickname.textContent = displayNickname;
        console.log(
          `[IngameProfilesUI] Set characterNickname to: ${displayNickname}`
        );
      } else {
        profile.characterNickname.textContent = '';
        console.warn(
          `[IngameProfilesUI] Character not found, clearing characterNickname`
        );
      }
    } else {
      console.warn(`[IngameProfilesUI] characterNickname element not found`);
    }

    // 更新头像
    if (profile.avatar) {
      if (character && isUnlocked) {
        profile.avatar.image = character.portrait;
      } else {
        profile.avatar.image = 'assets/ui/avatar_unknown.png';
      }
    }

    // 更新血量条
    this.updateHealthBar(profile, data.currentHP, data.maxHP);

    // 更新携带物品
    if (profile.carryingItem) {
      if (data.carryingItem) {
        profile.carryingItem.visible = true;
        profile.carryingItem.image = data.carryingItem;
      } else {
        profile.carryingItem.visible = false;
      }
    }

    // 更新状态效果
    if (
      profile.statusFigure &&
      data.statusEffects &&
      data.statusEffects.length > 0
    ) {
      profile.statusFigure.visible = true;
      // TODO: 根据状态效果类型显示对应图标
    } else if (profile.statusFigure) {
      profile.statusFigure.visible = false;
    }

    // 显示profile
    profile.container.visible = true;

    console.log(
      `[IngameProfilesUI] Updated profile ${slotIndex + 1} for ${data.playerName} (${data.currentHP}/${data.maxHP} HP)`
    );
  }

  /**
   * 更新血量条显示
   * @param profile Profile UI引用
   * @param currentHP 当前血量
   * @param maxHP 最大血量
   */
  private updateHealthBar(
    profile: ProfileUIRefs,
    currentHP: number,
    maxHP: number
  ): void {
    const hpPercent = Math.max(0, Math.min(1, currentHP / maxHP));

    // 通过修改healthBarClip的高度来实现血条效果
    // 这个需要根据实际UI框架的API调整
    // 示例：假设可以直接修改height属性
    if (profile.healthBarClip) {
      // 方法1：修改scale (如果支持)
      // profile.healthBarClip.scale.y = hpPercent;
      // 方法2：修改height (如果支持)
      // const originalHeight = 50; // 根据实际设计
      // profile.healthBarClip.height = originalHeight * hpPercent;
      // 方法3：使用clip rect (如果支持)
      // 这里留空，等待根据实际API实现
    }

    // 低血量警告
    if (hpPercent <= 0.3) {
      if (profile.statusCircle) {
        profile.statusCircle.visible = true;
      }
    } else {
      if (profile.statusCircle) {
        profile.statusCircle.visible = false;
      }
    }
  }

  /**
   * 隐藏指定profile
   * @param slotIndex profile槽位索引
   */
  public hideProfile(slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= this.profiles.length) {
      return;
    }

    const profile = this.profiles[slotIndex];
    if (profile) {
      profile.container.visible = false;
      console.log(`[IngameProfilesUI] Hidden profile ${slotIndex + 1}`);
    }
  }

  /**
   * 清空所有profile的内容，但保持容器的显隐状态
   */
  public clearAllProfiles(): void {
    this.profiles.forEach((profile) => {
      if (profile) {
        // 只清空内容，不改变visible状态
        if (profile.playerName) {
          profile.playerName.textContent = '';
        }
        if (profile.characterName) {
          profile.characterName.textContent = '';
        }
        if (profile.characterNickname) {
          profile.characterNickname.textContent = '';
        }
        if (profile.avatar) {
          profile.avatar.image = '';
        }
        if (profile.carryingItem) {
          profile.carryingItem.visible = false;
        }
        if (profile.statusFigure) {
          profile.statusFigure.visible = false;
        }
      }
    });
    console.log('[IngameProfilesUI] Cleared all profile contents');
  }

  /**
   * 更新已解锁角色列表
   * @param unlockedCharacters 已解锁的角色ID列表
   */
  public updateUnlockedCharacters(unlockedCharacters: string[]): void {
    this.unlockedCharacters = new Set(unlockedCharacters);
    console.log(
      `[IngameProfilesUI] Updated unlocked characters: ${unlockedCharacters.length}`
    );
  }

  /**
   * 获取容器可见性
   */
  public isVisible(): boolean {
    const container = this.getIngameProfilesContainer();
    return container?.visible || false;
  }

  /**
   * 设置容器可见性
   */
  public setVisible(visible: boolean): void {
    const container = this.getIngameProfilesContainer();
    if (container) {
      container.visible = visible;
    }
  }

  // dispose
  public dispose(): void {
    this.clearAllProfiles();
    this.unlockedCharacters.clear();
    this.profiles = [];
    this.profileContainers = [];
    this.uiScreen = null;
  }
}
