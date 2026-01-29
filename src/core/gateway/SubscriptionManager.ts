/**
 * SubscriptionManager - 订阅引用计数管理
 * 
 * 功能：
 * - 跟踪每个流的订阅引用计数
 * - 防止重复订阅
 * - 支持重连后恢复订阅
 */

export class SubscriptionManager {
  private subscriptions: Map<string, number> = new Map();
  
  /**
   * 添加订阅引用
   * @param streamName 流名称
   * @returns 当前引用计数
   */
  addSubscription(streamName: string): number {
    const currentCount = this.subscriptions.get(streamName) || 0;
    const newCount = currentCount + 1;
    this.subscriptions.set(streamName, newCount);
    return newCount;
  }
  
  /**
   * 移除订阅引用
   * @param streamName 流名称
   * @returns 当前引用计数
   */
  removeSubscription(streamName: string): number {
    const currentCount = this.subscriptions.get(streamName) || 0;
    
    if (currentCount <= 0) {
      console.warn(`[SubscriptionManager] Attempt to remove non-existent subscription: ${streamName}`);
      return 0;
    }
    
    const newCount = currentCount - 1;
    
    if (newCount === 0) {
      this.subscriptions.delete(streamName);
    } else {
      this.subscriptions.set(streamName, newCount);
    }
    
    return newCount;
  }
  
  /**
   * 获取所有活跃的流
   */
  getActiveStreams(): string[] {
    return Array.from(this.subscriptions.keys());
  }
  
  /**
   * 获取订阅数量
   */
  getSubscriptionCount(streamName: string): number {
    return this.subscriptions.get(streamName) || 0;
  }
  
  /**
   * 清空所有订阅
   */
  clear() {
    this.subscriptions.clear();
  }
  
  /**
   * 获取订阅统计
   */
  getStats() {
    return {
      totalStreams: this.subscriptions.size,
      totalReferences: Array.from(this.subscriptions.values()).reduce((sum, count) => sum + count, 0),
      streams: Array.from(this.subscriptions.entries()).map(([name, count]) => ({ name, count })),
    };
  }
}
