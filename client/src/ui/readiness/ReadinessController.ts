/**
 * ReadinessController - 聚合协调：UI <-> Service <-> Gateway
 */

import type { EventBus } from '../../core/events/EventBus';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import type { ReadinessService } from './ReadinessService';
import { CharacterBinder } from './CharacterBinder';
import { ScrollAnimator } from './ScrollAnimator';
import { Animation } from '../Animation';
import type { UiRefs } from './types';
import * as Events from './events';
import type { UiIndex_screen } from '../../../UiIndex/screens/UiIndex_screen';
import { UiManager } from '../../mgr/UiManager';

export type UiScreenInstance = UiIndex_screen;

export class ReadinessController {
  private uiScreen: UiScreenInstance | null = null;
  private service: ReadinessService;
  private animator: ScrollAnimator | null = null;
  private eventBus: EventBus;
  private communicationMgr: CommunicationMgr;
  private uiRefs: UiRefs | null = null;
  private isCharacterViewActive: boolean = false; // 是否已进入角色视角
  private isOverseer: boolean = false; // 当前玩家是否是 Overseer

  constructor(service: ReadinessService, eventBus: EventBus) {
    this.service = service;
    this.eventBus = eventBus;
    this.communicationMgr = CommunicationMgr.instance;
  }

  /**
   * 初始化Controller
   * @param uiRefs UI节点引用
   * @param uiScreen UI屏幕实例（用于访问黑幕等全局UI元素）
   */
  async initialize(
    uiRefs: UiRefs | null,
    uiScreen: UiScreenInstance | null
  ): Promise<void> {
    console.log('[ReadinessController] Initializing...');

    this.uiRefs = uiRefs;
    this.uiScreen = uiScreen;

    if (!this.uiRefs) {
      console.error('[ReadinessController] No UI refs provided');
      return;
    }

    // 初始化动画器（假设有content group容器）
    const contentGroup = this.uiRefs.rootMiddle;
    this.animator = new ScrollAnimator(contentGroup);

    // 绑定初始角色
    this.bindCurrentCharacter();

    // 绑定按钮事件
    this.bindButtons();

    // 订阅网关事件
    this.subscribeGatewayEvents();

    // 订阅内部事件
    this.subscribeInternalEvents();

    // 初始状态：隐藏角色展示UI和preparedCount
    this.hideInitialUI();

    // 查询当前场景并根据场景调整 UI 显示
    this.queryAndAdjustUIByScene();

    console.log('[ReadinessController] Initialized successfully');
  }

  /**
   * 隐藏初始UI（等待用户点击切换角色）
   */
  private hideInitialUI(): void {
    // 隐藏角色展示区域
    if (this.uiRefs?.rootMiddle) {
      this.uiRefs.rootMiddle.visible = false;
    }

    // 隐藏底部相机按钮
    if (this.uiRefs?.rootDown) {
      this.uiRefs.rootDown.visible = false;
    }

    // 隐藏准备数显示
    if (this.uiRefs?.preparedCountBox) {
      this.uiRefs.preparedCountBox.visible = false;
    }

    // 初始状态：隐藏取消按钮，显示确认和切换按钮
    if (this.uiRefs?.cancelConfirmation) {
      this.uiRefs.cancelConfirmation.visible = false;
    }
    if (this.uiRefs?.confirmSelection) {
      this.uiRefs.confirmSelection.visible = true;
    }
    if (this.uiRefs?.switchCharacter) {
      this.uiRefs.switchCharacter.visible = true;
    }

    console.log('[ReadinessController] Initial UI hidden');
  }

  /**
   * 查询当前场景并根据场景调整 UI 显示
   */
  private queryAndAdjustUIByScene(): void {
    const currentScene = UiManager.instance.getCurrentScene();
    console.log(`[ReadinessController] Current scene on init: ${currentScene}`);
    
    if (currentScene) {
      // 如果已经有场景信息，立即调整 UI
      this.handleSceneModeChanged(currentScene);
    } else {
      // 如果没有场景信息，默认隐藏所有 UI，等待 server:scenemode:changed 事件
      console.log('[ReadinessController] No scene info yet, waiting for server event');
      this.hideAllReadinessUI();
    }
  }

  /**
   * 绑定当前角色到UI
   */
  private bindCurrentCharacter(): void {
    if (!this.uiRefs) {
      return;
    }

    const character = this.service.getCurrentCharacter();
    CharacterBinder.bind(character, this.uiRefs);

    // 发送角色切换事件到服务端（服务端会广播给所有玩家）
    if (character) {
      this.communicationMgr.send(Events.GW_CHARACTER_CHANGED, {
        characterId: character.id,
      });

      console.log(
        '[ReadinessController] Character changed, notified server:',
        character.id
      );
    }
  }

  /**
   * 绑定按钮事件
   */
  private bindButtons(): void {
    const refs = this.uiRefs;
    if (!refs) {
      return;
    }

    // 上下切换按钮
    refs.turnUpScrollButton?.events.on('pointerdown', () => {
      this.handleScrollPrev();
    });

    refs.turnDownScrollButton?.events.on('pointerdown', () => {
      this.handleScrollNext();
    });

    // 相机模式按钮
    refs.turnCameraModeButton?.events.on('pointerdown', () => {
      this.handleToggleCameraMode();
    });

    // 确认选择
    refs.confirmSelection?.events.on('pointerdown', () => {
      this.handleConfirmSelection();
    });

    // 取消确认
    refs.cancelConfirmation?.events.on('pointerdown', () => {
      this.handleCancelConfirmation();
    });

    // 切换角色
    refs.switchCharacter?.events.on('pointerdown', () => {
      this.handleSwitchCharacter();
    });

    console.log('[ReadinessController] Buttons bound');
  }

  /**
   * 订阅网关事件（服务端消息通过EventBus分发）
   */
  private subscribeGatewayEvents(): void {
    // 监听玩家阵营信息（S->C）
    this.eventBus.on<{ faction: string; isOverseer: boolean }>(
      'readiness:player:faction',
      (data) => {
        if (data) {
          this.handleFactionInfo(data);
        }
      }
    );

    // 准备快照事件（S->C）
    this.eventBus.on<Events.ReadinessSnapshotPayload>(
      Events.GW_READINESS_SNAPSHOT,
      (data) => {
        if (data) {
          this.handleSnapshot(data);
        }
      }
    );

    // 强制准备开始事件（S->C）
    this.eventBus.on<Events.ForceReadyStartPayload>(
      Events.GW_FORCE_READY_START,
      (data) => {
        if (data) {
          this.handleForceStart(data);
        }
      }
    );

    // 镜头切换完成事件（S->C）
    this.eventBus.on<Events.CameraCompletePayload>(
      'readiness:camera:complete',
      (data) => {
        if (data) {
          this.handleCameraComplete(data);
        }
      }
    );

    // 镜头重置完成事件（S->C）
    this.eventBus.on('readiness:camera:reset:complete', () => {
      this.handleCameraResetComplete();
    });

    // 游戏开始过渡事件（S->C）
    this.eventBus.on<{
      gameStarting: boolean;
      fadeInDuration: number;
      holdDuration: number;
      fadeOutDuration: number;
    }>('readiness:game:start', (data) => {
      if (data) {
        this.handleGameStartTransition(data);
      }
    });

    // 监听场景模式变化事件
    this.eventBus.on<{ sceneMode: string }>('server:scenemode:changed', (data) => {
      if (data?.sceneMode) {
        this.handleSceneModeChanged(data.sceneMode);
      }
    });

    console.log('[ReadinessController] Gateway events subscribed');
  }

  /**
   * 处理场景模式变化
   * @param sceneMode 场景模式
   */
  private handleSceneModeChanged(sceneMode: string): void {
    console.log(`[ReadinessController] Scene mode changed to: ${sceneMode}`);

    if (sceneMode === 'lobby' || sceneMode === 'ingame') {
      // lobby 和 ingame 场景：隐藏所有 Readiness UI
      console.log(`[ReadinessController] Hiding Readiness UI (${sceneMode} scene)`);
      this.hideAllReadinessUI();
    } else if (sceneMode === 'readiness') {
      // readiness 场景：显示按钮，但角色预览保持隐藏直到用户点击
      console.log(`[ReadinessController] Showing Readiness buttons (${sceneMode} scene)`);
      this.showReadinessButtons();
    }
  }

  /**
   * 隐藏所有 Readiness UI 元素
   */
  private hideAllReadinessUI(): void {
    if (this.uiRefs?.rootMiddle) {
      this.uiRefs.rootMiddle.visible = false;
    }
    if (this.uiRefs?.rootDown) {
      this.uiRefs.rootDown.visible = false;
    }
    if (this.uiRefs?.rootDownRight) {
      this.uiRefs.rootDownRight.visible = false;
    }
  }

  /**
   * 显示 Readiness 按钮（在 readiness 场景中）
   */
  private showReadinessButtons(): void {
    // 显示右下角的按钮区域
    if (this.uiRefs?.rootDownRight) {
      this.uiRefs.rootDownRight.visible = true;
      console.log('[ReadinessController] Showed rootDownRight (buttons)');
    }
    
    // 角色预览区域保持隐藏，等待用户点击切换角色按钮
    if (this.uiRefs?.rootMiddle) {
      this.uiRefs.rootMiddle.visible = false;
    }
    if (this.uiRefs?.rootDown) {
      this.uiRefs.rootDown.visible = false;
    }
  }

  /**
   * 处理游戏开始过渡
   * 显示黑幕，隐藏Readiness UI，然后渐隐黑幕
   */
  private async handleGameStartTransition(data: {
    gameStarting: boolean;
    fadeInDuration: number;
    holdDuration: number;
    fadeOutDuration: number;
  }): Promise<void> {
    console.log('[ReadinessController] Game starting transition initiated');

    // 1. 立即隐藏所有Readiness UI元素
    this.hideAllReadinessUI();

    // 2. 获取黑幕元素
    const inputOverlay = this.uiScreen?.uiBox_inputOverlay;
    if (!inputOverlay) {
      console.error('[ReadinessController] inputOverlay not found');
      return;
    }

    console.log('[ReadinessController] Starting transition overlay animation');

    // 3. 使用Animation工具类执行完整的黑幕过渡：渐入 -> 停留 -> 渐出
    // 使用backgroundOpacity而不是alpha来控制黑幕透明度
    await Animation.transitionOverlay(
      inputOverlay,
      data.fadeInDuration,
      data.holdDuration,
      data.fadeOutDuration,
      true // 使用backgroundOpacity
    );

    console.log('[ReadinessController] Transition complete');
  }

  /**
   * 处理镜头切换完成（显示UI）
   */
  private handleCameraComplete(data: Events.CameraCompletePayload): void {
    console.log('[ReadinessController] Camera animation complete:', data);

    if (!this.isCharacterViewActive) {
      this.isCharacterViewActive = true;

      // 显示角色展示区域
      if (this.uiRefs?.rootMiddle) {
        this.uiRefs.rootMiddle.visible = true;
      }

      // 显示底部相机按钮
      if (this.uiRefs?.rootDown) {
        this.uiRefs.rootDown.visible = true;
      }

      console.log('[ReadinessController] Character view UI shown');
    }
  }

  /**
   * 处理镜头重置完成（回到初始状态）
   */
  private handleCameraResetComplete(): void {
    console.log('[ReadinessController] Camera reset complete');

    this.isCharacterViewActive = false;

    // 隐藏准备数显示
    if (this.uiRefs?.preparedCountBox) {
      this.uiRefs.preparedCountBox.visible = false;
    }

    // 重新显示切换角色按钮（Overseer 不显示）
    if (this.uiRefs?.switchCharacter) {
      this.uiRefs.switchCharacter.visible = !this.isOverseer;
    }

    // 如果之前已确认，取消确认状态
    if (this.service.isReady()) {
      this.service.cancelConfirmation();
    }

    // 更新按钮显示状态（回到未准备状态）
    if (this.uiRefs?.confirmSelection) {
      this.uiRefs.confirmSelection.visible = true;
    }
    if (this.uiRefs?.cancelConfirmation) {
      this.uiRefs.cancelConfirmation.visible = false;
    }

    console.log('[ReadinessController] UI reset to initial state');
  }

  /**
   * 订阅内部事件
   */
  private subscribeInternalEvents(): void {
    this.eventBus.on(Events.UI_SCROLL_NEXT, () => this.handleScrollNext());
    this.eventBus.on(Events.UI_SCROLL_PREV, () => this.handleScrollPrev());
    this.eventBus.on(Events.UI_TOGGLE_CAMERA_MODE, () =>
      this.handleToggleCameraMode()
    );
    this.eventBus.on(Events.UI_CONFIRM_SELECTION, () =>
      this.handleConfirmSelection()
    );
    this.eventBus.on(Events.UI_CANCEL_CONFIRMATION, () =>
      this.handleCancelConfirmation()
    );
    this.eventBus.on(Events.UI_SWITCH_CHARACTER, () =>
      this.handleSwitchCharacter()
    );
    this.eventBus.on(Events.UI_ENTER_SCROLL_VIEW, () =>
      this.handleEnterScrollView()
    );
    this.eventBus.on(Events.UI_LEAVE_SCROLL_VIEW, () =>
      this.handleLeaveScrollView()
    );

    console.log('[ReadinessController] Internal events subscribed');
  }

  // ==================== 事件处理器 ====================

  /**
   * 处理向下滚动（下一个角色）
   */
  private handleScrollNext(): void {
    // Overseer 不允许滚动切换角色
    if (this.isOverseer) {
      return;
    }

    if (
      this.service.isLocked() ||
      !this.animator ||
      this.animator.isPlaying()
    ) {
      return;
    }

    this.animator.slide('next', () => {
      this.service.setIndex(+1);
      this.bindCurrentCharacter();
    });
  }

  /**
   * 处理向上滚动（上一个角色）
   */
  private handleScrollPrev(): void {
    // Overseer 不允许滚动切换角色
    if (this.isOverseer) {
      return;
    }

    if (
      this.service.isLocked() ||
      !this.animator ||
      this.animator.isPlaying()
    ) {
      return;
    }

    this.animator.slide('prev', () => {
      this.service.setIndex(-1);
      this.bindCurrentCharacter();
    });
  }

  /**
   * 处理相机模式切换
   */
  private handleToggleCameraMode(): void {
    console.log('[ReadinessController] Toggle camera mode requested');

    // 立即隐藏角色视图UI
    if (this.uiRefs?.rootMiddle) {
      this.uiRefs.rootMiddle.visible = false;
    }
    if (this.uiRefs?.rootDown) {
      this.uiRefs.rootDown.visible = false;
    }

    // 通过网关请求服务端重置相机
    const playerId = ''; // TODO: 获取当前玩家ID
    this.communicationMgr.send(Events.GW_REQUEST_CAMERA_RESET, { playerId });
  }

  /**
   * 处理确认选择
   */
  private handleConfirmSelection(): void {
    if (this.service.isLocked()) {
      return;
    }

    this.service.confirmSelection();

    const character = this.service.getCurrentCharacter();
    if (character) {
      // 发送准备状态到服务端
      this.communicationMgr.send(Events.GW_READINESS_PLAYER_STATE, {
        isReady: true,
        characterId: character.id,
      });
    }

    // 显示准备数
    if (this.uiRefs?.preparedCountBox) {
      this.uiRefs.preparedCountBox.visible = true;
    }

    // 更新按钮显隐
    this.updateButtonVisibility();

    console.log('[ReadinessController] Selection confirmed');
  }

  /**
   * 处理取消确认
   */
  private handleCancelConfirmation(): void {
    if (this.service.isLocked()) {
      return;
    }

    this.service.cancelConfirmation();

    const character = this.service.getCurrentCharacter();
    if (character) {
      // 发送取消准备状态到服务端
      this.communicationMgr.send(Events.GW_READINESS_PLAYER_STATE, {
        isReady: false,
        characterId: character.id,
      });
    }

    // 隐藏准备数
    if (this.uiRefs?.preparedCountBox) {
      this.uiRefs.preparedCountBox.visible = false;
    }

    // 更新按钮显隐
    this.updateButtonVisibility();

    console.log('[ReadinessController] Confirmation canceled');
  }

  /**
   * 处理切换角色（请求服务端切换镜头到玩家对应的角色位置）
   */
  private handleSwitchCharacter(): void {
    // Overseer 不允许切换角色
    if (this.isOverseer) {
      console.log('[ReadinessController] Overseer cannot switch character');
      return;
    }

    if (this.service.isLocked() || this.service.isReady()) {
      return;
    }

    // 如果在卷轴视图中，先离开
    this.service.leaveScrollView();

    // 立即隐藏切换角色和确认选择按钮
    if (this.uiRefs?.switchCharacter) {
      this.uiRefs.switchCharacter.visible = false;
    }
    if (this.uiRefs?.confirmSelection) {
      this.uiRefs.confirmSelection.visible = false;
    }

    // 发送请求到服务端切换镜头
    // 不需要指定characterIndex，服务端会使用该玩家在队列中的索引
    this.communicationMgr.send(Events.GW_REQUEST_CHARACTER_VIEW, {
      isOverseer: false, // TODO: 从service中获取玩家阵营
    });

    console.log(
      '[ReadinessController] Requested character view switch to player position'
    );
  }

  /**
   * 处理进入卷轴视图
   */
  private handleEnterScrollView(): void {
    this.service.enterScrollView();
    this.hideRightButtons();
    console.log('[ReadinessController] Entered scroll view');
  }

  /**
   * 处理离开卷轴视图
   */
  private handleLeaveScrollView(): void {
    this.service.leaveScrollView();
    this.updateButtonVisibility();
    console.log('[ReadinessController] Left scroll view');
  }

  /**
   * 处理玩家阵营信息
   * @param data 阵营信息
   */
  private handleFactionInfo(data: { faction: string; isOverseer: boolean }): void {
    console.log('[ReadinessController] Received faction info:', data);
    
    this.isOverseer = data.isOverseer;
    
    // 如果是 Overseer，隐藏"切换角色"按钮
    if (this.isOverseer) {
      if (this.uiRefs?.switchCharacter) {
        this.uiRefs.switchCharacter.visible = false;
        console.log('[ReadinessController] Hide switch character button for Overseer');
      }
      
      // 如果是 Overseer，也可以隐藏上下翻页按钮（因为不需要切换角色）
      if (this.uiRefs?.turnUpScrollButton) {
        this.uiRefs.turnUpScrollButton.visible = false;
      }
      if (this.uiRefs?.turnDownScrollButton) {
        this.uiRefs.turnDownScrollButton.visible = false;
      }
      
      console.log('[ReadinessController] Overseer UI adjustments applied');
    } else {
      // Survivor 保持原有按钮显示
      console.log('[ReadinessController] Survivor UI - all buttons visible');
    }
  }

  /**
   * 处理服务端快照（准备人数和倒计时）
   */
  private handleSnapshot(data: Events.ReadinessSnapshotPayload): void {
    console.log('[ReadinessController] Received snapshot:', data);

    // 更新准备人数
    this.service.setPrepared(data.preparedPlayers, data.totalPlayers);
    if (this.uiRefs?.preparedNumber) {
      this.uiRefs.preparedNumber.textContent = this.service.getPreparedText();
    }

    // 更新传送就位状态
    this.service.setAllTeleported(data.isAllTeleported);

    // 更新倒计时
    if (data.countdownSec !== null) {
      this.service.setCountdown(data.countdownSec);
      if (this.uiRefs?.timerText) {
        this.uiRefs.timerText.textContent = this.service.formatTime(
          data.countdownSec
        );
      }
    }
  }

  /**
   * 处理强制开始
   */
  private handleForceStart(data: Events.ForceReadyStartPayload): void {
    console.log('[ReadinessController] Force ready start:', data);

    // 锁定状态
    this.service.lock();

    // 隐藏所有按钮
    this.hideAllButtons();

    // 触发游戏开始逻辑（交由外部系统）
    this.eventBus.emit('readiness:game:starting', {});
  }

  // ==================== UI更新辅助方法 ====================

  /**
   * 更新按钮显隐
   */
  private updateButtonVisibility(): void {
    const isReady = this.service.isReady();

    if (isReady) {
      // 已确认：显示取消按钮，隐藏确认和切换
      if (this.uiRefs?.cancelConfirmation) {
        this.uiRefs.cancelConfirmation.visible = true;
      }
      if (this.uiRefs?.confirmSelection) {
        this.uiRefs.confirmSelection.visible = false;
      }
      if (this.uiRefs?.switchCharacter) {
        this.uiRefs.switchCharacter.visible = false;
      }
    } else {
      // 未确认：显示确认和切换，隐藏取消
      if (this.uiRefs?.confirmSelection) {
        this.uiRefs.confirmSelection.visible = true;
      }
      if (this.uiRefs?.switchCharacter) {
        // Overseer 不显示切换角色按钮
        this.uiRefs.switchCharacter.visible = !this.isOverseer;
      }
      if (this.uiRefs?.cancelConfirmation) {
        this.uiRefs.cancelConfirmation.visible = false;
      }
    }
  }

  /**
   * 隐藏右下角按钮（进入卷轴视图时）
   */
  private hideRightButtons(): void {
    if (this.uiRefs?.confirmSelection) {
      this.uiRefs.confirmSelection.visible = false;
    }
    if (this.uiRefs?.cancelConfirmation) {
      this.uiRefs.cancelConfirmation.visible = false;
    }
    if (this.uiRefs?.switchCharacter) {
      this.uiRefs.switchCharacter.visible = false;
    }
  }

  /**
   * 隐藏所有按钮
   */
  private hideAllButtons(): void {
    this.hideRightButtons();
  }

  /**
   * 显示UI
   */
  show(): void {
    if (this.uiRefs?.rootMiddle) {
      this.uiRefs.rootMiddle.visible = true;
    }
    if (this.uiRefs?.rootDown) {
      this.uiRefs.rootDown.visible = true;
    }
    if (this.uiRefs?.rootDownRight) {
      this.uiRefs.rootDownRight.visible = true;
    }
    this.updateButtonVisibility();
  }

  /**
   * 隐藏UI
   */
  hide(): void {
    if (this.uiRefs?.rootMiddle) {
      this.uiRefs.rootMiddle.visible = false;
    }
    if (this.uiRefs?.rootDown) {
      this.uiRefs.rootDown.visible = false;
    }
    if (this.uiRefs?.rootDownRight) {
      this.uiRefs.rootDownRight.visible = false;
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // TODO: 取消事件订阅
    console.log('[ReadinessController] Disposed');
  }
}
