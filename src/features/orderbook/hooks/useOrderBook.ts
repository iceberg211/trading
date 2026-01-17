import { useEffect, useRef, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { symbolAtom } from '@/features/chart/atoms/klineAtom';
import {
  orderBookAtom,
  orderBookLoadingAtom,
  orderBookErrorAtom,
  orderBookSyncStatusAtom,
  orderBookGapCountAtom,
  OrderBookSyncStatus,
} from '../atoms/orderBookAtom';
import { binanceApi } from '@/services/api/binance';
import { WebSocketManager } from '@/services/websocket/manager';
import Decimal from 'decimal.js';

type OrderBookUpdate = {
  e: string;
  E: number;
  s: string;
  U: number; // First update ID in event
  u: number; // Final update ID in event
  b: [string, string][];
  a: [string, string][];
};

// Gap 检测阈值
const MAX_GAP_RETRIES = 3;
const GAP_DEBOUNCE_MS = 2000;

export function useOrderBook() {
  const symbol = useAtomValue(symbolAtom);
  const [orderBook, setOrderBook] = useAtom(orderBookAtom);
  const [loading, setLoading] = useAtom(orderBookLoadingAtom);
  const [error, setError] = useAtom(orderBookErrorAtom);
  const [syncStatus, setSyncStatus] = useAtom(orderBookSyncStatusAtom);
  const setGapCount = useSetAtom(orderBookGapCountAtom);

  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const bufferRef = useRef<OrderBookUpdate[]>([]);
  const lastUpdateIdRef = useRef<number>(0);
  const gapRetryCountRef = useRef<number>(0);
  const lastGapTimeRef = useRef<number>(0);

  const resetState = useCallback(() => {
    setOrderBook({ lastUpdateId: 0, bids: [], asks: [] });
    setSyncStatus('uninitialized');
    bufferRef.current = [];
    lastUpdateIdRef.current = 0;
    gapRetryCountRef.current = 0;
  }, [setOrderBook, setSyncStatus]);

  const mergeDepth = useCallback(
    (
      currentList: [string, string][],
      updates: [string, string][],
      isBids: boolean
    ) => {
      const map = new Map<string, string>();
      currentList.forEach(([price, qty]) => map.set(price, qty));

      updates.forEach(([price, qty]) => {
        const q = parseFloat(qty);
        if (q === 0) {
          map.delete(price);
        } else {
          map.set(price, qty);
        }
      });

      return Array.from(map.entries()).sort((a, b) => {
        const priceA = new Decimal(a[0]);
        const priceB = new Decimal(b[0]);
        return isBids
          ? priceB.minus(priceA).toNumber()
          : priceA.minus(priceB).toNumber();
      });
    },
    []
  );

  // 重新拉取快照恢复同步
  const recoverFromGap = useCallback(async () => {
    const now = Date.now();
    
    // 防抖：短时间内不重复触发
    if (now - lastGapTimeRef.current < GAP_DEBOUNCE_MS) {
      return;
    }
    lastGapTimeRef.current = now;

    // 超过最大重试次数
    if (gapRetryCountRef.current >= MAX_GAP_RETRIES) {
      console.error('Gap recovery failed: max retries exceeded');
      setError('订单簿同步失败，请刷新页面');
      return;
    }

    gapRetryCountRef.current++;
    setGapCount(gapRetryCountRef.current);
    setSyncStatus('syncing');
    console.log(`[OrderBook] Gap detected, recovering... (attempt ${gapRetryCountRef.current})`);

    try {
      const snapshot = await binanceApi.getOrderBook(symbol, 1000);
      
      // 清空缓冲区中过时的更新
      bufferRef.current = bufferRef.current.filter(u => u.u > snapshot.lastUpdateId);
      
      lastUpdateIdRef.current = snapshot.lastUpdateId;
      setOrderBook({
        lastUpdateId: snapshot.lastUpdateId,
        bids: snapshot.bids.slice(0, 500),
        asks: snapshot.asks.slice(0, 500),
      });
      setSyncStatus('synchronized');
      console.log('[OrderBook] Recovery successful, lastUpdateId:', snapshot.lastUpdateId);
    } catch (err) {
      console.error('[OrderBook] Recovery failed:', err);
      setSyncStatus('gap_detected');
    }
  }, [symbol, setOrderBook, setSyncStatus, setError, setGapCount]);

  const handleWsMessage = useCallback(
    (eventData: any) => {
      const data: OrderBookUpdate = eventData.data || eventData;

      if (data.e !== 'depthUpdate') return;

      // 初始化阶段：缓冲消息
      if (lastUpdateIdRef.current === 0) {
        bufferRef.current.push(data);
        return;
      }

      // 丢弃过时的更新
      if (data.u <= lastUpdateIdRef.current) {
        return;
      }

      // **关键：序列校验** - 检查是否有 Gap
      // 根据 Binance 文档：后续事件的 U 应该等于前一个事件的 u + 1
      const expectedU = lastUpdateIdRef.current + 1;
      if (data.U > expectedU) {
        console.warn(`[OrderBook] Gap detected: expected U=${expectedU}, got U=${data.U}`);
        setSyncStatus('gap_detected');
        recoverFromGap();
        return;
      }

      // 正常更新
      setOrderBook((prev) => {
        const newBids = mergeDepth(prev.bids, data.b, true);
        const newAsks = mergeDepth(prev.asks, data.a, false);
        const LIMIT = 500;

        lastUpdateIdRef.current = data.u;

        return {
          lastUpdateId: data.u,
          bids: newBids.slice(0, LIMIT),
          asks: newAsks.slice(0, LIMIT),
        };
      });

      // 成功更新后重置重试计数
      if (gapRetryCountRef.current > 0) {
        gapRetryCountRef.current = 0;
        setGapCount(0);
      }
    },
    [mergeDepth, setOrderBook, setSyncStatus, recoverFromGap, setGapCount]
  );

  useEffect(() => {
    resetState();
    setLoading(true);
    setSyncStatus('syncing');

    const streamName = `${symbol.toLowerCase()}@depth`;
    const wsUrl = `wss://data-stream.binance.vision/stream?streams=${streamName}`;

    const wsManager = new WebSocketManager({
      url: wsUrl,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
    });

    wsManagerRef.current = wsManager;
    const unsubscribe = wsManager.subscribe(handleWsMessage);
    wsManager.connect();

    const initOrderBook = async () => {
      try {
        const snapshot = await binanceApi.getOrderBook(symbol, 1000);
        
        // 处理缓冲区中的有效更新
        const validUpdates = bufferRef.current.filter(
          (u) => u.u > snapshot.lastUpdateId
        );

        let currentBids = snapshot.bids;
        let currentAsks = snapshot.asks;
        let lastId = snapshot.lastUpdateId;

        // 应用有效的增量更新
        for (const update of validUpdates) {
          // 第一个有效事件：U <= lastUpdateId+1 && u >= lastUpdateId+1
          if (update.U <= lastId + 1 && update.u >= lastId + 1) {
            currentBids = mergeDepth(currentBids, update.b, true);
            currentAsks = mergeDepth(currentAsks, update.a, false);
            lastId = update.u;
          } else if (update.U === lastId + 1) {
            // 后续连续事件
            currentBids = mergeDepth(currentBids, update.b, true);
            currentAsks = mergeDepth(currentAsks, update.a, false);
            lastId = update.u;
          }
        }

        lastUpdateIdRef.current = lastId;
        setOrderBook({
          lastUpdateId: lastId,
          bids: currentBids.slice(0, 500),
          asks: currentAsks.slice(0, 500),
        });

        bufferRef.current = [];
        setLoading(false);
        setSyncStatus('synchronized');
        console.log('[OrderBook] Initialized, lastUpdateId:', lastId);
      } catch (err) {
        setError('初始化订单簿失败');
        setLoading(false);
        setSyncStatus('uninitialized');
        console.error(err);
      }
    };

    initOrderBook();

    return () => {
      unsubscribe();
      wsManager.disconnect();
      resetState();
    };
  }, [symbol, handleWsMessage, mergeDepth, resetState, setOrderBook, setLoading, setError, setSyncStatus]);

  return {
    orderBook,
    loading,
    error,
    syncStatus,
  };
}
