import { useCallback, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import Decimal from 'decimal.js';
import {
  tradeFormAtom,
  orderSubmittingAtom,
  OrderSide,
  OrderType,
} from '../atoms/tradeAtom';
import { orderBookAtom } from '@/features/orderbook/atoms/orderBookAtom';
import { symbolConfigAtom } from '@/features/symbol/atoms/symbolAtom';
import { useTradingService } from '@/domain/trading';

interface OrderResult {
  success: boolean;
  message: string;
  orderId?: number;
}

export function useTradeForm() {
  const [form, setForm] = useAtom(tradeFormAtom);
  const [submitting, setSubmitting] = useAtom(orderSubmittingAtom);
  const [lastResult, setLastResult] = useState<OrderResult | null>(null);
  
  const orderBook = useAtomValue(orderBookAtom);
  const symbolConfig = useAtomValue(symbolConfigAtom);
  
  // 使用新的交易服务
  const tradingService = useTradingService();
  
  const { quantityPrecision, baseAsset, quoteAsset } = symbolConfig;

  // 从 tradingService 获取余额
  const balance = {
    [quoteAsset]: tradingService.availableBalances[quoteAsset] || '0',
    [baseAsset]: tradingService.availableBalances[baseAsset] || '0',
    // 兼容旧的接口
    USDT: tradingService.availableBalances['USDT'] || '0',
    BTC: tradingService.availableBalances['BTC'] || '0',
    ETH: tradingService.availableBalances['ETH'] || '0',
    BNB: tradingService.availableBalances['BNB'] || '0',
    SOL: tradingService.availableBalances['SOL'] || '0',
  };

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
    setLastResult(null);
  }, [setForm, getBestPrice]);

  // 切换订单类型
  const setType = useCallback((type: OrderType) => {
    setForm((prev) => ({
      ...prev,
      type,
      stopPrice: '', // 切换类型时重置止损价
    }));
    setLastResult(null);
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
        ? new Decimal(total).div(prev.price).toFixed(quantityPrecision)
        : '';
      return { ...prev, total, amount: newAmount };
    });
  }, [setForm, quantityPrecision]);

  // 百分比快捷设置
  const setPercentage = useCallback((percentage: number) => {
    setForm((prev) => {
      const availableBalance = prev.side === 'buy' 
        ? (balance[quoteAsset] || '0')
        : (balance[baseAsset] || '0');
      const maxValue = new Decimal(availableBalance);

      if (prev.side === 'buy') {
        // 买入：用 quote 余额计算
        const total = maxValue.times(percentage).div(100).toFixed(2);
        const amount = prev.price && parseFloat(prev.price) > 0
          ? new Decimal(total).div(prev.price).toFixed(quantityPrecision)
          : '';
        return { ...prev, percentageUsed: percentage, total, amount };
      } else {
        // 卖出：用 base 余额计算
        const amount = maxValue.times(percentage).div(100).toFixed(quantityPrecision);
        const total = prev.price
          ? new Decimal(prev.price).times(amount).toFixed(2)
          : '';
        return { ...prev, percentageUsed: percentage, amount, total };
      }
    });
  }, [setForm, balance, quantityPrecision, baseAsset, quoteAsset]);

  // 提交订单 - 使用 useTradingService
  const submitOrder = useCallback(async () => {
    // 市价单不需要价格，但需要数量
    const needsPrice = form.type !== 'market';
    if ((needsPrice && !form.price) || !form.amount || submitting) return;
    
    // 止损单需要止损价
    if (form.type === 'stop_limit' && !form.stopPrice) return;

    setSubmitting(true);
    setLastResult(null);

    try {
      // 获取当前市价（用于市价单）
      const price = form.type === 'market' ? getBestPrice(form.side) : form.price;
      
      // 转换 type 和 side 为大写格式
      const orderType = form.type === 'limit' ? 'LIMIT' 
        : form.type === 'market' ? 'MARKET'
        : form.type === 'stop_limit' ? 'STOP_LIMIT'
        : 'LIMIT';
      
      const orderSide = form.side === 'buy' ? 'BUY' : 'SELL';

      // 调用 useTradingService
      const response = tradingService.submitOrder({
        side: orderSide,
        type: orderType,
        quantity: form.amount,
        price: price || undefined,
        stopPrice: form.stopPrice || undefined,
      });

      if (response.success && response.order) {
        setLastResult({
          success: true,
          message: `订单已提交，状态: ${response.order.status}`,
          orderId: response.order.orderId,
        });

        // 重置表单
        setForm((prev) => ({
          ...prev,
          amount: '',
          total: '',
          percentageUsed: 0,
        }));
      } else {
        setLastResult({
          success: false,
          message: response.error?.message || '订单提交失败',
        });
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : '订单提交失败',
      });
    } finally {
      setSubmitting(false);
    }
  }, [form, submitting, setSubmitting, setForm, tradingService, getBestPrice]);

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
    lastResult,
    setSide,
    setType,
    setPrice,
    setAmount,
    setTotal,
    setStopPrice,
    setPercentage,
    submitOrder,
    getBestPrice,
    // 额外暴露交易服务的方法
    getActiveOrders: tradingService.getActiveOrders,
    getOrderHistory: tradingService.getOrderHistory,
    cancelOrder: tradingService.cancelOrder,
    baseAsset,
    quoteAsset,
  };
}
