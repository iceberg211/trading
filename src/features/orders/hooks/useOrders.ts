import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  openOrdersAtom,
  orderHistoryAtom,
  tradeHistoryAtom,
  ordersLoadingAtom,
  Order,
  Trade,
  OrderSide,
  OrderType,
} from '../atoms/orderAtom';

interface CreateOrderParams {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: string;
  amount: string;
  stopPrice?: string;
}

/**
 * 订单操作 Hook
 * 提供创建订单、撤单、模拟成交等功能
 */
export function useOrders() {
  const [openOrders, setOpenOrders] = useAtom(openOrdersAtom);
  const [orderHistory, setOrderHistory] = useAtom(orderHistoryAtom);
  const setTradeHistory = useSetAtom(tradeHistoryAtom);
  const [loading, setLoading] = useAtom(ordersLoadingAtom);

  // 创建订单
  const createOrder = useCallback(
    async (params: CreateOrderParams): Promise<Order> => {
      setLoading(true);

      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      const now = Date.now();
      const total = (parseFloat(params.price) * parseFloat(params.amount)).toFixed(2);

      const newOrder: Order = {
        id: `ORD_${now}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: params.symbol,
        side: params.side,
        type: params.type,
        price: params.price,
        amount: params.amount,
        filled: '0',
        remaining: params.amount,
        total,
        stopPrice: params.stopPrice,
        time: now,
        updateTime: now,
        status: params.type === 'market' ? 'filled' : 'pending',
      };

      // 市价单立即成交
      if (params.type === 'market') {
        newOrder.filled = params.amount;
        newOrder.remaining = '0';
        newOrder.avgPrice = params.price;
        
        // 添加到历史订单
        setOrderHistory((prev) => [newOrder, ...prev]);

        // 创建成交记录
        const trade: Trade = {
          id: `TRD_${now}`,
          orderId: newOrder.id,
          symbol: params.symbol,
          side: params.side,
          price: params.price,
          amount: params.amount,
          total,
          fee: (parseFloat(total) * 0.001).toFixed(4), // 0.1% 手续费
          feeAsset: 'USDT',
          time: now,
        };
        setTradeHistory((prev) => [trade, ...prev]);
      } else {
        // 限价单挂单
        setOpenOrders((prev) => [newOrder, ...prev]);
      }

      setLoading(false);
      return newOrder;
    },
    [setOpenOrders, setOrderHistory, setTradeHistory, setLoading]
  );

  // 撤销单个订单
  const cancelOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      setLoading(true);

      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 300));

      const order = openOrders.find((o) => o.id === orderId);
      if (!order) {
        setLoading(false);
        return false;
      }

      // 从当前挂单移除
      setOpenOrders((prev) => prev.filter((o) => o.id !== orderId));

      // 添加到历史订单（状态为 canceled）
      const canceledOrder: Order = {
        ...order,
        status: 'canceled',
        updateTime: Date.now(),
      };
      setOrderHistory((prev) => [canceledOrder, ...prev]);

      setLoading(false);
      return true;
    },
    [openOrders, setOpenOrders, setOrderHistory, setLoading]
  );

  // 撤销所有挂单
  const cancelAllOrders = useCallback(async (): Promise<number> => {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const count = openOrders.length;
    const now = Date.now();

    // 将所有挂单移到历史
    const canceledOrders: Order[] = openOrders.map((order) => ({
      ...order,
      status: 'canceled' as const,
      updateTime: now,
    }));

    setOrderHistory((prev) => [...canceledOrders, ...prev]);
    setOpenOrders([]);

    setLoading(false);
    return count;
  }, [openOrders, setOpenOrders, setOrderHistory, setLoading]);

  // 模拟订单成交（用于测试）
  const simulateFill = useCallback(
    async (orderId: string, fillAmount?: string): Promise<boolean> => {
      const order = openOrders.find((o) => o.id === orderId);
      if (!order) return false;

      const now = Date.now();
      const amount = fillAmount || order.remaining;
      const remaining = (parseFloat(order.remaining) - parseFloat(amount)).toFixed(8);
      const filled = (parseFloat(order.filled) + parseFloat(amount)).toFixed(8);
      const isFully = parseFloat(remaining) <= 0;

      // 创建成交记录
      const trade: Trade = {
        id: `TRD_${now}`,
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        price: order.price,
        amount,
        total: (parseFloat(order.price) * parseFloat(amount)).toFixed(2),
        fee: (parseFloat(order.price) * parseFloat(amount) * 0.001).toFixed(4),
        feeAsset: 'USDT',
        time: now,
      };
      setTradeHistory((prev) => [trade, ...prev]);

      if (isFully) {
        // 完全成交
        setOpenOrders((prev) => prev.filter((o) => o.id !== orderId));
        setOrderHistory((prev) => [
          { ...order, filled, remaining: '0', status: 'filled', updateTime: now, avgPrice: order.price },
          ...prev,
        ]);
      } else {
        // 部分成交
        setOpenOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, filled, remaining, status: 'partial', updateTime: now } : o
          )
        );
      }

      return true;
    },
    [openOrders, setOpenOrders, setOrderHistory, setTradeHistory]
  );

  return {
    openOrders,
    orderHistory,
    loading,
    createOrder,
    cancelOrder,
    cancelAllOrders,
    simulateFill,
  };
}
