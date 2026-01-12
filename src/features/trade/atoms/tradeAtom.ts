import { atom } from 'jotai';

// 订单类型
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';

// 交易表单状态
export interface TradeFormState {
  side: OrderSide;
  type: OrderType;
  price: string;
  amount: string;
  total: string;
  percentageUsed: number; // 0-100
}

// 默认表单状态
export const defaultTradeFormState: TradeFormState = {
  side: 'buy',
  type: 'limit',
  price: '',
  amount: '',
  total: '',
  percentageUsed: 0,
};

// 交易表单 atom
export const tradeFormAtom = atom<TradeFormState>(defaultTradeFormState);

// 模拟余额 atom (仅用于演示)
export const mockBalanceAtom = atom({
  USDT: '10000.00',
  BTC: '0.5',
});

// 订单提交状态
export const orderSubmittingAtom = atom<boolean>(false);

// 模拟订单历史
export interface MockOrder {
  id: string;
  side: OrderSide;
  type: OrderType;
  price: string;
  amount: string;
  total: string;
  time: number;
  status: 'filled' | 'pending';
}

export const mockOrdersAtom = atom<MockOrder[]>([]);
