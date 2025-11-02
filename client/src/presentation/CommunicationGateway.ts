import { _decorator, Component, EntityNode } from '@dao3fun/component';
const { apclass } = _decorator;

@apclass('CommunicationManager')
export class CommunicationManager extends Component<UiNode> {
  start() {}

  update(deltaTime: number) {}
}
import { Singleton } from '../core/patterns/Singleton';
import { EventBus } from '../core/events/EventBus';

// Minimal global declaration for remoteChannel used by client runtime

export class CommunicationMgr extends Singleton<CommunicationMgr>() {
  constructor() {
    super();
    this.initializeReceiver();
  }

  /**
   * 发送消息给服务端
   * @param topic 消息主题
   * @param data 消息数据
   */
  send<T>(topic: string, data: T): void {

    remoteChannel.sendServerEvent({ topic, data });
  }

  /**
   * 初始化消息接收器，监听来自服务端的所有事件
   * 并通过 EventEmitter 在客户端进行分发
   */
  private initializeReceiver(): void {
    console.log('[Client] Setting up remoteChannel.onClientEvent listener');
    remoteChannel.onClientEvent((event) => {
      // The server sends { topic, data } directly, not wrapped in args
      const topic = event.topic || event.args?.topic;
      const data = event.data || event.args?.data;
      
      // 调试日志：显示关键事件
      if (topic === 'client:userId:set' || topic === 'ingame:profiles:batch') {
        console.log(`[Client RECEIVE] Topic: ${topic}`, data);
      }
      
      // 使用 EventEmitter 将事件在客户端内部广播
      if (topic) {
        EventBus.instance.emit(topic, data);
      }
    });
  }

  public initialize(): void {
    this.initializeReceiver();
  }
}
