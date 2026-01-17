import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import Decimal from 'decimal.js';
import {
  tradeFormAtom,
  mockBalanceAtom,
  orderSubmittingAtom,
  OrderSide,
  OrderType,
} from '../atoms/tradeAtom';
import { orderBookAtom } from '@/features/orderbook/atoms/orderBookAtom';
import { symbolConfigAtom, symbolAtom } from '@/features/symbol/atoms/symbolAtom';
import { useOrders } from '@/features/orders/hooks/useOrders';

export function useTradeForm() {
  const [form, setForm] = useAtom(tradeFormAtom);
  const [balance] = useAtom(mockBalanceAtom);
  const [submitting, setSubmitting] = useAtom(orderSubmittingAtom);
  const orderBook = useAtomValue(orderBookAtom);
  const symbolConfig = useAtomValue(symbolConfigAtom);
  const symbol = useAtomValue(symbolAtom);
  const { createOrder } = useOrders();

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
    setForm((prev) => ({
      ...prev,
      type,
      stopPrice: '', // 切换类型时重置止损价
    }));
  }, [setForm]);

  // 设置止损价格
  const setStopPrice = useCallback((stopPrice: string) => {
    setForm((prev) => ({ ...prev, stopPrice }));
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

  // 提交订单 - 使用新的订单管理系统
  const submitOrder = useCallback(async () => {
    // 市价单不需要价格，但需要数量
    const needsPrice = form.type !== 'market';
    if ((needsPrice && !form.price) || !form.amount || submitting) return;
    
    // 止损单需要止损价
    if (form.type === 'stop_limit' && !form.stopPrice) return;

    setSubmitting(true);

    try {
      // 获取当前市价（用于市价单）
      const price = form.type === 'market' ? getBestPrice(form.side) : form.price;
      
      await createOrder({
        symbol,
        side: form.side,
        type: form.type,
        price,
        amount: form.amount,
        stopPrice: form.stopPrice || undefined,
      });

      // 重置表单
      setForm((prev) => ({
        ...prev,
        amount: '',
        total: '',
        percentageUsed: 0,
      }));
    } catch (error) {
      console.error('Order creation failed:', error);
    } finally {
      setSubmitting(false);
    }
  }, [form, submitting, setSubmitting, setForm, createOrder, symbol, getBestPrice]);

  // 表单验证
  const isMarketOrder = form.type === 'market';
  const isStopLimit = form.type === 'stop_limit';
  
  const validation = {
    isValid: 
      (isMarketOrder || !!form.price) && 
      !!form.amount && 
      parseFloat(form.amount) > 0 &&
      (!isStopLimit || !!form.stopPrice),
    errors: {
      price: !isMarketOrder && !form.price ? '请输入价格' : null,
      amount: !form.amount ? '请输入数量' : parseFloat(form.amount) <= 0 ? '数量必须大于0' : null,
      stopPrice: isStopLimit && !form.stopPrice ? '请输入止损价' : null,
    },
  };

  return {
    form,
    balance,
    submitting,
    validation,
    setSide,
    setType,
    setPrice,
    setAmount,
    setTotal,
    setStopPrice,
    setPercentage,
    submitOrder,
    getBestPrice,
  };
}
