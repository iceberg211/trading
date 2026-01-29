/**
 * 交易领域类型定义
 */

// ==================== 订单状态 ====================

/**
 * 订单状态枚举
 * 模拟 Binance CEX 订单生命周期
 */
export type OrderStatus = 
  | 'NEW'           // 新订单，等待成交
  | 'PARTIALLY_FILLED' // 部分成交
  | 'FILLED'        // 完全成交
  | 'CANCELED'      // 已取消
  | 'PENDING_CANCEL' // 取消中
  | 'REJECTED'      // 被拒绝
  | 'EXPIRED';      // 已过期

/**
 * 订单类型
 */
export type OrderType = 
  | 'LIMIT'         // 限价单
  | 'MARKET'        // 市价单
  | 'STOP_LIMIT'    // 止损限价单
  | 'STOP_MARKET';  // 止损市价单

/**
 * 订单方向
 */
export type OrderSide = 'BUY' | 'SELL';

/**
 * 有效期类型
 */
export type TimeInForce = 
  | 'GTC'  // Good Till Cancel - 成交为止
  | 'IOC'  // Immediate Or Cancel - 立即成交或取消
  | 'FOK'; // Fill Or Kill - 全部成交或取消

// ==================== 订单拒绝原因 ====================

/**
 * 订单拒绝原因
 */
export type RejectReason = 
  | 'INSUFFICIENT_BALANCE'    // 余额不足
  | 'INVALID_PRICE'           // 无效价格
  | 'INVALID_QUANTITY'        // 无效数量
  | 'MIN_NOTIONAL'            // 低于最小交易金额
  | 'PRICE_OUT_OF_RANGE'      // 价格超出范围
  | 'QUANTITY_OUT_OF_RANGE'   // 数量超出范围
  | 'INVALID_TICK_SIZE'       // 价格精度不符
  | 'INVALID_STEP_SIZE'       // 数量精度不符
  | 'MARKET_CLOSED'           // 市场关闭
  | 'ORDER_WOULD_TRIGGER_IMMEDIATELY' // 止损单会立即触发
  | 'UNKNOWN';                // 未知原因

// ==================== 订单实体 ====================

/**
 * 新订单请求
 */
export interface NewOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;        // 市价单不需要
  stopPrice?: string;    // 止损单需要
  timeInForce?: TimeInForce;
  clientOrderId?: string;
}

/**
 * 订单成交记录
 */
export interface OrderFill {
  price: string;
  quantity: string;
  commission: string;
  commissionAsset: string;
  tradeId: number;
  time: number;
}

/**
 * 订单实体
 */
export interface Order {
  orderId: number;
  clientOrderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  timeInForce: TimeInForce;
  
  // 数量相关
  origQty: string;        // 原始数量
  executedQty: string;    // 已成交数量
  
  // 价格相关
  price: string;          // 限价/止损限价的价格
  stopPrice: string;      // 止损触发价格
  avgPrice: string;       // 平均成交价
  
  // 金额相关
  cummulativeQuoteQty: string; // 累计成交金额
  
  // 时间相关
  time: number;           // 创建时间
  updateTime: number;     // 最后更新时间
  
  // 成交记录
  fills: OrderFill[];
  
  // 拒绝原因（仅当 status === 'REJECTED'）
  rejectReason?: RejectReason;
}

/**
 * 订单响应（提交后返回）
 */
export interface OrderResponse {
  success: boolean;
  order?: Order;
  error?: {
    code: string;
    message: string;
    reason?: RejectReason;
  };
}

// ==================== 状态转换 ====================

/**
 * 状态转换事件
 */
export type OrderEvent = 
  | 'SUBMIT'          // 提交订单
  | 'PARTIAL_FILL'    // 部分成交
  | 'FILL'            // 完全成交
  | 'REQUEST_CANCEL'  // 请求取消
  | 'CANCEL'          // 确认取消
  | 'REJECT'          // 拒绝订单
  | 'EXPIRE';         // 订单过期

/**
 * 状态转换定义
 */
export interface StateTransition {
  from: OrderStatus;
  event: OrderEvent;
  to: OrderStatus;
}

// ==================== 验证结果 ====================

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: {
    field: string;
    message: string;
    reason?: RejectReason;
  }[];
}
