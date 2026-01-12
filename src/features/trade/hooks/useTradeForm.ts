import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import Decimal from 'decimal.js';
import {
  tradeFormAtom,
  mockBalanceAtom,
  orderSubmittingAtom,
  mockOrdersAtom,
  OrderSide,
  OrderType,
  MockOrder,
} from '../atoms/tradeAtom';
import { orderBookAtom } from '@/features/orderbook/atoms/orderBookAtom';
import { symbolConfigAtom } from '@/features/symbol/atoms/symbolAtom';

export function useTradeForm() {
  const [form, setForm] = useAtom(tradeFormAtom);
  const [balance] = useAtom(mockBalanceAtom);
  const [submitting, setSubmitting] = useAtom(orderSubmittingAtom);
  const [orders, setOrders] = useAtom(mockOrdersAtom);
  const orderBook = useAtomValue(orderBookAtom);
  const symbolConfig = useAtomValue(symbolConfigAtom);

  const { qtyPrecision } = symbolConfig;

  // 获取当前最优价格
  const getBestPrice = useCallback((side: OrderSide): string => {
    if (side === 'buy' && orderBook.asks.length > 0) {
      return orderBook.asks[0][0]; // 最低卖价
    }
    if (side === 'sell' && orderBook.bids.length > 0) {
      return orderBook.bids[0][0]; // 最高买价
    }
    return '';
  }, [orderBook]);

  // 切换买卖方向
  const setSide = useCallback((side: OrderSide) => {
    setForm((prev) => ({
      ...prev,
      side,
      price: getBestPrice(side),
      amount: '',
      total: '',
      percentageUsed: 0,
    }));
  }, [setForm, getBestPrice]);

  // 切换订单类型
  const setType = useCallback((type: OrderType) => {
    setForm((prev) => ({ ...prev, type }));
  }, [setForm]);

  // 设置价格
  const setPrice = useCallback((price: string) => {
    setForm((prev) => {
      const newTotal = price && prev.amount
        ? new Decimal(price).times(prev.amount).toFixed(2)
        : '';
      return { ...prev, price, total: newTotal };
    });
  }, [setForm]);

  // 设置数量
  const setAmount = useCallback((amount: string) => {
    setForm((prev) => {
      const newTotal = prev.price && amount
        ? new Decimal(prev.price).times(amount).toFixed(2)
        : '';
      return { ...prev, amount, total: newTotal };
    });
  }, [setForm]);

  // 设置总额（反算数量）
  const setTotal = useCallback((total: string) => {
    setForm((prev) => {
      const newAmount = prev.price && total && parseFloat(prev.price) > 0
        ? new Decimal(total).div(prev.price).toFixed(qtyPrecision)
        : '';
      return { ...prev, total, amount: newAmount };
    });
  }, [setForm, qtyPrecision]);

  // 百分比快捷设置
  const setPercentage = useCallback((percentage: number) => {
    setForm((prev) => {
      const availableBalance = prev.side === 'buy' ? balance.USDT : balance.BTC;
      const maxValue = new Decimal(availableBalance);

      if (prev.side === 'buy') {
        // 买入：用 USDT 余额计算
        const total = maxValue.times(percentage).div(100).toFixed(2);
        const amount = prev.price && parseFloat(prev.price) > 0
          ? new Decimal(total).div(prev.price).toFixed(qtyPrecision)
          : '';
        return { ...prev, percentageUsed: percentage, total, amount };
      } else {
        // 卖出：用 BTC 余额计算
        const amount = maxValue.times(percentage).div(100).toFixed(qtyPrecision);
        const total = prev.price
          ? new Decimal(prev.price).times(amount).toFixed(2)
          : '';
        return { ...prev, percentageUsed: percentage, amount, total };
      }
    });
  }, [setForm, balance, qtyPrecision]);

  // 提交订单（模拟）
  const submitOrder = useCallback(async () => {
    if (!form.price || !form.amount || submitting) return;

    setSubmitting(true);

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newOrder: MockOrder = {
      id: `order_${Date.now()}`,
      side: form.side,
      type: form.type,
      price: form.price,
      amount: form.amount,
      total: form.total,
      time: Date.now(),
      status: 'filled', // 模拟立即成交
    };

    setOrders((prev) => [newOrder, ...prev]);

    // 重置表单
    setForm((prev) => ({
      ...prev,
      amount: '',
      total: '',
      percentageUsed: 0,
    }));

    setSubmitting(false);

    return newOrder;
  }, [form, submitting, setSubmitting, setOrders, setForm]);

  // 表单验证
  const validation = {
    isValid: !!form.price && !!form.amount && parseFloat(form.amount) > 0,
    errors: {
      price: !form.price ? '请输入价格' : null,
      amount: !form.amount ? '请输入数量' : parseFloat(form.amount) <= 0 ? '数量必须大于0' : null,
    },
  };

  return {
    form,
    balance,
    submitting,
    orders,
    validation,
    setSide,
    setType,
    setPrice,
    setAmount,
    setTotal,
    setPercentage,
    submitOrder,
    getBestPrice,
  };
}
