import { atom } from 'jotai';

// 订单方向
export type OrderSide = 'buy' | 'sell';

// 订单类型
export type OrderType = 'limit' | 'market' | 'stop_limit';

// 订单状态
export type OrderStatus = 'pending' | 'partial' | 'filled' | 'canceled';

// 完整订单结构
export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: string;
  amount: string;
  filled: string;      // 已成交数量
  remaining: string;   // 剩余数量
  total: string;
  stopPrice?: string;
  avgPrice?: string;   // 平均成交价
  time: number;
  updateTime: number;
  status: OrderStatus;
}

// 成交记录
export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: string;
  amount: string;
  total: string;
  fee: string;
  feeAsset: string;
  time: number;
}

// 当前挂单 (pending + partial)
export const openOrdersAtom = atom<Order[]>([]);

// 历史订单 (filled + canceled)
export const orderHistoryAtom = atom<Order[]>([]);

// 成交记录
export const tradeHistoryAtom = atom<Trade[]>([]);

// 订单加载状态
export const ordersLoadingAtom = atom<boolean>(false);

// 派生 atom: 当前挂单数量
export const openOrdersCountAtom = atom((get) => get(openOrdersAtom).length);
