/**
 * MatchPool UI - 匹配池界面
 */

import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';
import { UiI18nSwitcher } from '../UiI18nSwitcher';
import i18n from '../../../../i18n/index';

export type UiScreenInstance = UiIndex_screen;

/**
 * 玩家头像数据
 */
interface PlayerProfile {
  userId: string;
  name: string;
  avatar: string; // 玩家头像 URL
  clonedContainer: UiImage; // 克隆的容器元素（profileTemplate的克隆）
  imageElement: UiImage; // 头像 UI元素
  nameElement: UiText; // 名字 UI元素
}

export class MatchPoolUI {
  private uiScreen: UiScreenInstance | null = null;
  private isVisible: boolean = false;
  private currentPoolId: string | null = null;
  private i18nSwitcher: UiI18nSwitcher;

  // 存储当前显示的玩家头像（key: userId, value: PlayerProfile）
  private playerProfiles: Map<string, PlayerProfile> = new Map();

  // 当前匹配池的最大玩家数
  private maxPlayers: number = 0;

  constructor() {
    this.i18nSwitcher = new UiI18nSwitcher();
  }

  /**
   * 初始化MatchPool UI
   */
  async initialize(uiScreen: UiScreenInstance): Promise<void> {
    console.log('[MatchPoolUI] Initializing...');

    this.uiScreen = uiScreen;

    // 检查必需的UI元素是否存在
    const matchPoolContainerTop = this.getMatchPoolContainerTop();
    const matchPoolContainerDown = this.getMatchPoolContainerDown();
    const profileLayout = this.getProfileLayout();
    const cancelButton = this.getCancelButton();
    const profileTemplate = this.getProfileTemplate();
    const profileImage = this.getProfileImage();
    const playerName = this.getPlayerName();
    const playerCountText = this.getPlayerCountText();

    if (!matchPoolContainerTop) {
      console.error('[MatchPoolUI] matchPoolContainerTop not found!');
    }
    if (!matchPoolContainerDown) {
      console.error('[MatchPoolUI] matchPoolContainerDown not found!');
    }
    if (!profileLayout) {
      console.error('[MatchPoolUI] profileLayout not found!');
    }
    if (!profileTemplate) {
      console.error('[MatchPoolUI] profileTemplate not found!');
    }
    if (!profileImage) {
      console.error('[MatchPoolUI] profileImage not found!');
    }
    if (!playerName) {
      console.error('[MatchPoolUI] playerName not found!');
    }
    if (!playerCountText) {
      console.error('[MatchPoolUI] playerCountText not found!');
    }
    if (!cancelButton) {
      console.error('[MatchPoolUI] cancelButton not found!');
    }

    // 初始隐藏匹配池容器
    this.hide();

    // 应用i18n语言切换到匹配池容器
    this.applyI18nSwitch();

    console.log('[MatchPoolUI] Initialized successfully');
  }

  /**
   * 显示匹配池UI
   */
  show(): void {
    if (this.isVisible) {
      return;
    }

    console.log('[MatchPoolUI] Showing match pool UI');

    const matchPoolContainerTop = this.getMatchPoolContainerTop();
    const matchPoolContainerDown = this.getMatchPoolContainerDown();

    if (matchPoolContainerTop) {
      matchPoolContainerTop.visible = true;
    }
    if (matchPoolContainerDown) {
      matchPoolContainerDown.visible = true;
    }

    // 显示时确保应用正确的语言
    this.applyI18nSwitch();

    this.isVisible = true;
  }

  /**
   * 隐藏匹配池UI
   */
  hide(): void {
    console.log('[MatchPoolUI] Hiding match pool UI');

    const matchPoolContainerTop = this.getMatchPoolContainerTop();
    const matchPoolContainerDown = this.getMatchPoolContainerDown();

    if (matchPoolContainerTop) {
      matchPoolContainerTop.visible = false;
    }
    if (matchPoolContainerDown) {
      matchPoolContainerDown.visible = false;
    }

    // 清空所有头像（如果有的话）
    if (this.playerProfiles.size > 0) {
      this.clearAllProfiles();
    }

    this.isVisible = false;
    this.currentPoolId = null;
  }

  /**
   * 更新匹配池状态
   */
  updatePool(data: {
    poolId: string;
    players: Array<{ userId: string; name: string; avatar: string }>;
    maxPlayers: number;
    countdownSeconds: number;
    isStarting: boolean;
  }): void {
    console.log('[MatchPoolUI] Updating pool:', data);

    this.currentPoolId = data.poolId;
    this.maxPlayers = data.maxPlayers;
    this.show();

    // 更新玩家头像列表
    this.updatePlayerProfiles(data.players);

    // 更新人数比显示
    this.updatePlayerCountText(`${data.players.length} / ${data.maxPlayers}`);

    // 如果正在倒计时
    if (data.isStarting && data.countdownSeconds > 0) {
      const seconds = Math.floor(data.countdownSeconds / 1000);
       
      this.updatePlayerCountText(
        `${seconds}s ${i18n.t('matchpool.countdown' as any)}`
      );
    }
  }

  /**
   * 更新玩家头像列表
   */
  private updatePlayerProfiles(
    players: Array<{ userId: string; name: string; avatar: string }>
  ): void {
    const profileLayout = this.getProfileLayout();
    if (!profileLayout) {
      console.error('[MatchPoolUI] profileLayout not found');
      return;
    }

    // 移除不在新列表中的玩家
    const currentUserIds = new Set(players.map((p) => p.userId));
    const toRemove: string[] = [];

    this.playerProfiles.forEach((profile, userId) => {
      if (!currentUserIds.has(userId)) {
        toRemove.push(userId);
      }
    });

    toRemove.forEach((userId) => {
      this.removePlayerProfile(userId);
    });

    // 添加或更新玩家
    players.forEach((player) => {
      if (!this.playerProfiles.has(player.userId)) {
        this.addPlayerProfile(player.userId, player.name, player.avatar);
      } else {
        // 更新已存在的玩家信息
        this.updatePlayerProfile(player.userId, player.name, player.avatar);
      }
    });

    console.log(
      `[MatchPoolUI] Player profiles updated: ${this.playerProfiles.size} players`
    );
  }

  /**
   * 添加玩家头像
   * 克隆profileTemplate并更新其子元素（avatar 和 name）
   */
  private addPlayerProfile(userId: string, name: string, avatar: string): void {
    const profileTemplate = this.getProfileTemplate();
    const profileLayout = this.getProfileLayout();

    console.log(
      `[MatchPoolUI] addPlayerProfile called - userId: ${userId}, name: ${name}, avatar: ${avatar}`
    );

    if (!profileTemplate) {
      console.error('[MatchPoolUI] Cannot add profile: template not found');
      return;
    }

    if (!profileLayout) {
      console.error(
        '[MatchPoolUI] Cannot add profile: profileLayout not found'
      );
      return;
    }

    // 克隆profileTemplate（包括其子节点）
    const clonedContainer = profileTemplate.clone();
    // 克隆后设置invisible
    profileTemplate.visible = false;
    console.log(`[MatchPoolUI] profileTemplate invisible set to false`);
    console.log(`[MatchPoolUI] Cloned profileTemplate for user ${userId}`);

    // 设置克隆元素的父节点为profileLayout
    clonedContainer.parent = profileLayout as UiBox;
    console.log(
      `[MatchPoolUI] Set parent of cloned container to profileLayout`
    );

    // 显示克隆的容器
    clonedContainer.visible = true;

    // 从克隆的容器中查找子元素（avatar 和 name）
    let profileImage: UiImage | undefined;
    let playerName: UiText | undefined;

    if (clonedContainer.children) {
      for (const child of clonedContainer.children) {
        console.log(`[MatchPoolUI] Cloned child: name=${child.name}`);

        // 子元素名字是 'avatar' 和 'name'
        if (child.name === 'avatar') {
          profileImage = child as UiImage;
          console.log(`[MatchPoolUI] Found avatar in cloned container`);
        }
        if (child.name === 'name') {
          playerName = child as UiText;
          console.log(`[MatchPoolUI] Found name in cloned container`);
        }
      }
    }

    // 确保找到了必要的子元素
    if (!profileImage || !playerName) {
      console.error(
        `[MatchPoolUI] Cannot add profile: missing child elements for user ${userId}`
      );
      // 移除已创建的克隆容器
      clonedContainer.parent = null as unknown as UiNode;
      return;
    }

    // 更新头像（已确保profileImage不为undefined）
    profileImage.visible = true;
    profileImage.image = avatar; // 设置头像 URL
    console.log(`[MatchPoolUI] Set avatar image: ${avatar}`);

    // 更新名字（已确保playerName不为undefined）
    playerName.visible = true;
    playerName.textContent = name;
    console.log(`[MatchPoolUI] Set player name: ${name}`);

    // 保存玩家信息到管理表
    this.playerProfiles.set(userId, {
      userId,
      name,
      avatar,
      clonedContainer,
      imageElement: profileImage,
      nameElement: playerName,
    });

    console.log(
      `[MatchPoolUI] Player profile added: ${userId}, total: ${this.playerProfiles.size}`
    );
  }

  /**
   * 更新玩家信息
   */
  private updatePlayerProfile(
    userId: string,
    name: string,
    avatar: string
  ): void {
    const profile = this.playerProfiles.get(userId);
    if (!profile) {
      return;
    }

    // 更新头像
    if (profile.imageElement && profile.avatar !== avatar) {
      profile.imageElement.image = avatar;
      profile.avatar = avatar;
      console.log(`[MatchPoolUI] Updated avatar for user ${userId}`);
    }

    // 更新名字
    if (profile.nameElement && profile.name !== name) {
      profile.nameElement.textContent = name;
      profile.name = name;
      console.log(`[MatchPoolUI] Updated name for user ${userId}: ${name}`);
    }
  }

  /**
   * 移除玩家头像
   */
  private removePlayerProfile(userId: string): void {
    const profile = this.playerProfiles.get(userId);
    if (!profile) {
      return;
    }

    console.log(`[MatchPoolUI] Removing player profile: ${userId}`);

    // 将克隆的容器从父节点中移除（设置parent为null）
    if (profile.clonedContainer) {
      profile.clonedContainer.parent = null as unknown as UiNode;
      console.log(
        `[MatchPoolUI] Removed cloned container from parent for user ${userId}`
      );
    }

    // 从管理表中移除
    this.playerProfiles.delete(userId);

    console.log(
      `[MatchPoolUI] Player profile removed: ${userId}, remaining: ${this.playerProfiles.size}`
    );
  }

  /**
   * 清空所有头像
   */
  private clearAllProfiles(): void {
    console.log(
      `[MatchPoolUI] Clearing all player profiles, count: ${this.playerProfiles.size}`
    );

    // 移除所有克隆的容器
    this.playerProfiles.forEach((profile, userId) => {
      if (profile.clonedContainer) {
        profile.clonedContainer.parent = null as unknown as UiNode;
        console.log(
          `[MatchPoolUI] Removed cloned container for user ${userId}`
        );
      }
    });

    // 清空管理表
    this.playerProfiles.clear();

    // 清空人数比显示
    this.updatePlayerCountText(`0 / ${this.maxPlayers}`);

    console.log('[MatchPoolUI] Cleared all player profiles');
  }

  /**
   * 获取顶部匹配池容器
   */
  private getMatchPoolContainerTop(): UiBox | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiBox_windowTopAnchor_matchPoolContainer || null;
  }

  /**
   * 获取底部匹配池容器
   */
  private getMatchPoolContainerDown(): UiBox | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiBox_matchPoolContainer || null;
  }

  /**
   * 获取玩家头像布局容器
   */
  getProfileLayout(): UiBox | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiBox_profileLayout || null;
  }

  /**
   * 获取头像模板容器
   */
  getProfileTemplate(): UiImage | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiImage_profileTemplate1 || null;
  }

  /**
   * 获取玩家头像图片元素
   */
  private getProfileImage(): UiImage | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiImage_avatar || null;
  }

  /**
   * 获取玩家名字文本元素
   */
  private getPlayerName(): UiText | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiText_name || null;
  }

  /**
   * 获取人数比文本元素
   */
  private getPlayerCountText(): UiText | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiText_text_1 || null;
  }

  /**
   * 更新人数比显示
   * @param text 显示文本
   */
  private updatePlayerCountText(text: string): void {
    const playerCountText = this.getPlayerCountText();
    if (!playerCountText) {
      console.warn('[MatchPoolUI] Player count text element not found');
      return;
    }

    // 设置文本
    playerCountText.textContent = text;
    console.log(`[MatchPoolUI] Updated player count: ${text}`);
  }

  /**
   * 获取取消按钮
   */
  getCancelButton(): UiImage | null {
    if (!this.uiScreen) {
      return null;
    }
    return this.uiScreen.uiImage_cancelButton || null;
  }

  /**
   * 获取当前匹配池ID
   */
  getCurrentPoolId(): string | null {
    return this.currentPoolId;
  }

  /**
   * 检查是否在匹配池中
   */
  isInPool(): boolean {
    return this.isVisible && this.currentPoolId !== null;
  }

  /**
   * 应用i18n语言切换
   */
  private applyI18nSwitch(): void {
    const matchPoolContainerTop = this.getMatchPoolContainerTop();
    const matchPoolContainerDown = this.getMatchPoolContainerDown();

    // 对顶部和底部容器分别应用i18n切换
    if (matchPoolContainerTop) {
      this.i18nSwitcher.switchUI(matchPoolContainerTop as UiNode);
      console.log('[MatchPoolUI] Applied i18n switch to top container');
    }
    if (matchPoolContainerDown) {
      this.i18nSwitcher.switchUI(matchPoolContainerDown as UiNode);
      console.log('[MatchPoolUI] Applied i18n switch to down container');
    }
  }

  /**
   * 清理资源
   */
  dispose?(): void {
    this.clearAllProfiles();
    this.uiScreen = null;
    this.isVisible = false;
    this.currentPoolId = null;
    console.log('[MatchPoolUI] Disposed');
  }
}
