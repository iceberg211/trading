import { useEffect, useRef, useCallback, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { symbolAtom } from '@/features/chart/atoms/klineAtom';
import {
  orderBookAtom,
  orderBookLoadingAtom,
  orderBookErrorAtom,
  orderBookSyncStatusAtom,
  orderBookGapCountAtom,
} from '../atoms/orderBookAtom';
import { binanceApi } from '@/services/api/binance';
import { marketDataHub } from '@/core/gateway';
import { useOrderBookWorker } from '@/hooks/useOrderBookWorker';

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
const ORDER_BOOK_LIMIT = 500;

/**
 * 订单簿数据管理 Hook
 * 使用 MarketDataHub 统一订阅层 + Worker 进行后台处理
 */
export function useOrderBook() {
  const symbol = useAtomValue(symbolAtom);
  const [orderBook, setOrderBook] = useAtom(orderBookAtom);
  const [loading, setLoading] = useAtom(orderBookLoadingAtom);
  const [error, setError] = useAtom(orderBookErrorAtom);
  const [syncStatus, setSyncStatus] = useAtom(orderBookSyncStatusAtom);
  const setGapCount = useSetAtom(orderBookGapCountAtom);
  
  // Worker hook
  const { mergeDepth: workerMerge } = useOrderBookWorker();
  
  // 性能监控
  const [avgProcessingTime, setAvgProcessingTime] = useState(0);
  const processingTimesRef = useRef<number[]>([]);

  const bufferRef = useRef<OrderBookUpdate[]>([]);
  const lastUpdateIdRef = useRef<number>(0);
  const gapRetryCountRef = useRef<number>(0);
  const lastGapTimeRef = useRef<number>(0);
  const orderBookRef = useRef(orderBook);
  const pendingUpdateRef = useRef(false);

  // 保持 orderBook 引用同步
  useEffect(() => {
    orderBookRef.current = orderBook;
  }, [orderBook]);

  const resetState = useCallback(() => {
    setOrderBook({ lastUpdateId: 0, bids: [], asks: [] });
    setSyncStatus('uninitialized');
    bufferRef.current = [];
    lastUpdateIdRef.current = 0;
    gapRetryCountRef.current = 0;
    processingTimesRef.current = [];
    setAvgProcessingTime(0);
  }, [setOrderBook, setSyncStatus]);

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
        bids: snapshot.bids.slice(0, ORDER_BOOK_LIMIT),
        asks: snapshot.asks.slice(0, ORDER_BOOK_LIMIT),
      });
      setSyncStatus('synchronized');
      console.log('[OrderBook] Recovery successful, lastUpdateId:', snapshot.lastUpdateId);
    } catch (err) {
      console.error('[OrderBook] Recovery failed:', err);
      setSyncStatus('gap_detected');
    }
  }, [symbol, setOrderBook, setSyncStatus, setError, setGapCount]);

  const handleWsMessage = useCallback(
    async (eventData: any) => {
      const data: OrderBookUpdate = eventData;

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
      const expectedU = lastUpdateIdRef.current + 1;
      if (data.U > expectedU) {
        console.warn(`[OrderBook] Gap detected: expected U=${expectedU}, got U=${data.U}`);
        setSyncStatus('gap_detected');
        recoverFromGap();
        return;
      }

      // 防止并发更新
      if (pendingUpdateRef.current) {
        bufferRef.current.push(data);
        return;
      }

      pendingUpdateRef.current = true;

      try {
        // 使用 Worker 进行后台合并
        const result = await workerMerge(
          orderBookRef.current.bids,
          orderBookRef.current.asks,
          data.b,
          data.a,
          ORDER_BOOK_LIMIT
        );

        // 记录处理时间
        if (result.processingTime) {
          processingTimesRef.current.push(result.processingTime);
          if (processingTimesRef.current.length > 100) {
            processingTimesRef.current.shift();
          }
          const avg = processingTimesRef.current.reduce((a, b) => a + b, 0) / processingTimesRef.current.length;
          setAvgProcessingTime(avg);
        }

        lastUpdateIdRef.current = data.u;
        
        setOrderBook({
          lastUpdateId: data.u,
          bids: result.bids,
          asks: result.asks,
        });

        // 成功更新后重置重试计数
        if (gapRetryCountRef.current > 0) {
          gapRetryCountRef.current = 0;
          setGapCount(0);
        }
      } finally {
        pendingUpdateRef.current = false;

        // 处理缓冲区中积压的更新
        if (bufferRef.current.length > 0) {
          const nextUpdate = bufferRef.current.shift();
          if (nextUpdate) {
            handleWsMessage(nextUpdate);
          }
        }
      }
    },
    [workerMerge, setOrderBook, setSyncStatus, recoverFromGap, setGapCount]
  );

  useEffect(() => {
    resetState();
    setLoading(true);
    setSyncStatus('syncing');

    // 通过 MarketDataHub 订阅
    const unsubscribe = marketDataHub.subscribe('depth', symbol);
    const unregister = marketDataHub.onMessage('depth', handleWsMessage);

    const initOrderBook = async () => {
      try {
        const snapshot = await binanceApi.getOrderBook(symbol, 1000);
        
        // 处理缓冲区中的有效更新
        const validUpdates = bufferRef.current.filter(
          (u) => u.u > snapshot.lastUpdateId
        );

        let lastId = snapshot.lastUpdateId;
        let currentBids = snapshot.bids.slice(0, ORDER_BOOK_LIMIT);
        let currentAsks = snapshot.asks.slice(0, ORDER_BOOK_LIMIT);

        // 应用有效的增量更新（使用 Worker）
        for (const update of validUpdates) {
          if (update.U <= lastId + 1 && update.u >= lastId + 1) {
            const result = await workerMerge(
              currentBids,
              currentAsks,
              update.b,
              update.a,
              ORDER_BOOK_LIMIT
            );
            currentBids = result.bids;
            currentAsks = result.asks;
            lastId = update.u;
          } else if (update.U === lastId + 1) {
            const result = await workerMerge(
              currentBids,
              currentAsks,
              update.b,
              update.a,
              ORDER_BOOK_LIMIT
            );
            currentBids = result.bids;
            currentAsks = result.asks;
            lastId = update.u;
          }
        }

        lastUpdateIdRef.current = lastId;
        setOrderBook({
          lastUpdateId: lastId,
          bids: currentBids,
          asks: currentAsks,
        });

        bufferRef.current = [];
        setLoading(false);
        setSyncStatus('synchronized');
        console.log('[OrderBook] Initialized with Worker, lastUpdateId:', lastId);
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
      unregister();
      resetState();
    };
  }, [symbol, handleWsMessage, workerMerge, resetState, setOrderBook, setLoading, setError, setSyncStatus]);

  return {
    orderBook,
    loading,
    error,
    syncStatus,
    avgProcessingTime, // 新增：平均处理时间（ms）
  };
}
