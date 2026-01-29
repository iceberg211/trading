/**
 * 订单状态机
 * 管理订单在生命周期中的状态转换
 */

import type { 
  Order, 
  OrderStatus, 
  OrderEvent, 
  StateTransition,
  OrderFill,
} from '../types';

/**
 * 有效的状态转换表
 * 定义了从哪个状态可以通过什么事件转换到什么状态
 */
const VALID_TRANSITIONS: StateTransition[] = [
  // 新订单状态
  { from: 'NEW', event: 'PARTIAL_FILL', to: 'PARTIALLY_FILLED' },
  { from: 'NEW', event: 'FILL', to: 'FILLED' },
  { from: 'NEW', event: 'REQUEST_CANCEL', to: 'PENDING_CANCEL' },
  { from: 'NEW', event: 'CANCEL', to: 'CANCELED' },
  { from: 'NEW', event: 'REJECT', to: 'REJECTED' },
  { from: 'NEW', event: 'EXPIRE', to: 'EXPIRED' },
  
  // 部分成交状态
  { from: 'PARTIALLY_FILLED', event: 'PARTIAL_FILL', to: 'PARTIALLY_FILLED' },
  { from: 'PARTIALLY_FILLED', event: 'FILL', to: 'FILLED' },
  { from: 'PARTIALLY_FILLED', event: 'REQUEST_CANCEL', to: 'PENDING_CANCEL' },
  { from: 'PARTIALLY_FILLED', event: 'CANCEL', to: 'CANCELED' },
  { from: 'PARTIALLY_FILLED', event: 'EXPIRE', to: 'EXPIRED' },
  
  // 取消中状态
  { from: 'PENDING_CANCEL', event: 'PARTIAL_FILL', to: 'PENDING_CANCEL' },
  { from: 'PENDING_CANCEL', event: 'FILL', to: 'FILLED' },
  { from: 'PENDING_CANCEL', event: 'CANCEL', to: 'CANCELED' },
];

/**
 * 终态集合（不可再转换）
 */
const TERMINAL_STATES: OrderStatus[] = ['FILLED', 'CANCELED', 'REJECTED', 'EXPIRED'];

/**
 * 订单状态机
 */
export class OrderStateMachine {
  /**
   * 检查状态转换是否有效
   */
  static canTransition(from: OrderStatus, event: OrderEvent): boolean {
    if (TERMINAL_STATES.includes(from)) {
      return false;
    }
    
    return VALID_TRANSITIONS.some(
      t => t.from === from && t.event === event
    );
  }

  /**
   * 获取转换后的目标状态
   */
  static getNextState(from: OrderStatus, event: OrderEvent): OrderStatus | null {
    const transition = VALID_TRANSITIONS.find(
      t => t.from === from && t.event === event
    );
    return transition?.to ?? null;
  }

  /**
   * 检查是否为终态
   */
  static isTerminal(status: OrderStatus): boolean {
    return TERMINAL_STATES.includes(status);
  }

  /**
   * 应用状态转换，返回新的订单对象
   */
  static transition(order: Order, event: OrderEvent, payload?: TransitionPayload): Order {
    const nextState = this.getNextState(order.status, event);
    
    if (!nextState) {
      console.warn(`[OrderStateMachine] Invalid transition: ${order.status} + ${event}`);
      return order;
    }

    const now = Date.now();
    let updatedOrder: Order = {
      ...order,
      status: nextState,
      updateTime: now,
    };

    // 根据事件类型更新订单字段
    switch (event) {
      case 'PARTIAL_FILL':
      case 'FILL': {
        if (payload?.fill) {
          updatedOrder = this.applyFill(updatedOrder, payload.fill);
        }
        break;
      }
      case 'REJECT': {
        if (payload?.rejectReason) {
          updatedOrder.rejectReason = payload.rejectReason;
        }
        break;
      }
    }

    console.log(`[OrderStateMachine] ${order.status} -> ${nextState} (${event})`);
    return updatedOrder;
  }

  /**
   * 应用成交记录
   */
  private static applyFill(order: Order, fill: OrderFill): Order {
    const fills = [...order.fills, fill];
    
    // 计算累计成交量
    let totalExecutedQty = 0;
    let totalQuoteQty = 0;
    
    for (const f of fills) {
      const qty = parseFloat(f.quantity);
      const price = parseFloat(f.price);
      totalExecutedQty += qty;
      totalQuoteQty += qty * price;
    }

    // 计算平均成交价
    const avgPrice = totalExecutedQty > 0 
      ? (totalQuoteQty / totalExecutedQty).toFixed(8)
      : '0';

    return {
      ...order,
      fills,
      executedQty: totalExecutedQty.toFixed(8),
      cummulativeQuoteQty: totalQuoteQty.toFixed(8),
      avgPrice,
    };
  }

  /**
   * 获取可用的操作
   */
  static getAvailableActions(status: OrderStatus): OrderEvent[] {
    if (TERMINAL_STATES.includes(status)) {
      return [];
    }

    return VALID_TRANSITIONS
      .filter(t => t.from === status)
      .map(t => t.event)
      .filter((event, index, arr) => arr.indexOf(event) === index); // 去重
  }

  /**
   * 创建新订单
   */
  static createOrder(params: CreateOrderParams): Order {
    const now = Date.now();
    
    return {
      orderId: params.orderId,
      clientOrderId: params.clientOrderId || `order_${now}_${Math.random().toString(36).slice(2, 8)}`,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      status: 'NEW',
      timeInForce: params.timeInForce || 'GTC',
      origQty: params.quantity,
      executedQty: '0',
      price: params.price || '0',
      stopPrice: params.stopPrice || '0',
      avgPrice: '0',
      cummulativeQuoteQty: '0',
      time: now,
      updateTime: now,
      fills: [],
    };
  }
}

/**
 * 状态转换载荷
 */
interface TransitionPayload {
  fill?: OrderFill;
  rejectReason?: Order['rejectReason'];
}

/**
 * 创建订单参数
 */
interface CreateOrderParams {
  orderId: number;
  clientOrderId?: string;
  symbol: string;
  side: Order['side'];
  type: Order['type'];
  quantity: string;
  price?: string;
  stopPrice?: string;
  timeInForce?: Order['timeInForce'];
}
