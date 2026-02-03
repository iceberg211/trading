import { useEffect, useRef, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { symbolAtom } from '@/features/chart/atoms/klineAtom';
import {
  orderBookAtom,
  initialOrderBookState,
  orderBookLoadingAtom,
  orderBookErrorAtom,
  orderBookSyncStatusAtom,
  orderBookGapCountAtom,
  orderBookBufferSizeAtom,
  orderBookLastGapAtom,
} from '../atoms/orderBookAtom';
import { binanceApi } from '@/services/api/binance';
import { marketDataHub } from '@/core/gateway';
import { useOrderBookEngine } from '@/hooks/useOrderBookEngine';
import type { HubWsStatus } from '@/workers/orderbookEngine.types';

/**
 * 订单簿数据管理 Hook
 *
 * 目标：
 * - WebSocket 连接统一由 MarketDataHub 管理（单 WS）
 * - Worker 仅负责订单簿协议与计算（快照+增量对齐、gap 检测、节流输出）
 */
export function useOrderBook() {
  const symbol = useAtomValue(symbolAtom);
  const [orderBook, setOrderBook] = useAtom(orderBookAtom);
  const [loading, setLoading] = useAtom(orderBookLoadingAtom);
  const [error, setError] = useAtom(orderBookErrorAtom);
  const [syncStatus, setSyncStatus] = useAtom(orderBookSyncStatusAtom);
  const setGapCount = useSetAtom(orderBookGapCountAtom);
  const setBufferSize = useSetAtom(orderBookBufferSizeAtom);
  const setLastGap = useSetAtom(orderBookLastGapAtom);
  
  const { api: engine } = useOrderBookEngine();
  const engineRef = useRef(engine);
  engineRef.current = engine;
  
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRequestIdRef = useRef(0);
  const latestSymbolRef = useRef(symbol);
  const prevWsStatusRef = useRef<HubWsStatus>('disconnected');

  useEffect(() => {
    latestSymbolRef.current = symbol;
    // invalidate previous snapshot requests on symbol change
    loadRequestIdRef.current += 1;
  }, [symbol]);

  // 获取快照并初始化 Worker
  const initOrderBook = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    try {
      console.log('[OrderBook] Fetching snapshot for', symbol);
      setSyncStatus('syncing');
      const snapshot = await binanceApi.getOrderBook(symbol, 1000);

      // ignore stale snapshot
      if (requestId !== loadRequestIdRef.current) return;
      if (latestSymbolRef.current !== symbol) return;
      
      engineRef.current.initSnapshot({
        symbol,
        lastUpdateId: snapshot.lastUpdateId,
        bids: snapshot.bids,
        asks: snapshot.asks,
      });
      
      console.log('[OrderBook] Snapshot sent to worker, lastUpdateId:', snapshot.lastUpdateId);
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error('[OrderBook] Snapshot failed', err);
      setError('初始化订单簿失败');
      setSyncStatus('uninitialized');
      setLoading(false);
    }
  }, [symbol, setError, setSyncStatus, setLoading]);

  useEffect(() => {
    setLoading(true);
    setSyncStatus('syncing');
    setError(null);
    setOrderBook(initialOrderBookState);
    setBufferSize(0);
    setLastGap(null);

    // 1. 注册回调
    engine.registerCallbacks({
      onUpdate: (data) => {
        setOrderBook({
          lastUpdateId: data.lastUpdateId,
          bids: data.bids,
          asks: data.asks,
        });

        setBufferSize(data.bufferSize);

        // map engine status to UI status
        if (data.syncStatus === 'synchronized') {
          setSyncStatus('synchronized');
        } else if (data.syncStatus === 'gap_detected') {
          setSyncStatus('gap_detected');
        } else if (data.syncStatus === 'uninitialized') {
          setSyncStatus('uninitialized');
        } else {
          // buffering / syncing
          setSyncStatus('syncing');
        }
        setLoading(false);
      },
      onStatus: (status) => {
        setBufferSize(status.bufferSize);
      },
      onGapDetected: (gap) => {
        setSyncStatus('gap_detected');
        setGapCount(c => c + 1);
        setLastGap({
          expected: gap.expected,
          got: gap.got,
          lastUpdateId: gap.lastUpdateId,
          time: Date.now(),
        });

        // debounce snapshot reload
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          initOrderBook();
        }, 300);
      },
    });

    // 2. 设置 symbol 并订阅 WS（由 MarketDataHub 管理连接）
    engine.setSymbol(symbol);

    const unsubscribe = marketDataHub.subscribe('depth', symbol);
    const unregister = marketDataHub.onMessage('depth', (msg: any) => {
      if (!msg || msg.e !== 'depthUpdate') return;

      const msgSymbol = (msg.s || '').toUpperCase();
      if (!msgSymbol || msgSymbol !== symbol.toUpperCase()) return;

      engine.pushDelta({
        symbol: msgSymbol,
        U: msg.U,
        u: msg.u,
        b: msg.b,
        a: msg.a,
        eventTime: msg.E,
      });
    });

    const unregisterStatus = marketDataHub.onStatusChange((status) => {
      engine.setWsStatus(status as HubWsStatus);

      const prev = prevWsStatusRef.current;
      prevWsStatusRef.current = status as HubWsStatus;

      // When the hub disconnects, show reconnecting.
      if (status === 'disconnected' || status === 'reconnecting') {
        setSyncStatus('gap_detected');
      }

      // On reconnect, re-sync from a fresh snapshot.
      const wasDisconnected = prev === 'disconnected' || prev === 'reconnecting';
      const isNowConnected = status === 'connected';
      if (wasDisconnected && isNowConnected) {
        initOrderBook();
      }
    });

    // 3. 获取快照
    initOrderBook();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      unsubscribe();
      unregister();
      unregisterStatus();
    };
  }, [symbol, initOrderBook, setOrderBook, setLoading, setSyncStatus, setError, setGapCount, setBufferSize, setLastGap, engine]);

  return {
    orderBook,
    loading,
    error,
    syncStatus,
  };
}
