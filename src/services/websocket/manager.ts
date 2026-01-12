type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface WebSocketManagerOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

type MessageHandler = (data: any) => void;

/**
 * WebSocket 连接管理器
 * 支持自动重连、心跳检测、订阅管理
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private status: WebSocketStatus = 'disconnected';
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private messageHandlers: Set<MessageHandler> = new Set();
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;

  constructor(options: WebSocketManagerOptions) {
    this.url = options.url;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }

  /**
   * 连接 WebSocket
   */
  connect(): void {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.status = 'connecting';
    console.log('WebSocket 连接中...', this.url);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status = 'disconnected';
    this.reconnectAttempts = 0;
  }

  /**
   * 订阅消息
   */
  subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    
    // 返回取消订阅函数
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * 发送订阅消息（Binance 动态订阅）
   */
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket 未连接，无法发送消息');
    }
  }

  /**
   * 获取连接状态
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  private handleOpen(): void {
    console.log('WebSocket 已连接');
    this.status = 'connected';
    this.reconnectAttempts = 0;
    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // 分发消息给所有订阅者
      this.messageHandlers.forEach((handler) => {
        handler(data);
      });
    } catch (error) {
      console.error('解析 WebSocket 消息失败:', error);
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket 错误:', error);
  }

  private handleClose(): void {
    console.log('WebSocket 已断开');
    this.status = 'disconnected';
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.scheduleReconnect();
  }

  private startHeartbeat(): void {
    // Binance WebSocket 不需要客户端发送 ping
    // 但我们可以用心跳检测连接状态
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        console.warn('心跳检测失败，尝试重连');
        this.disconnect();
        this.scheduleReconnect();
      }
    }, 30000); // 30 秒检测一次
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，放弃重连');
      return;
    }

    this.status = 'reconnecting';
    this.reconnectAttempts++;

    console.log(
      `计划重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }
}
