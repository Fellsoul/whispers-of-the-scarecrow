import { Singleton } from '../core/patterns/Singleton';
import { EventBus } from '../core/events/EventBus';

export class CommunicationMgr extends Singleton<CommunicationMgr>() {
  constructor() {
    super();
    this.initializeReceiver();
  }

  /**
   * 定向发送消息给一个或多个客户端
   * @param to 目标玩家实体或实体数组
   * @param topic 消息主题
   * @param data 消息数据
   */
  sendTo<T>(
    to: GamePlayerEntity | GamePlayerEntity[],
    topic: string,
    data: T
  ): void {
    const targetIds = Array.isArray(to) ? to.map((p) => p.id) : to.id;
    console.log(`[Server SEND] Topic: ${topic}, To: [${targetIds}]`);
    remoteChannel.sendClientEvent(to, { topic, data });
  }

  /**
   * 广播消息给所有客户端
   * @param topic 消息主题
   * @param data 消息数据
   */
  sendBroad<T>(topic: string, data: T): void {
    console.log(`[Server BROADCAST] Topic: ${topic}`);
    remoteChannel.broadcastClientEvent({ topic, data });
  }

  /**
   * 初始化消息接收器，监听来自客户端的所有事件
   * 并通过 EventEmitter 在服务端进行分发
   */
  private initializeReceiver(): void {
    remoteChannel.onServerEvent((event) => {
      console.log(`[Server RECEIVE] Topic: ${event.args.topic}`);
      // 使用 EventEmitter 将事件在服务端内部广播
      EventBus.instance.emit(event.args.topic, event.args.data);
    });
  }
}
