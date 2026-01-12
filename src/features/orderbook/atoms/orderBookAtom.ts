import { atom } from 'jotai';

// 单个订单簿条目 [价格, 数量]
export type OrderBookItemType = [string, string];

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

// WebSocket 连接状态 (复用或独立，这里建议独立关注，但 UI 上可能合并显示)
// 目前主要依赖 useOrderBook hook 内部管理逻辑，状态可以通过派生 atom 暴露
