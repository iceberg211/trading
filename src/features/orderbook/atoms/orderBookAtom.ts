import { atom } from 'jotai';

// 单个订单簿条目 [价格, 数量]
export type OrderBookItemType = [string, string];

// 订单簿同步状态枚举
export type OrderBookSyncStatus = 
  | 'uninitialized' 
  | 'syncing' 
  | 'synchronized' 
  | 'gap_detected';

// 订单簿结构
export interface OrderBookState {
  lastUpdateId: number;
  bids: OrderBookItemType[]; // 买盘 [Price, Qty]
  asks: OrderBookItemType[]; // 卖盘 [Price, Qty]
}

export const initialOrderBookState: OrderBookState = {
  lastUpdateId: 0,
  bids: [],
  asks: [],
};

// 订单簿数据
export const orderBookAtom = atom<OrderBookState>(initialOrderBookState);

// 加载状态
export const orderBookLoadingAtom = atom<boolean>(false);

// 错误状态
export const orderBookErrorAtom = atom<string | null>(null);

// 同步状态 - 用于 Gap 检测和恢复
export const orderBookSyncStatusAtom = atom<OrderBookSyncStatus>('uninitialized');

// Gap 检测计数器 - 防止频繁重连
export const orderBookGapCountAtom = atom<number>(0);

// Debug info from orderbook engine worker (for DevPanel)
export const orderBookBufferSizeAtom = atom<number>(0);
export const orderBookLastGapAtom = atom<{
  expected: number;
  got: number;
  lastUpdateId: number;
  time: number;
} | null>(null);
