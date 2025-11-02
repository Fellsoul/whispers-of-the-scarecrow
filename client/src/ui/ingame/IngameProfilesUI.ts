import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';
import type { PlayerProfileData } from './events';
import { CharacterRegistry } from '@shares/character/CharacterRegistry';
import i18n from '@root/i18n';
import { EventBus } from '../../core/events/EventBus';
import { Animation } from '../Animation';

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

  /** 缓存当前显示的玩家数据，用于语言切换时重新绑定 */
  private cachedPlayerData: Map<number, PlayerProfileData> = new Map();

  /** userId 到 slotIndex 的映射 */
  private userIdToSlot: Map<string, number> = new Map();

  /** 当前玩家的 slot index */
  private currentPlayerSlot: number = -1;

  /** 语言监听器是否已设置 */
  private languageListenerSetup: boolean = false;

  /** 场景模式监听器是否已设置 */
  private sceneModeListenerSetup: boolean = false;

  /** 当前场景模式 */
  private sceneMode: 'readiness' | 'ingame' = 'readiness';

  /** Heart UI 元素引用 */
  private heartContainer: UiImage | null = null;
  private heartClip: UiBox | null = null;
  private heartBg: UiImage | null = null;
  private heart: UiImage | null = null;
  /** 心跳动画相关 */
  private heartbeatZone: number = 0; // 0 = 无心跳, 1 = 慢速, 2 = 中速, 3 = 快速
  private heartbeatStopFn: (() => void) | null = null;

  /** 缓存每个 profile 的原始 UiText 元素（用于恢复） */
  private originalTextElements: Map<
    number,
    {
      characterName: UiText | null;
      characterNickname: UiText | null;
    }
  > = new Map();

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

    // 获取 Heart UI 元素
    this.initializeHeartUI();

    // 设置事件监听器（包括场景模式监听）
    this.setupEventListeners();

    console.log(
      `[IngameProfilesUI] Initialized for ${maxPlayers} players, ${this.profileContainers.length} profiles cached, ${unlockedCharacters.length} unlocked characters`
    );
  }

  /**
   * 设置场景模式（由服务端通知）
   * @param mode 场景模式
   */
  private setSceneMode(mode: 'readiness' | 'ingame'): void {
    if (this.sceneMode === mode) {
      return; // 模式未改变，无需重复应用
    }

    this.sceneMode = mode;

    // 应用场景模式到所有 profiles
    this.applySceneModeToAllProfiles();
    
    // 更新心形容器的显示状态
    this.updateHeartContainerVisibility();

    // 如果切换到 ingame 模式，初始化所有 statusFigure 为 Normal 状态
    if (mode === 'ingame') {
      this.initializeAllStatusFigures();
    }

    console.log(`[IngameProfilesUI] Scene mode changed to: ${this.sceneMode}`);
  }

  /**
   * 将场景模式应用到所有 profiles
   */
  private applySceneModeToAllProfiles(): void {
    for (let i = 0; i < this.profiles.length; i++) {
      this.applySceneModeToProfile(i);
    }
  }

  /**
   * 初始化所有 statusFigure 为 Normal 状态（游戏开始时）
   */
  private initializeAllStatusFigures(): void {
    for (let i = 0; i < this.profiles.length; i++) {
      const profile = this.profiles[i];
      if (profile && profile.statusFigure && profile.container.visible) {
        profile.statusFigure.image = 'picture/profileStatusNormal.png';
      }
    }
    console.log('[IngameProfilesUI] Initialized all statusFigures to Normal state');
  }

  /**
   * 初始化 Heart UI 元素
   */
  private initializeHeartUI(): void {
    if (!this.uiScreen) {
      console.warn('[IngameProfilesUI] Cannot initialize heart UI: screen not found');
      return;
    }

    try {
      const topLeftAnchor = this.uiScreen.uiBox_windowTopLeftAnchor;
      if (!topLeftAnchor || !topLeftAnchor.children) {
        console.warn('[IngameProfilesUI] windowTopLeftAnchor not found');
        return;
      }

      this.heartContainer = topLeftAnchor.children.find(
        (child) => child.name === 'heartContainer'
      ) as UiImage;

      if (!this.heartContainer) {
        console.warn('[IngameProfilesUI] heartContainer not found');
        return;
      }

      if (this.heartContainer.children) {
        this.heartClip = this.heartContainer.children.find(
          (child) => child.name === 'heartClip'
        ) as UiBox;
        this.heartBg = this.heartContainer.children.find(
          (child) => child.name === 'heartBg'
        ) as UiImage;
        this.heart = this.heartClip?.children.find(
          (child) => child.name === 'heart'
        ) as UiImage; 
      }

      if (!this.heartClip || !this.heartBg) {
        console.warn('[IngameProfilesUI] Heart elements not complete:', {
          heartClip: !!this.heartClip,
          heartBg: !!this.heartBg,
        });
        return;
      }

      console.log('[IngameProfilesUI] Heart UI initialized successfully');
      
      // 初始化心形容器的可见性（默认根据场景模式隐藏）
      this.updateHeartContainerVisibility();
    } catch (error) {
      console.error('[IngameProfilesUI] Failed to initialize heart UI:', error);
    }
  }

  /**
   * 将场景模式应用到指定 profile
   * @param slotIndex profile 索引
   */
  private applySceneModeToProfile(slotIndex: number): void {
    const profile = this.profiles[slotIndex];
    if (!profile) {
      return;
    }

    if (this.sceneMode === 'readiness') {
      // Readiness 模式：显示 avatar，隐藏 healthBar 和 status 元素
      if (profile.avatar) {
        profile.avatar.visible = true;
      }
      if (profile.healthBarClip) {
        profile.healthBarClip.visible = false;
      }
      if (profile.healthBar) {
        profile.healthBar.visible = false;
      }
      if (profile.statusCircle) {
        profile.statusCircle.visible = false;
      }
      if (profile.statusFigure) {
        profile.statusFigure.visible = false;
      }
    } else {
      // Ingame 模式：隐藏 avatar，显示 healthBar 和 statusFigure
      if (profile.avatar) {
        profile.avatar.visible = false;
      }
      if (profile.healthBarClip) {
        profile.healthBarClip.visible = true;
      }
      if (profile.healthBar) {
        profile.healthBar.visible = true;
      }
      // Ingame 模式下初始隐藏 statusCircle（低血量时会动态显示）
      if (profile.statusCircle) {
        profile.statusCircle.visible = false;
      }
      // Ingame 模式下 statusFigure 应该显示（用于显示状态效果图标）
      if (profile.statusFigure) {
        profile.statusFigure.visible = true;
        console.log(
          `[IngameProfilesUI] Profile ${slotIndex} statusFigure set to visible (ingame mode in applySceneModeToProfile)`
        );
      }
      
      // 去掉名字前面的对号（"✓ "）
      this.removeReadyPrefixForProfile(slotIndex);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 设置语言切换监听器（只设置一次）
    if (!this.languageListenerSetup) {
      i18n.on('languageChanged', (lng: string) => {
        console.log(
          `[IngameProfilesUI] Language changed to ${lng}, updating all profiles`
        );
        this.updateAllProfilesText();
      });
      this.languageListenerSetup = true;
      console.log('[IngameProfilesUI] Language listener setup complete');
    }

    // 设置场景模式监听器（只设置一次）
    if (!this.sceneModeListenerSetup) {
      const eventBus = EventBus.instance;
      eventBus.on<{ sceneMode: 'readiness' | 'ingame' }>(
        'server:scenemode:changed',
        (data) => {
          if (data?.sceneMode) {
            console.log(
              `[IngameProfilesUI] Received scene mode from server: ${data.sceneMode}`
            );
            this.setSceneMode(data.sceneMode);
          }
        }
      );

      // 监听玩家死亡事件
      eventBus.on<{ userId: string; countdown: number }>(
        'player:death',
        (data) => {
          if (data?.userId) {
            console.log(
              `[IngameProfilesUI] Player ${data.userId} died (倒地状态)`
            );
            this.updatePlayerDeathStatus(data.userId, true);
          }
        }
      );

      // 监听玩家复活事件
      eventBus.on<{ userId: string }>(
        'player:revived',
        (data) => {
          if (data?.userId) {
            console.log(
              `[IngameProfilesUI] Player ${data.userId} revived (复活)`
            );
            this.updatePlayerDeathStatus(data.userId, false);
          }
        }
      );

      // 监听玩家彻底死亡事件
      eventBus.on<{ userId: string }>(
        'player:permanent_death',
        (data) => {
          if (data?.userId) {
            console.log(
              `[IngameProfilesUI] Player ${data.userId} permanently dead (彻底死亡)`
            );
            this.updatePlayerPermanentDeathStatus(data.userId);
          }
        }
      );

      // 监听心跳区间变化事件
      eventBus.on<{ zone: number }>(
        'heartbeat:zone:changed',
        (data) => {
          if (data && typeof data.zone === 'number') {
            console.log(
              `[IngameProfilesUI] 💓 Heartbeat zone changed: ${this.heartbeatZone} -> ${data.zone}`
            );
            this.setHeartbeatZone(data.zone);
          }
        }
      );

      this.sceneModeListenerSetup = true;
      console.log('[IngameProfilesUI] Scene mode listener setup complete');
    }

    console.log('[IngameProfilesUI] Event listeners setup complete');
  }

  /**
   * 更新所有profile的文本（用于语言切换）
   */
  private updateAllProfilesText(): void {
    this.cachedPlayerData.forEach((data, index) => {
      const profile = this.profiles[index];
      if (!profile) {
        return;
      }

      // 获取角色信息
      const character = CharacterRegistry.getById(data.characterId);
      if (!character) {
        return;
      }

      const isUnlocked = this.unlockedCharacters.has(data.characterId);

      // 使用 i18next 获取角色翻译文本
      const characterName = i18n.t(
        `character:${character.id}.name`,
        character.id
      );
      const characterNickname = i18n.t(
        `character:${character.id}.nickname`,
        ''
      );

      // 更新角色名称
      if (profile.characterName) {
        const displayName = isUnlocked && character ? characterName : '???';
        profile.characterName.textContent = displayName;
      }

      // 更新角色昵称
      if (profile.characterNickname && character) {
        const displayNickname = characterNickname || characterName;
        profile.characterNickname.textContent = displayNickname;
      }
    });

    console.log('[IngameProfilesUI] All profiles text updated');
  }

  /**
   * 设置当前玩家的 slot index（用于 Readiness 场景角色切换）
   * @param slotIndex slot 索引
   */
  public setCurrentPlayerSlot(slotIndex: number): void {
    this.currentPlayerSlot = slotIndex;
    console.log(`[IngameProfilesUI] Current player slot set to ${slotIndex}`);
  }

  /**
   * 通过 userId 设置当前玩家的 slot
   * @param userId 用户 ID
   */
  public setCurrentPlayerByUserId(userId: string): void {
    console.log(
      `[IngameProfilesUI] Setting current player by userId: ${userId}`
    );
    console.log(
      `[IngameProfilesUI] Current userIdToSlot mapping:`,
      Array.from(this.userIdToSlot.entries())
    );

    const slotIndex = this.userIdToSlot.get(userId);
    if (slotIndex !== undefined) {
      console.log(
        `[IngameProfilesUI] Found slot ${slotIndex} for userId ${userId}, setting as current player`
      );
      this.setCurrentPlayerSlot(slotIndex);
    } else {
      console.warn(
        `[IngameProfilesUI] ⚠️ UserId ${userId} not found in mapping - cannot set current player slot`
      );
    }
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

    // 缓存玩家数据，用于语言切换时重新绑定
    this.cachedPlayerData.set(slotIndex, data);

    // 维护 userId 到 slotIndex 的映射
    this.userIdToSlot.set(data.userId, slotIndex);

    console.log(`[IngameProfilesUI] Updating profile at slot ${slotIndex}:`, {
      userId: data.userId,
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

    // 使用 i18next 获取角色翻译文本
    const characterName = character
      ? i18n.t(`character:${character.id}.name`, character.id)
      : '';
    const characterNickname = character
      ? i18n.t(`character:${character.id}.nickname`, '')
      : '';

    console.log(`[IngameProfilesUI] Character info:`, {
      characterId: data.characterId,
      found: !!character,
      isUnlocked,
      characterName,
      characterNickname,
    });

    // 缓存原始 UiText 元素（首次更新时）
    if (!this.originalTextElements.has(slotIndex)) {
      this.originalTextElements.set(slotIndex, {
        characterName: profile.characterName,
        characterNickname: profile.characterNickname,
      });
      console.log(
        `[IngameProfilesUI] Cached original text elements for slot ${slotIndex}`
      );
    }

    // 更新角色名称（未解锁显示"???"）
    if (profile.characterName) {
      const displayName = isUnlocked && character ? characterName : '???';
      profile.characterName.textContent = displayName;
      console.log(`[IngameProfilesUI] Set characterName to: ${displayName}`);
    } else {
      console.warn(`[IngameProfilesUI] characterName element not found`);
    }

    // 更新角色昵称（默认显示，不受解锁限制）
    if (profile.characterNickname) {
      if (character) {
        const displayNickname = characterNickname || characterName;
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

    // 如果玩家已准备，更新颜色为绿色
    if (data.isReady) {
      this.updateReadyState(slotIndex, true);
    }

    // 更新头像
    if (profile.avatar) {
      // 如果在 Readiness 模式，使用玩家真实头像
      if (this.sceneMode === 'readiness' && data.avatar) {
        profile.avatar.image = data.avatar;
        console.log(
          `[IngameProfilesUI] Set player avatar (Readiness mode): ${data.avatar}`
        );
      } else if (character && isUnlocked) {
        // 其他情况使用角色 portrait
        profile.avatar.image = character.portrait;
        console.log(
          `[IngameProfilesUI] Set character portrait: ${character.portrait}`
        );
      } else {
        profile.avatar.image = 'assets/ui/avatar_unknown.png';
      }
    }

    // 更新血量条
    this.updateHealthBar(profile, data.currentHP, data.maxHP);

    // 如果是当前玩家，更新 Heart 显示和容器可见性
    if (slotIndex === this.currentPlayerSlot) {
      this.updateHeartDisplay(data.currentHP, data.maxHP);
      this.updateHeartContainerVisibility(); // 更新心形容器显示状态（检查 Overseer）
    }

    // 更新携带物品
    if (profile.carryingItem) {
      if (data.carryingItem) {
        profile.carryingItem.visible = true;
        profile.carryingItem.image = data.carryingItem;
      } else {
        profile.carryingItem.visible = false;
      }
    }

    // 显示profile
    profile.container.visible = true;

    // 先应用场景模式（设置基本的显示状态：healthBar/avatar等）
    this.applySceneModeToProfile(slotIndex);

    // 在 ingame 模式下，statusFigure 应该始终显示
    if (this.sceneMode === 'ingame' && profile.statusFigure) {
      profile.statusFigure.visible = true;
      console.log(
        `[IngameProfilesUI] Profile ${slotIndex} statusFigure set to visible (ingame mode)`
      );
      
      // 如果有状态效果，记录日志（未来可以根据状态类型显示不同图标）
      if (data.statusEffects && data.statusEffects.length > 0) {
        console.log(
          `[IngameProfilesUI] Profile ${slotIndex} has ${data.statusEffects.length} status effect(s)`
        );
        // TODO: 根据状态效果类型显示对应图标
      }
    } else if (profile.statusFigure) {
      profile.statusFigure.visible = false;
    }

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
   * 更新 Heart 显示（当前玩家的血量）
   * @param currentHP 当前血量
   * @param maxHP 最大血量
   */
  private updateHeartDisplay(currentHP: number, maxHP: number): void {
    if (!this.heartClip || !this.heartContainer) {
      return;
    }

    const hpPercent = Math.max(0, Math.min(1, currentHP / maxHP));
    
    // 计算 Y scale（百分比），让 heart 从底部开始填充
    // 当血量减少时，scale.y 减少，offset.y 需要向下移动（增加）
    const heightScale = hpPercent;
    const yOffsetScale = 1 - hpPercent;
    
    // 修改 heartClip 的 size.scale.y 来控制高度
    if (this.heartClip.size.scale) {
      this.heartClip.size.scale.y = heightScale;
    }
    
    // 修改 heartClip 的 position.scale.y 来控制 Y 偏移
    if (this.heartClip.position.scale) {
      this.heartClip.position.scale.y = yOffsetScale;
    }

    console.log(
      `[IngameProfilesUI] Updated heart display: ${currentHP}/${maxHP} (${(hpPercent * 100).toFixed(1)}%), heightScale: ${heightScale}, yOffsetScale: ${yOffsetScale}`
    );
  }

  /**
   * 更新心形容器的显示状态
   * 规则：
   * 1. lobby 和 readiness 场景隐藏
   * 2. ingame 场景显示，但如果当前玩家是 Overseer 则隐藏
   */
  private updateHeartContainerVisibility(): void {
    if (!this.heartContainer) {
      console.warn('[IngameProfilesUI] Heart container not found');
      return;
    }

    console.log(`[IngameProfilesUI] 🩺 Updating heart container visibility - Scene: ${this.sceneMode}, Current slot: ${this.currentPlayerSlot}`);

    // readiness 场景隐藏心形容器
    if (this.sceneMode === 'readiness') {
      this.heartContainer.visible = false;
      console.log('[IngameProfilesUI] ❌ Heart container hidden (readiness mode)');
      return;
    }

    // ingame 场景：检查当前玩家角色
    if (this.sceneMode === 'ingame') {
      // 获取当前玩家的角色信息
      const currentPlayerData = this.cachedPlayerData.get(this.currentPlayerSlot);
      
      if (!currentPlayerData) {
        // 还没有当前玩家数据，先隐藏
        this.heartContainer.visible = false;
        console.log(
          '[IngameProfilesUI] ❌ Heart container hidden (no current player data yet)'
        );
        return;
      }

      console.log(`[IngameProfilesUI]   Current player: userId=${currentPlayerData.userId}, characterId=${currentPlayerData.characterId}`);

      // 获取角色信息
      const character = CharacterRegistry.getById(currentPlayerData.characterId);
      
      if (!character) {
        // 角色信息未找到，隐藏
        this.heartContainer.visible = false;
        console.log(
          `[IngameProfilesUI] ❌ Heart container hidden (character ${currentPlayerData.characterId} not found in registry)`
        );
        return;
      }

      console.log(`[IngameProfilesUI]   Character: ${character.name} (${character.faction})`);

      // 检查是否为 Overseer
      if (character.faction === 'Overseer') {
        this.heartContainer.visible = false;
        console.log(
          `[IngameProfilesUI] ❌ Heart container hidden (current player is Overseer: ${character.name})`
        );
      } else {
        this.heartContainer.visible = true;
        console.log(
          `[IngameProfilesUI] ✅ Heart container VISIBLE (current player is Survivor: ${character.name})`
        );
        console.log(
          `[IngameProfilesUI] Heart container state: visible=${this.heartContainer.visible}, heartClip visible=${this.heartClip?.visible}, heartBg visible=${this.heartBg?.visible}`
        );
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

  /**
   * 更新玩家准备状态（通过修改文本内容添加前缀来标识）
   * @param slotIndex profile 槽位索引
   * @param isReady 是否准备
   */
  public updateReadyState(slotIndex: number, isReady: boolean): void {
    if (slotIndex < 0 || slotIndex >= this.profiles.length) {
      console.warn(`[IngameProfilesUI] Invalid slotIndex: ${slotIndex}`);
      return;
    }

    const profile = this.profiles[slotIndex];
    if (!profile) {
      console.warn(`[IngameProfilesUI] Profile not found at slot ${slotIndex}`);
      return;
    }

    // 获取原始元素缓存
    const originalElements = this.originalTextElements.get(slotIndex);
    if (!originalElements) {
      console.warn(
        `[IngameProfilesUI] Original elements not found for slot ${slotIndex}`
      );
      return;
    }

    const readyPrefix = '✓ '; // 准备标记

    if (isReady) {
      // 确认准备：添加绿色勾选标记前缀
      if (profile.characterName && originalElements.characterName) {
        const originalText = originalElements.characterName.textContent || '';
        // 只在没有前缀时添加
        if (!originalText.startsWith(readyPrefix)) {
          profile.characterName.textContent = readyPrefix + originalText;
        }
      }
      if (profile.characterNickname && originalElements.characterNickname) {
        const originalText =
          originalElements.characterNickname.textContent || '';
        if (!originalText.startsWith(readyPrefix)) {
          profile.characterNickname.textContent = readyPrefix + originalText;
        }
      }
      console.log(
        `[IngameProfilesUI] Set ready indicator for slot ${slotIndex}`
      );
    } else {
      // 取消准备：移除前缀，恢复原始文本
      if (profile.characterName && originalElements.characterName) {
        const originalText = originalElements.characterName.textContent || '';
        profile.characterName.textContent = originalText.replace(
          readyPrefix,
          ''
        );
      }
      if (profile.characterNickname && originalElements.characterNickname) {
        const originalText =
          originalElements.characterNickname.textContent || '';
        profile.characterNickname.textContent = originalText.replace(
          readyPrefix,
          ''
        );
      }
      console.log(
        `[IngameProfilesUI] Removed ready indicator for slot ${slotIndex}`
      );
    }
  }

  /**
   * 移除单个 profile 的准备标记前缀（用于进入 ingame 时）
   * @param slotIndex profile 槽位索引
   */
  private removeReadyPrefixForProfile(slotIndex: number): void {
    const profile = this.profiles[slotIndex];
    if (!profile) {
      return;
    }

    const readyPrefix = '✓ ';

    // 移除 characterName 的前缀
    if (profile.characterName) {
      const currentText = profile.characterName.textContent || '';
      if (currentText.startsWith(readyPrefix)) {
        profile.characterName.textContent = currentText.replace(readyPrefix, '');
      }
    }

    // 移除 characterNickname 的前缀
    if (profile.characterNickname) {
      const currentText = profile.characterNickname.textContent || '';
      if (currentText.startsWith(readyPrefix)) {
        profile.characterNickname.textContent = currentText.replace(readyPrefix, '');
      }
    }
  }

  /**
   * 更新玩家血条（HP变化时）
   * @param userId 玩家ID
   * @param currentHP 当前血量
   * @param maxHP 最大血量
   */
  public updatePlayerHP(userId: string, currentHP: number, maxHP: number): void {
    // 通过 userId 找到对应的 slot
    const slotIndex = this.userIdToSlot.get(userId);
    if (slotIndex === undefined) {
      console.warn(`[IngameProfilesUI] Cannot find slot for userId: ${userId}`);
      return;
    }

    const profile = this.profiles[slotIndex];
    if (!profile || !profile.healthBarClip || !profile.healthBar) {
      console.warn(`[IngameProfilesUI] Health bar elements not found for slot ${slotIndex}`);
      return;
    }

    // 计算血量百分比
    const hpPercent = Math.max(0, Math.min(1, currentHP / maxHP));

    // 更新顶部血条（竖向剪切，和心形UI使用相同逻辑）
    const barHeight = profile.healthBar.size.offset.y;
    const targetHeight = barHeight * hpPercent;
    
    // 计算 Y 偏移（让血条从底部开始填充）
    const yOffset = barHeight - targetHeight;
    
    const newClipSize = Vec2.create({ x: profile.healthBarClip.size.offset.x, y: targetHeight });
    profile.healthBarClip.size.offset.copy(newClipSize);
    
    // 调整 healthBarClip 的 Y 位置，让它从底部开始剪切
    const newClipPosition = Vec2.create({ x: profile.healthBarClip.position.offset.x, y: yOffset });
    profile.healthBarClip.position.offset.copy(newClipPosition);

    console.log(
      `[IngameProfilesUI] Updated HP for slot ${slotIndex} (${userId}): ${currentHP}/${maxHP} (${(hpPercent * 100).toFixed(1)}%) - Height: ${targetHeight.toFixed(2)}, Offset: ${yOffset.toFixed(2)}`
    );

    // 如果这是当前玩家，同时更新心形容器
    if (slotIndex === this.currentPlayerSlot) {
      this.updateHeartDisplay(currentHP, maxHP);
    }
  }

  /**
   * 更新玩家携带物品图片
   * @param userId 玩家ID
   * @param itemImageUrl 物品图片URL（如果为空则隐藏）
   */
  public updatePlayerCarryingItem(userId: string, itemImageUrl: string | null): void {
    // 通过 userId 找到对应的 slot
    const slotIndex = this.userIdToSlot.get(userId);
    if (slotIndex === undefined) {
      console.warn(`[IngameProfilesUI] Cannot find slot for userId: ${userId}`);
      return;
    }

    const profile = this.profiles[slotIndex];
    if (!profile || !profile.carryingItem) {
      console.warn(`[IngameProfilesUI] Carrying item element not found for slot ${slotIndex}`);
      return;
    }

    if (itemImageUrl) {
      profile.carryingItem.visible = true;
      profile.carryingItem.image = itemImageUrl;
      console.log(
        `[IngameProfilesUI] Updated carrying item for slot ${slotIndex} (${userId}): ${itemImageUrl}`
      );
    } else {
      profile.carryingItem.visible = false;
      console.log(
        `[IngameProfilesUI] Cleared carrying item for slot ${slotIndex} (${userId})`
      );
    }
  }

  /**
   * 更新玩家死亡状态（倒地/复活）
   * @param userId 玩家ID
   * @param isDead 是否倒地
   */
  public updatePlayerDeathStatus(userId: string, isDead: boolean): void {
    // 通过 userId 找到对应的 slot
    const slotIndex = this.userIdToSlot.get(userId);
    if (slotIndex === undefined) {
      console.warn(`[IngameProfilesUI] Cannot find slot for userId: ${userId}`);
      return;
    }

    const profile = this.profiles[slotIndex];
    if (!profile || !profile.statusFigure) {
      console.warn(`[IngameProfilesUI] statusFigure not found for slot ${slotIndex}`);
      return;
    }

    // 更新 statusFigure 图片
    if (isDead) {
      profile.statusFigure.image = 'picture/profileStatusLying.png';
      console.log(
        `[IngameProfilesUI] Player ${userId} (slot ${slotIndex}) statusFigure changed to Lying (倒地)`
      );
    } else {
      profile.statusFigure.image = 'picture/profileStatusNormal.png';
      console.log(
        `[IngameProfilesUI] Player ${userId} (slot ${slotIndex}) statusFigure changed to Normal (正常)`
      );
    }
  }

  /**
   * 更新玩家彻底死亡状态（变成观察者）
   * @param userId 玩家ID
   */
  public updatePlayerPermanentDeathStatus(userId: string): void {
    // 通过 userId 找到对应的 slot
    const slotIndex = this.userIdToSlot.get(userId);
    if (slotIndex === undefined) {
      console.warn(`[IngameProfilesUI] Cannot find slot for userId: ${userId}`);
      return;
    }

    const profile = this.profiles[slotIndex];
    if (!profile || !profile.statusFigure) {
      console.warn(`[IngameProfilesUI] statusFigure not found for slot ${slotIndex}`);
      return;
    }

    // 更新 statusFigure 图片为彻底死亡状态
    profile.statusFigure.image = 'picture/profileStatusDead.png';
    console.log(
      `[IngameProfilesUI] Player ${userId} (slot ${slotIndex}) statusFigure changed to Dead (彻底死亡)`
    );
  }

  /**
   * 设置心跳区间
   * @param zone 0 = 无心跳, 1 = 慢速, 2 = 中速, 3 = 快速
   */
  private setHeartbeatZone(zone: number): void {
    if (this.heartbeatZone === zone) {
      return; // 区间未变化，无需更新
    }

    this.heartbeatZone = zone;

    if (zone === 0) {
      // 停止心跳动画
      this.stopHeartbeatAnimation();
    } else {
      // 开始或更新心跳动画
      this.startHeartbeatAnimation();
    }
  }

  /**
   * 开始心跳动画
   */
  private startHeartbeatAnimation(): void {
    if (!this.heartContainer) {
      return;
    }

    // 如果已有动画在运行，先停止
    this.stopHeartbeatAnimation();

    // 计算心跳周期（毫秒）
    let heartbeatPeriod: number;
    switch (this.heartbeatZone) {
      case 1: // 慢速心跳 (< 96)
        heartbeatPeriod = 1200;
        break;
      case 2: // 中速心跳 (< 64)
        heartbeatPeriod = 800;
        break;
      case 3: // 快速心跳 (< 32)
        heartbeatPeriod = 500;
        break;
      default:
        heartbeatPeriod = 1200;
    }

    // 使用 Animation.startHeartbeat 启动心跳动画
    this.heartbeatStopFn = Animation.startHeartbeat(
      this.heart,
      heartbeatPeriod,
      0.15 // 15% 缩放幅度
    );

    console.log(
      `[IngameProfilesUI] ❤️ Started heartbeat animation (zone ${this.heartbeatZone}, period ${heartbeatPeriod}ms)`
    );
  }

  /**
   * 停止心跳动画
   */
  private stopHeartbeatAnimation(): void {
    if (this.heartbeatStopFn) {
      this.heartbeatStopFn();
      this.heartbeatStopFn = null;
      console.log('[IngameProfilesUI] 🛑 Stopped heartbeat animation');
    }
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    // 停止心跳动画
    this.stopHeartbeatAnimation();

    this.clearAllProfiles();
    this.unlockedCharacters.clear();
    this.profiles = [];
    this.cachedPlayerData.clear();
    this.userIdToSlot.clear();
    this.originalTextElements.clear();
    this.currentPlayerSlot = -1;
    this.languageListenerSetup = false;
    this.profileContainers = [];
    this.uiScreen = null;
  }
}
