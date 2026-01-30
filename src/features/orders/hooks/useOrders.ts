import { useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import Decimal from 'decimal.js';
import { ordersLoadingAtom } from '../atoms/orderAtom';
import { useTradingService } from '@/domain/trading';
import type { Order as DomainOrder, OrderResponse } from '@/domain/trading/types';

// 兼容旧的 Order 接口
interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market' | 'stop_limit';
  price: string;
  amount: string;
  filled: string;
  remaining: string;
  total: string;
  stopPrice?: string;
  avgPrice?: string;
  time: number;
  updateTime: number;
  status: 'pending' | 'partial' | 'filled' | 'canceled';
}

// 将 domain 订单转换为 UI 订单格式
function convertOrder(domainOrder: DomainOrder): Order {
  const side = domainOrder.side === 'BUY' ? 'buy' : 'sell';
  const type = domainOrder.type === 'LIMIT' ? 'limit' 
    : domainOrder.type === 'MARKET' ? 'market' 
    : 'stop_limit';
  
  const statusMap: Record<string, Order['status']> = {
    'NEW': 'pending',
    'PARTIALLY_FILLED': 'partial',
    'FILLED': 'filled',
    'CANCELED': 'canceled',
    'REJECTED': 'canceled',
    'EXPIRED': 'canceled',
  };

  const filled = domainOrder.executedQty;
  const remaining = new Decimal(domainOrder.origQty).minus(filled).toString();
  const total = new Decimal(domainOrder.price).times(domainOrder.origQty).toString();

  return {
    id: String(domainOrder.orderId),
    symbol: domainOrder.symbol,
    side,
    type,
    price: domainOrder.price,
    amount: domainOrder.origQty,
    filled,
    remaining,
    total,
    stopPrice: domainOrder.stopPrice,
    avgPrice: domainOrder.avgPrice,
    time: domainOrder.time,
    updateTime: domainOrder.updateTime,
    status: statusMap[domainOrder.status] || 'pending',
  };
}

/**
 * 订单操作 Hook - 使用 useTradingService
 * 提供创建订单、撤单等功能
 */
export function useOrders() {
  const [loading, setLoading] = useAtom(ordersLoadingAtom);
  const tradingService = useTradingService();

  // 从 MatchingEngine 获取订单
  const openOrders = useMemo(() => {
    return tradingService.getActiveOrders().map(convertOrder);
  }, [tradingService]);

  const orderHistory = useMemo(() => {
    return tradingService.getOrderHistory().map(convertOrder);
  }, [tradingService]);

  // 从历史订单的 fills 中提取成交记录
  const tradeHistory = useMemo(() => {
    const trades: Array<{
      id: string;
      symbol: string;
      side: 'buy' | 'sell';
      price: string;
      amount: string;
      total: string;
      fee: string;
      feeAsset: string;
      time: number;
    }> = [];

    const allOrders = tradingService.getOrderHistory();
    for (const order of allOrders) {
      if (order.fills && order.fills.length > 0) {
        for (const fill of order.fills) {
          trades.push({
            id: String(fill.tradeId),
            symbol: order.symbol,
            side: order.side === 'BUY' ? 'buy' : 'sell',
            price: fill.price,
            amount: fill.quantity,
            total: new Decimal(fill.price).times(fill.quantity).toString(),
            fee: fill.commission,
            feeAsset: fill.commissionAsset,
            time: fill.time,
          });
        }
      }
    }

    // 按时间倒序排列
    return trades.sort((a, b) => b.time - a.time);
  }, [tradingService]);

  // 创建订单 - 代理到 useTradingService
  const createOrder = useCallback(
    async (params: {
      symbol: string;
      side: 'buy' | 'sell';
      type: 'limit' | 'market' | 'stop_limit';
      price: string;
      amount: string;
      stopPrice?: string;
    }): Promise<Order> => {
      setLoading(true);

      try {
        // 转换格式
        const orderSide = params.side === 'buy' ? 'BUY' : 'SELL';
        const orderType = params.type === 'limit' ? 'LIMIT' 
          : params.type === 'market' ? 'MARKET' 
          : 'STOP_LIMIT';

        const response: OrderResponse = tradingService.submitOrder({
          side: orderSide,
          type: orderType,
          quantity: params.amount,
          price: params.price || undefined,
          stopPrice: params.stopPrice || undefined,
        });

        if (response.success && response.order) {
          return convertOrder(response.order);
        }

        // 失败时返回一个带错误状态的订单
        throw new Error(response.error?.message || '创建订单失败');
      } finally {
        setLoading(false);
      }
    },
    [tradingService, setLoading]
  );

  // 撤销单个订单
  const cancelOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      setLoading(true);

      try {
        const response = tradingService.cancelOrder(Number(orderId));
        return response.success;
      } finally {
        setLoading(false);
      }
    },
    [tradingService, setLoading]
  );

  // 撤销所有挂单
  const cancelAllOrders = useCallback(async (): Promise<number> => {
    setLoading(true);

    try {
      const orders = tradingService.getActiveOrders();
      let count = 0;

      for (const order of orders) {
        const response = tradingService.cancelOrder(order.orderId);
        if (response.success) count++;
      }

      return count;
    } finally {
      setLoading(false);
    }
  }, [tradingService, setLoading]);

  // 模拟订单成交（保留接口，但不再使用独立的模拟逻辑）
  const simulateFill = useCallback(
    async (_orderId: string, _fillAmount?: string): Promise<boolean> => {
      // MatchingEngine 自动处理成交，此方法仅为接口兼容
      console.warn('[useOrders] simulateFill is deprecated, use MatchingEngine auto-matching');
      return false;
    },
    []
  );

  return {
    openOrders,
    orderHistory,
    tradeHistory,
    loading,
    createOrder,
    cancelOrder,
    cancelAllOrders,
    simulateFill,
  };
}
