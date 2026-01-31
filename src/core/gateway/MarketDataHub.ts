/**
 * MarketDataHub - 统一的市场数据订阅层
 * 
 * 核心功能：
 * - 单 WebSocket 连接，动态订阅/取消订阅
 * - 支持 kline、depth、trade、ticker 四种数据流
 * - 自动重连和心跳检测
 * - 订阅去重和引用计数
 */

import { WebSocketManager } from '@/services/websocket/manager';
import { SubscriptionManager } from './SubscriptionManager';
import { runtimeConfig } from '@/core/config/runtime';
import type { 
  DataChannel, 
  StreamConfig, 
  MessageHandler, 
  UnsubscribeFn,
  HubStatus 
} from './types';

export class MarketDataHub {
  private static instance: MarketDataHub;
  
  private ws: WebSocketManager;
  private subscriptionManager: SubscriptionManager;
  private messageHandlers: Map<string, Set<MessageHandler>>;
  private statusChangeHandlers: Set<(status: HubStatus) => void>;
  private requestId = 1;
  private isConnected = false;
  
  private constructor() {
    // 使用单连接 + 动态订阅模式
    const wsUrl = runtimeConfig.wsBase;
    
    this.ws = new WebSocketManager({
      url: wsUrl,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
    });
    
    this.subscriptionManager = new SubscriptionManager();
    this.messageHandlers = new Map();
    this.statusChangeHandlers = new Set();
    
    this.setupWebSocket();
  }
  
  static getInstance(): MarketDataHub {
    if (!MarketDataHub.instance) {
      MarketDataHub.instance = new MarketDataHub();
    }
    return MarketDataHub.instance;
  }
  
  private setupWebSocket() {
    // 订阅 WS 消息
    this.ws.subscribe((data: any) => {
      this.handleMessage(data);
    });
    
    // 连接 WebSocket
    this.ws.connect();
    
    // 监听连接状态变化 - 使用 1000ms 快速轮询以及时检测连接状态
    const checkStatusInterval = setInterval(() => {
      const status = this.ws.getStatus();
      const wasConnected = this.isConnected;
      this.isConnected = status === 'connected';
      
      // 连接成功时重新订阅
      if (!wasConnected && this.isConnected) {
        console.log('[MarketDataHub] WebSocket connected, resubscribing all streams...');
        this.resubscribeAll();
        this.notifyStatusChange('connected');
      }
      
      // 断开时记录
      if (wasConnected && !this.isConnected) {
        console.log('[MarketDataHub] WebSocket disconnected');
        this.notifyStatusChange(status as HubStatus);
      }
    }, 1000); // 1000ms 快速轮询
    
    // 保存定时器引用用于清理
    (this as any).statusCheckInterval = checkStatusInterval;
  }
  
  /**
   * 订阅数据流
   * @param channel 数据通道类型
   * @param symbol 交易对 (如 'btcusdt')
   * @param interval K线间隔 (仅 kline 需要)
   * @returns 取消订阅函数
   */
  subscribe(
    channel: DataChannel,
    symbol: string,
    interval?: string
  ): UnsubscribeFn {
    const streamConfig: StreamConfig = { channel, symbol, interval };
    const streamName = this.buildStreamName(streamConfig);
    
    // 检查是否已订阅
    const refCount = this.subscriptionManager.addSubscription(streamName);
    
    // 首次订阅时发送 SUBSCRIBE 消息
    if (refCount === 1) {
      this.sendSubscribe(streamName);
      console.log(`[MarketDataHub] Subscribed: ${streamName}`);
    } else {
      console.log(`[MarketDataHub] Reused subscription: ${streamName} (ref: ${refCount})`);
    }
    
    // 返回取消订阅函数
    return () => {
      const newRefCount = this.subscriptionManager.removeSubscription(streamName);
      
      // 引用计数归零时发送 UNSUBSCRIBE
      if (newRefCount === 0) {
        this.sendUnsubscribe(streamName);
        console.log(`[MarketDataHub] Unsubscribed: ${streamName}`);
      } else {
        console.log(`[MarketDataHub] Reduced ref: ${streamName} (ref: ${newRefCount})`);
      }
    };
  }
  
  /**
   * 注册消息处理器
   * @param streamKey 流标识 (可以是 channel 或完整 stream name)
   * @param handler 处理函数
   * @returns 取消注册函数
   */
  onMessage(streamKey: string, handler: MessageHandler): UnsubscribeFn {
    let handlers = this.messageHandlers.get(streamKey);
    
    if (!handlers) {
      handlers = new Set();
      this.messageHandlers.set(streamKey, handlers);
    }
    
    handlers.add(handler);
    
    return () => {
      handlers?.delete(handler);
      if (handlers?.size === 0) {
        this.messageHandlers.delete(streamKey);
      }
    };
  }
  
  /**
   * 获取连接状态
   */
  getStatus(): HubStatus {
    if (this.isConnected) return 'connected';
    return this.ws.getStatus() as HubStatus;
  }
  
  /**
   * 订阅状态变化事件（替代轮询）
   * @param handler 状态变化回调
   * @returns 取消订阅函数
   */
  onStatusChange(handler: (status: HubStatus) => void): () => void {
    this.statusChangeHandlers.add(handler);
    // 立即通知当前状态
    handler(this.getStatus());
    return () => {
      this.statusChangeHandlers.delete(handler);
    };
  }
  
  private notifyStatusChange(status: HubStatus) {
    for (const handler of this.statusChangeHandlers) {
      try {
        handler(status);
      } catch (err) {
        console.error('[MarketDataHub] Status change handler error:', err);
      }
    }
  }
  
  private buildStreamName(config: StreamConfig): string {
    const { channel, symbol, interval } = config;
    const normalizedSymbol = symbol.toLowerCase();
    
    switch (channel) {
      case 'kline':
        if (!interval) throw new Error('Kline channel requires interval');
        return `${normalizedSymbol}@kline_${interval}`;
      case 'depth':
        return `${normalizedSymbol}@depth@100ms`;
      case 'trade':
        return `${normalizedSymbol}@trade`;
      case 'ticker':
        return `${normalizedSymbol}@ticker`;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }
  
  private sendSubscribe(streamName: string) {
    if (!this.isConnected) {
      console.warn(`[MarketDataHub] Cannot subscribe - not connected: ${streamName}`);
      return;
    }
    
    const message = {
      method: 'SUBSCRIBE',
      params: [streamName],
      id: this.requestId++,
    };
    
    // 直接传对象，由 WSManager 统一处理序列化
    this.ws.send(message);
  }
  
  private sendUnsubscribe(streamName: string) {
    if (!this.isConnected) {
      return; // 连接已断开，无需发送
    }
    
    const message = {
      method: 'UNSUBSCRIBE',
      params: [streamName],
      id: this.requestId++,
    };
    
    // 直接传对象，由 WSManager 统一处理序列化
    this.ws.send(message);
  }
  
  private handleMessage(data: unknown) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      // 忽略订阅响应消息
      if (parsed.result !== undefined || parsed.id !== undefined) {
        return;
      }
      
      // Binance WebSocket 有两种消息格式:
      // 1. 组合流格式 (使用 /stream 端点): { stream: "btcusdt@depth@100ms", data: {...} }
      // 2. 单流格式 (使用 /ws 端点 + SUBSCRIBE): { e: "depthUpdate", s: "BTCUSDT", ... }
      
      let stream: string;
      let payload: any;
      
      if (parsed.stream && parsed.data) {
        // 组合流格式
        stream = parsed.stream;
        payload = parsed.data;
      } else if (parsed.e) {
        // 单流格式：从事件类型推断 channel
        // e="kline" -> kline, e="depthUpdate" -> depth, e="trade" -> trade, e="24hrTicker" -> ticker
        const eventType = parsed.e as string;
        const symbol = (parsed.s || '').toLowerCase();
        
        // 构建虚拟 stream 名称供路由使用
        switch (eventType) {
          case 'kline':
            stream = `${symbol}@kline_${parsed.k?.i || '1m'}`;
            break;
          case 'depthUpdate':
            stream = `${symbol}@depth@100ms`;
            break;
          case 'trade':
            stream = `${symbol}@trade`;
            break;
          case '24hrTicker':
            stream = `${symbol}@ticker`;
            break;
          default:
            console.warn('[MarketDataHub] Unknown event type:', eventType);
            return;
        }
        
        payload = parsed;
      } else {
        console.warn('[MarketDataHub] Invalid message format:', parsed);
        return;
      }
      
      // 提取 channel type (如 'btcusdt@kline_1m' -> 'kline')
      const channelType = this.extractChannelType(stream);
      
      // 分发到对应的处理器
      this.dispatchMessage(stream, payload);
      this.dispatchMessage(channelType, payload);
      
    } catch (error) {
      console.error('[MarketDataHub] Failed to handle message:', error);
    }
  }
  
  private extractChannelType(stream: string): string {
    // 'btcusdt@kline_1m' -> 'kline'
    // 'btcusdt@depth@100ms' -> 'depth'
    const match = stream.match(/@([^@_]+)/);
    return match ? match[1] : '';
  }
  
  private dispatchMessage(key: string, data: unknown) {
    const handlers = this.messageHandlers.get(key);
    
    if (handlers && handlers.size > 0) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[MarketDataHub] Handler error for ${key}:`, error);
        }
      });
    }
  }
  
  private resubscribeAll() {
    const activeStreams = this.subscriptionManager.getActiveStreams();
    
    console.log(`[MarketDataHub] Resubscribing ${activeStreams.length} streams...`);
    
    activeStreams.forEach((streamName: string) => {
      this.sendSubscribe(streamName);
    });
  }
  
  /**
   * 销毁实例（主要用于测试）
   */
  destroy() {
    if ((this as any).statusCheckInterval) {
      clearInterval((this as any).statusCheckInterval);
    }
    this.ws.disconnect();
    this.subscriptionManager.clear();
    this.messageHandlers.clear();
  }
}

// 导出单例
export const marketDataHub = MarketDataHub.getInstance();
