/**
 * 本地撮合引擎 MVP
 * 模拟 CEX 订单撮合逻辑
 */

import Decimal from 'decimal.js';
import { OrderStateMachine } from './OrderStateMachine';
import { OrderValidator } from './OrderValidator';
import type { 
  Order, 
  NewOrderRequest, 
  OrderResponse,
  OrderFill,
} from '../types';

// 订单簿数据类型
type OrderBookData = {
  bids: [string, string][];  // [price, quantity][]
  asks: [string, string][];
};

/**
 * 撮合引擎配置
 */
interface MatchingEngineConfig {
  slippageTolerance: number;  // 滑点容忍度（百分比）
  makerFeeRate: number;       // 挂单手续费率
  takerFeeRate: number;       // 吃单手续费率
}

const DEFAULT_CONFIG: MatchingEngineConfig = {
  slippageTolerance: 0.1,     // 0.1%
  makerFeeRate: 0.001,        // 0.1%
  takerFeeRate: 0.001,        // 0.1%
};

/**
 * 本地撮合引擎
 * 基于实时订单簿数据模拟订单执行
 */
export class MatchingEngine {
  private config: MatchingEngineConfig;
  private orderIdCounter = 1;
  private tradeIdCounter = 1;
  private activeOrders: Map<number, Order> = new Map();
  private orderHistory: Order[] = [];

  constructor(config: Partial<MatchingEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 提交订单
   */
  submitOrder(
    request: NewOrderRequest,
    orderBook: OrderBookData,
    availableBalance: string
  ): OrderResponse {
    // 获取当前价格（用于验证）
    const currentPrice = this.getCurrentPrice(orderBook, request.side);

    // 1. 验证订单
    const validation = OrderValidator.validate(request, availableBalance, currentPrice);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: validation.errors[0].message,
          reason: validation.errors[0].reason,
        },
      };
    }

    // 2. 创建订单
    const order = OrderStateMachine.createOrder({
      orderId: this.orderIdCounter++,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      price: request.price,
      stopPrice: request.stopPrice,
      timeInForce: request.timeInForce,
      clientOrderId: request.clientOrderId,
    });

    // 3. 根据订单类型执行撮合
    let executedOrder: Order;

    switch (request.type) {
      case 'MARKET':
        executedOrder = this.executeMarketOrder(order, orderBook);
        break;
      case 'LIMIT':
        executedOrder = this.executeLimitOrder(order, orderBook);
        break;
      case 'STOP_LIMIT':
      case 'STOP_MARKET':
        // 止损单：直接挂单等待触发
        executedOrder = order;
        this.activeOrders.set(order.orderId, order);
        break;
      default:
        executedOrder = order;
    }

    // 4. 记录历史
    if (OrderStateMachine.isTerminal(executedOrder.status)) {
      this.orderHistory.push(executedOrder);
    } else {
      this.activeOrders.set(executedOrder.orderId, executedOrder);
    }

    console.log(`[MatchingEngine] Order ${executedOrder.orderId} ${executedOrder.status}`);

    return {
      success: true,
      order: executedOrder,
    };
  }

  /**
   * 执行市价单
   * 立即按订单簿最优价格成交
   */
  private executeMarketOrder(order: Order, orderBook: OrderBookData): Order {
    const levels = order.side === 'BUY' ? orderBook.asks : orderBook.bids;
    
    if (levels.length === 0) {
      return OrderStateMachine.transition(order, 'REJECT', {
        rejectReason: 'MARKET_CLOSED',
      });
    }

    // 按价格顺序吃单
    let remainingQty = new Decimal(order.origQty);
    const fills: OrderFill[] = [];
    let totalQuoteQty = new Decimal(0);

    for (const [price, qty] of levels) {
      if (remainingQty.lte(0)) break;

      const levelQty = new Decimal(qty);
      const fillQty = Decimal.min(remainingQty, levelQty);
      const fillPrice = new Decimal(price);
      
      const quoteQty = fillQty.times(fillPrice);
      const commission = quoteQty.times(this.config.takerFeeRate);

      fills.push({
        price: fillPrice.toFixed(8),
        quantity: fillQty.toFixed(8),
        commission: commission.toFixed(8),
        commissionAsset: order.side === 'BUY' ? order.symbol.replace(/USDT$|BUSD$/, '') : 'USDT',
        tradeId: this.tradeIdCounter++,
        time: Date.now(),
      });

      remainingQty = remainingQty.minus(fillQty);
      totalQuoteQty = totalQuoteQty.plus(quoteQty);
    }

    // 判断是否完全成交
    if (remainingQty.lte(0)) {
      // 应用所有成交
      let result = order;
      for (const fill of fills) {
        result = OrderStateMachine.transition(result, 'PARTIAL_FILL', { fill });
      }
      return OrderStateMachine.transition(result, 'FILL');
    } else if (fills.length > 0) {
      // 部分成交（流动性不足）
      let result = order;
      for (const fill of fills) {
        result = OrderStateMachine.transition(result, 'PARTIAL_FILL', { fill });
      }
      // IOC/FOK 处理
      if (order.timeInForce === 'IOC' || order.timeInForce === 'FOK') {
        return OrderStateMachine.transition(result, 'CANCEL');
      }
      return result;
    } else {
      // 无流动性
      return OrderStateMachine.transition(order, 'REJECT', {
        rejectReason: 'MARKET_CLOSED',
      });
    }
  }

  /**
   * 执行限价单
   * 检查是否可以立即成交，否则挂单
   */
  private executeLimitOrder(order: Order, orderBook: OrderBookData): Order {
    const orderPrice = new Decimal(order.price);
    const levels = order.side === 'BUY' ? orderBook.asks : orderBook.bids;

    // 检查是否可以成交
    const canMatch = levels.length > 0 && (
      order.side === 'BUY' 
        ? orderPrice.gte(new Decimal(levels[0][0]))  // 买单价格 >= 最低卖价
        : orderPrice.lte(new Decimal(levels[0][0]))  // 卖单价格 <= 最高买价
    );

    if (!canMatch) {
      // 挂单（Maker）
      return order;
    }

    // 可以成交（Taker）
    let remainingQty = new Decimal(order.origQty);
    const fills: OrderFill[] = [];

    for (const [price, qty] of levels) {
      if (remainingQty.lte(0)) break;

      const levelPrice = new Decimal(price);
      
      // 检查价格是否在限价范围内
      if (order.side === 'BUY' && levelPrice.gt(orderPrice)) break;
      if (order.side === 'SELL' && levelPrice.lt(orderPrice)) break;

      const levelQty = new Decimal(qty);
      const fillQty = Decimal.min(remainingQty, levelQty);
      const quoteQty = fillQty.times(levelPrice);
      const commission = quoteQty.times(this.config.takerFeeRate);

      fills.push({
        price: levelPrice.toFixed(8),
        quantity: fillQty.toFixed(8),
        commission: commission.toFixed(8),
        commissionAsset: order.side === 'BUY' ? order.symbol.replace(/USDT$|BUSD$/, '') : 'USDT',
        tradeId: this.tradeIdCounter++,
        time: Date.now(),
      });

      remainingQty = remainingQty.minus(fillQty);
    }

    // 应用成交
    let result = order;
    for (const fill of fills) {
      result = OrderStateMachine.transition(result, 'PARTIAL_FILL', { fill });
    }

    if (remainingQty.lte(0)) {
      return OrderStateMachine.transition(result, 'FILL');
    }

    // 剩余部分挂单
    return result;
  }

  /**
   * 取消订单
   */
  cancelOrder(orderId: number): OrderResponse {
    const order = this.activeOrders.get(orderId);
    
    if (!order) {
      return {
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `订单 ${orderId} 不存在`,
        },
      };
    }

    if (!OrderStateMachine.canTransition(order.status, 'CANCEL')) {
      return {
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: `订单状态 ${order.status} 无法取消`,
        },
      };
    }

    const canceledOrder = OrderStateMachine.transition(order, 'CANCEL');
    this.activeOrders.delete(orderId);
    this.orderHistory.push(canceledOrder);

    return {
      success: true,
      order: canceledOrder,
    };
  }

  /**
   * 获取当前市场价格
   */
  private getCurrentPrice(orderBook: OrderBookData, side: 'BUY' | 'SELL'): string | undefined {
    // 买单看卖一价，卖单看买一价
    const levels = side === 'BUY' ? orderBook.asks : orderBook.bids;
    return levels.length > 0 ? levels[0][0] : undefined;
  }

  /**
   * 获取活跃订单
   */
  getActiveOrders(): Order[] {
    return Array.from(this.activeOrders.values());
  }

  /**
   * 获取订单历史
   */
  getOrderHistory(limit = 100): Order[] {
    return this.orderHistory.slice(-limit);
  }

  /**
   * 获取指定订单
   */
  getOrder(orderId: number): Order | undefined {
    return this.activeOrders.get(orderId) || 
           this.orderHistory.find(o => o.orderId === orderId);
  }

  /**
   * 检查止损单触发
   * 应在每次价格更新时调用
   */
  checkStopOrders(currentPrice: string, orderBook: OrderBookData): Order[] {
    const triggeredOrders: Order[] = [];
    const price = new Decimal(currentPrice);

    for (const order of this.activeOrders.values()) {
      if (order.type !== 'STOP_LIMIT' && order.type !== 'STOP_MARKET') continue;
      if (!order.stopPrice || order.stopPrice === '0') continue;

      const stopPrice = new Decimal(order.stopPrice);
      let triggered = false;

      // 买入止损：价格上涨触发
      if (order.side === 'BUY' && price.gte(stopPrice)) {
        triggered = true;
      }
      // 卖出止损：价格下跌触发
      if (order.side === 'SELL' && price.lte(stopPrice)) {
        triggered = true;
      }

      if (triggered) {
        console.log(`[MatchingEngine] Stop order ${order.orderId} triggered at ${currentPrice}`);
        
        // 转换为市价单或限价单执行
        let executedOrder: Order;
        if (order.type === 'STOP_MARKET') {
          executedOrder = this.executeMarketOrder(order, orderBook);
        } else {
          executedOrder = this.executeLimitOrder(order, orderBook);
        }

        this.activeOrders.delete(order.orderId);
        
        if (OrderStateMachine.isTerminal(executedOrder.status)) {
          this.orderHistory.push(executedOrder);
        } else {
          this.activeOrders.set(executedOrder.orderId, executedOrder);
        }

        triggeredOrders.push(executedOrder);
      }
    }

    return triggeredOrders;
  }
}

// 导出单例
export const matchingEngine = new MatchingEngine();
