import { useEffect, useRef, useCallback } from 'react';
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
import { useTradingEngine } from '@/hooks/useTradingEngine';

/**
 * 订单簿数据管理 Hook (Refactored for Web Worker)
 * 逻辑已迁移至 src/workers/tradingEngine.worker.ts
 */
export function useOrderBook() {
  const symbol = useAtomValue(symbolAtom);
  const [orderBook, setOrderBook] = useAtom(orderBookAtom);
  const [loading, setLoading] = useAtom(orderBookLoadingAtom);
  const [error, setError] = useAtom(orderBookErrorAtom);
  const [syncStatus, setSyncStatus] = useAtom(orderBookSyncStatusAtom);
  const setGapCount = useSetAtom(orderBookGapCountAtom);
  
  // 使用新的 Trading Engine Hook
  const engine = useTradingEngine();
  const engineRef = useRef(engine);
  engineRef.current = engine;
  
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 获取快照并初始化 Worker
  const initOrderBook = useCallback(async () => {
    try {
      console.log('[OrderBook] Fetching snapshot for', symbol);
      const snapshot = await binanceApi.getOrderBook(symbol, 1000);
      
      engineRef.current.initSnapshot({
        lastUpdateId: snapshot.lastUpdateId,
        bids: snapshot.bids,
        asks: snapshot.asks,
      });
      
      console.log('[OrderBook] Snapshot sent to worker, lastUpdateId:', snapshot.lastUpdateId);
    } catch (err) {
      console.error('[OrderBook] Snapshot failed', err);
      setError('初始化订单簿失败');
      setSyncStatus('uninitialized');
      setLoading(false);
    }
  }, [symbol, setError, setSyncStatus, setLoading]);

  useEffect(() => {
    // Wait for engine to be ready
    if (!engine.isReady) {
      console.log('[OrderBook] Waiting for engine to be ready...');
      return;
    }

    setLoading(true);
    setSyncStatus('syncing');
    setError(null);

    // 1. 注册回调
    engine.registerCallbacks({
      onOrderBookUpdate: (data) => {
        setOrderBook({
          lastUpdateId: data.lastUpdateId,
          bids: data.bids,
          asks: data.asks,
        });
        setSyncStatus('synchronized');
        setLoading(false);
      },
      onStatusChange: (status) => {
        console.log('[OrderBook] Worker Status:', status);
        if (status === 'disconnected') {
           setSyncStatus('gap_detected');
        }
      },
      onGapDetected: () => {
        setSyncStatus('gap_detected');
        setGapCount(c => c + 1);
        // Worker automatically stops syncing. We need to re-init.
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          initOrderBook();
        }, 1000);
      }
    });

    // 2. 连接 & 订阅
    engine.connect('wss://stream.binance.com:9443/ws');
    engine.subscribe(symbol);

    // 3. 获取快照
    initOrderBook();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [symbol, engine.isReady, initOrderBook, setOrderBook, setLoading, setSyncStatus, setError, setGapCount, engine]);

  return {
    orderBook,
    loading,
    error,
    syncStatus,
  };
}
