/**
 * ReadinessController - 聚合协调：UI <-> Service <-> Gateway
 */

import type { EventBus } from '../../core/events/EventBus';
import { CommunicationMgr } from '../../presentation/CommunicationGateway';
import type { ReadinessService } from './ReadinessService';
import { CharacterBinder } from './CharacterBinder';
import { ScrollAnimator } from './ScrollAnimator';
import type { UiRefs } from './types';
import * as Events from './events';

export class ReadinessController {
  private service: ReadinessService;
  private animator: ScrollAnimator | null = null;
  private eventBus: EventBus;
  private communicationMgr: CommunicationMgr;
  private uiRefs: UiRefs | null = null;
  private isCharacterViewActive: boolean = false; // 是否已进入角色视角

  constructor(service: ReadinessService, eventBus: EventBus) {
    this.service = service;
    this.eventBus = eventBus;
    this.communicationMgr = CommunicationMgr.instance;
  }

  /**
   * 初始化Controller
   * @param uiRefs UI节点引用
   */
  async initialize(uiRefs: UiRefs | null): Promise<void> {
    console.log('[ReadinessController] Initializing...');

    this.uiRefs = uiRefs;
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
   * 绑定当前角色到UI
   */
  private bindCurrentCharacter(): void {
    if (!this.uiRefs) {
      return;
    }

    const character = this.service.getCurrentCharacter();
    CharacterBinder.bind(character, this.uiRefs);
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

    console.log('[ReadinessController] Gateway events subscribed');
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

      // 隐藏切换角色按钮（已经进入角色视图）
      if (this.uiRefs?.switchCharacter) {
        this.uiRefs.switchCharacter.visible = false;
      }

      console.log('[ReadinessController] Character view UI shown');
    }
  }

  /**
   * 处理镜头重置完成（隐藏UI，回到初始状态）
   */
  private handleCameraResetComplete(): void {
    console.log('[ReadinessController] Camera reset complete, hiding UI');

    this.isCharacterViewActive = false;

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

    // 重新显示切换角色按钮
    if (this.uiRefs?.switchCharacter) {
      this.uiRefs.switchCharacter.visible = true;
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
    if (this.service.isLocked() || this.service.isReady()) {
      return;
    }

    // 如果在卷轴视图中，先离开
    this.service.leaveScrollView();

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
        this.uiRefs.switchCharacter.visible = true;
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
