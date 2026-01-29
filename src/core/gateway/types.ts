/**
 * MarketDataHub 类型定义
 */

/**
 * 数据通道类型
 */
export type DataChannel = 'kline' | 'depth' | 'trade' | 'ticker';

/**
 * 流配置
 */
export interface StreamConfig {
  channel: DataChannel;
  symbol: string;
  interval?: string; // 仅 kline 需要
}

/**
 * 消息处理器
 */
export type MessageHandler = (data: unknown) => void;

/**
 * 取消订阅函数
 */
export type UnsubscribeFn = () => void;

/**
 * Hub 连接状态
 */
export type HubStatus = 
  | 'connected' 
  | 'connecting' 
  | 'disconnected' 
  | 'reconnecting';

/**
 * 订阅选项
 */
export interface SubscribeOptions {
  /**
   * 是否立即订阅（默认 true）
   */
  immediate?: boolean;
  
  /**
   * 订阅失败时的回调
   */
  onError?: (error: Error) => void;
}
