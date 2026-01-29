/**
 * 交易服务 Hook
 * 统一管理下单、取消、查询等交易操作
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { orderBookAtom } from '@/features/orderbook/atoms/orderBookAtom';
import { symbolConfigAtom } from '@/features/symbol/atoms/symbolAtom';
import { tickerAtom } from '@/features/ticker/atoms/tickerAtom';
import { matchingEngine } from '@/domain/trading/engine';
import { 
  lockBalanceAtom, 
  unlockBalanceAtom, 
  executeTradeAtom,
  availableBalancesAtom,
} from '@/domain/account';
import type { NewOrderRequest, Order, OrderResponse, OrderSide, OrderType } from '@/domain/trading/types';
import Decimal from 'decimal.js';

/**
 * 交易服务返回类型
 */
interface TradingServiceReturn {
  // 下单
  submitOrder: (params: SubmitOrderParams) => OrderResponse;
  // 取消订单
  cancelOrder: (orderId: number) => OrderResponse;
  // 查询
  getActiveOrders: () => Order[];
  getOrderHistory: () => Order[];
  // 余额
  availableBalances: Record<string, string>;
  // 当前交易对信息
  currentSymbol: string;
  baseAsset: string;
  quoteAsset: string;
  // 当前价格
  currentPrice: string;
}

/**
 * 下单参数
 */
interface SubmitOrderParams {
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;
  stopPrice?: string;
}

/**
 * 交易服务 Hook
 */
export function useTradingService(): TradingServiceReturn {
  const orderBook = useAtomValue(orderBookAtom);
  const symbolConfig = useAtomValue(symbolConfigAtom);
  const ticker = useAtomValue(tickerAtom);
  const availableBalances = useAtomValue(availableBalancesAtom);
  
  const lockBalance = useSetAtom(lockBalanceAtom);
  const unlockBalance = useSetAtom(unlockBalanceAtom);
  const executeTrade = useSetAtom(executeTradeAtom);

  const currentPrice = ticker?.lastPrice || '0';
  
  // 防止止损检查重复触发
  const lastCheckPriceRef = useRef<string>('');

  /**
   * 止损单触发检查
   * 在价格变化时自动检查是否有止损单需要触发
   */
  useEffect(() => {
    // 跳过无效价格
    if (!currentPrice || currentPrice === '0') return;
    
    // 跳过相同价格
    if (currentPrice === lastCheckPriceRef.current) return;
    lastCheckPriceRef.current = currentPrice;

    // 获取订单簿数据
    const orderBookData = {
      bids: orderBook.bids,
      asks: orderBook.asks,
    };

    // 检查止损单
    const triggeredOrders = matchingEngine.checkStopOrders(currentPrice, orderBookData);

    // 处理触发的止损单成交
    if (triggeredOrders.length > 0) {
      for (const order of triggeredOrders) {
        console.log(`[TradingService] Stop order triggered:`, order.orderId, order.status);
        
        // 处理成交
        if (order.fills && order.fills.length > 0) {
          for (const fill of order.fills) {
            executeTrade({
              baseAsset: symbolConfig.baseAsset,
              quoteAsset: symbolConfig.quoteAsset,
              side: order.side,
              baseAmount: fill.quantity,
              quoteAmount: new Decimal(fill.quantity).times(new Decimal(fill.price)).toFixed(8),
              commission: fill.commission,
              commissionAsset: fill.commissionAsset,
            });
          }
        }
      }
    }
  }, [currentPrice, orderBook, symbolConfig, executeTrade]);

  /**
   * 提交订单
   */
  const submitOrder = useCallback((params: SubmitOrderParams): OrderResponse => {
    const { side, type, quantity, price, stopPrice } = params;
    
    // 构造订单请求
    const request: NewOrderRequest = {
      symbol: symbolConfig.symbol,
      side,
      type,
      quantity,
      price,
      stopPrice,
      timeInForce: type === 'MARKET' ? 'IOC' : 'GTC',
    };

    // 计算需要冻结的资产和金额
    let lockAsset: string;
    let lockAmount: string;

    if (side === 'BUY') {
      // 买入：冻结报价资产
      lockAsset = symbolConfig.quoteAsset;
      const qty = new Decimal(quantity);
      const orderPrice = price ? new Decimal(price) : new Decimal(currentPrice);
      lockAmount = qty.times(orderPrice).times(1.001).toFixed(8); // 多冻结 0.1% 作为手续费预留
    } else {
      // 卖出：冻结基础资产
      lockAsset = symbolConfig.baseAsset;
      lockAmount = quantity;
    }

    // 检查并冻结余额
    const currentBalance = availableBalances[lockAsset] || '0';
    if (new Decimal(lockAmount).gt(new Decimal(currentBalance))) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: `${lockAsset} 余额不足`,
          reason: 'INSUFFICIENT_BALANCE',
        },
      };
    }

    // 冻结余额
    lockBalance({ asset: lockAsset, amount: lockAmount });

    // 执行撮合
    const orderBookData = {
      bids: orderBook.bids,
      asks: orderBook.asks,
    };

    const response = matchingEngine.submitOrder(request, orderBookData, currentBalance);

    if (!response.success || !response.order) {
      // 失败：解冻余额
      unlockBalance({ asset: lockAsset, amount: lockAmount });
      return response;
    }

    const order = response.order;

    // 处理成交
    if (order.fills.length > 0) {
      for (const fill of order.fills) {
        executeTrade({
          baseAsset: symbolConfig.baseAsset,
          quoteAsset: symbolConfig.quoteAsset,
          side,
          baseAmount: fill.quantity,
          quoteAmount: new Decimal(fill.quantity).times(new Decimal(fill.price)).toFixed(8),
          commission: fill.commission,
          commissionAsset: fill.commissionAsset,
        });
      }
    }

    // 如果订单完全成交或被拒绝，解冻剩余
    if (order.status === 'FILLED' || order.status === 'REJECTED' || order.status === 'CANCELED') {
      // 计算未使用的冻结金额
      const usedAmount = side === 'BUY'
        ? order.cummulativeQuoteQty
        : order.executedQty;
      const remainingLock = new Decimal(lockAmount).minus(new Decimal(usedAmount));
      
      if (remainingLock.gt(0)) {
        unlockBalance({ asset: lockAsset, amount: remainingLock.toFixed(8) });
      }
    }

    console.log(`[TradingService] Order submitted:`, order);
    return response;
  }, [symbolConfig, orderBook, availableBalances, currentPrice, lockBalance, unlockBalance, executeTrade]);

  /**
   * 取消订单
   */
  const cancelOrder = useCallback((orderId: number): OrderResponse => {
    const order = matchingEngine.getOrder(orderId);
    
    if (!order) {
      return {
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `订单 ${orderId} 不存在`,
        },
      };
    }

    const response = matchingEngine.cancelOrder(orderId);

    if (response.success && response.order) {
      // 解冻未成交部分
      const remainingQty = new Decimal(order.origQty).minus(new Decimal(order.executedQty));
      
      if (remainingQty.gt(0)) {
        if (order.side === 'BUY') {
          const refundAmount = remainingQty.times(new Decimal(order.price)).toFixed(8);
          unlockBalance({ asset: symbolConfig.quoteAsset, amount: refundAmount });
        } else {
          unlockBalance({ asset: symbolConfig.baseAsset, amount: remainingQty.toFixed(8) });
        }
      }
    }

    return response;
  }, [symbolConfig, unlockBalance]);

  /**
   * 获取活跃订单
   */
  const getActiveOrders = useCallback(() => {
    return matchingEngine.getActiveOrders();
  }, []);

  /**
   * 获取订单历史
   */
  const getOrderHistory = useCallback(() => {
    return matchingEngine.getOrderHistory();
  }, []);

  return {
    submitOrder,
    cancelOrder,
    getActiveOrders,
    getOrderHistory,
    availableBalances,
    currentSymbol: symbolConfig.symbol,
    baseAsset: symbolConfig.baseAsset,
    quoteAsset: symbolConfig.quoteAsset,
    currentPrice,
  };
}
