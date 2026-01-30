import { useEffect, useRef, useCallback, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  symbolAtom,
  intervalAtom,
  klineDataAtom,
  klineLoadingAtom,
  klineErrorAtom,
  wsStatusAtom,
} from '../atoms/klineAtom';
import { binanceApi } from '@/services/api/binance';
import { marketDataHub } from '@/core/gateway';
import type { BinanceKlineWsMessage, Candle } from '@/types/binance';

const MAX_KLINES = 3000;

function trimKlines(data: Candle[]): Candle[] {
  if (data.length <= MAX_KLINES) return data;
  return data.slice(-MAX_KLINES);
}

/**
 * K 线数据管理 Hook
 * 使用 MarketDataHub 统一订阅层
 */
export function useKlineData() {
  const symbol = useAtomValue(symbolAtom);
  const interval = useAtomValue(intervalAtom);
  const [klineData, setKlineData] = useAtom(klineDataAtom);
  const [loading, setLoading] = useAtom(klineLoadingAtom);
  const [error, setError] = useAtom(klineErrorAtom);
  const [wsStatus, setWsStatus] = useAtom(wsStatusAtom);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const updateBufferRef = useRef<Candle | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const latestSymbolRef = useRef(symbol);
  const latestIntervalRef = useRef(interval);
  const loadRequestIdRef = useRef(0);
  const loadMoreRequestIdRef = useRef(0);
  
  useEffect(() => {
    latestSymbolRef.current = symbol;
    latestIntervalRef.current = interval;
    // 标记旧请求失效，避免切换交易对后覆盖新数据
    loadRequestIdRef.current += 1;
    loadMoreRequestIdRef.current += 1;
    setHasMore(true);
  }, [symbol, interval]);

  /**
   * 加载历史 K 线数据
   */
  const loadHistoricalData = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const candles = await binanceApi.getKlines(symbol, interval, 500);
      
      // 忽略过期响应
      if (requestId !== loadRequestIdRef.current) return;
      if (latestSymbolRef.current !== symbol || latestIntervalRef.current !== interval) return;
      
      setKlineData(trimKlines(candles));
      if (candles.length < 500) {
        setHasMore(false);
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [symbol, interval, setKlineData, setLoading, setError]);

  /**
   * 加载更早的历史数据（左侧翻页）
   * @returns 加载的数据条数
   */
  const loadMore = useCallback(async (): Promise<number> => {
    // 防止无效请求
    if (klineData.length === 0 || loading || loadingMore || !hasMore) return 0;

    const firstCandle = klineData[0];
    const endTime = firstCandle.time * 1000 - 1; // 毫秒，减1避免重复
    const requestId = ++loadMoreRequestIdRef.current;

    try {
      setLoadingMore(true);
      const olderCandles = await binanceApi.getKlines(symbol, interval, 200, endTime);
      
      // 忽略过期响应
      if (requestId !== loadMoreRequestIdRef.current) return 0;
      if (latestSymbolRef.current !== symbol || latestIntervalRef.current !== interval) return 0;
      
      if (olderCandles.length === 0) {
        console.log('[useKlineData] No more historical data available');
        setHasMore(false);
        return 0;
      }

      // 合并数据（去重）
      setKlineData((prev) => {
        const existingTimes = new Set(prev.map(c => c.time));
        const newCandles = olderCandles.filter(c => !existingTimes.has(c.time));
        
        if (newCandles.length === 0) return prev;
        
        console.log(`[useKlineData] Loaded ${newCandles.length} more candles`);
        return trimKlines([...newCandles, ...prev]);
      });
      
      if (olderCandles.length < 200) {
        setHasMore(false);
      }

      return olderCandles.length;
    } catch (err) {
      console.error('[useKlineData] Failed to load more data:', err);
      return 0;
    } finally {
      if (requestId === loadMoreRequestIdRef.current) {
        setLoadingMore(false);
      }
    }
  }, [klineData, loading, symbol, interval, setKlineData]);

  /**
   * 合并实时 K 线更新
   */
  const mergeKlineUpdate = useCallback((newCandle: Candle) => {
    setKlineData((prev) => {
      if (prev.length === 0) return [newCandle];

      const lastCandle = prev[prev.length - 1];

      // 同一根 K 线：更新最后一根
      if (lastCandle.time === newCandle.time) {
        return trimKlines([...prev.slice(0, -1), newCandle]);
      }

      // 新的 K 线：追加
      return trimKlines([...prev, newCandle]);
    });
  }, [setKlineData]);

  /**
   * 使用 requestAnimationFrame 批量更新
   */
  const scheduleUpdate = useCallback((candle: Candle) => {
    updateBufferRef.current = candle;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (updateBufferRef.current) {
          mergeKlineUpdate(updateBufferRef.current);
          updateBufferRef.current = null;
        }
        rafIdRef.current = null;
      });
    }
  }, [mergeKlineUpdate]);

  /**
   * 处理 WebSocket 消息
   */
  const handleWsMessage = useCallback((data: any) => {
    // MarketDataHub 已经解包了 Combined Stream
    const klineMsg = data as BinanceKlineWsMessage;

    if (klineMsg.e !== 'kline') return;
    
    const k = klineMsg.k;
    const msgSymbol = klineMsg.s || k.s;
    const msgInterval = k.i;
    
    // 过滤非当前交易对/周期的数据
    if (msgSymbol && msgSymbol !== symbol) return;
    if (msgInterval && msgInterval !== interval) return;

    const candle: Candle = {
      time: Math.floor(k.t / 1000),
      open: k.o,
      high: k.h,
      low: k.l,
      close: k.c,
      volume: k.v,
    };

    scheduleUpdate(candle);
  }, [scheduleUpdate, symbol, interval]);

  /**
   * 初始化 WebSocket 订阅
   */
  useEffect(() => {
    // 通过 MarketDataHub 订阅
    const unsubscribe = marketDataHub.subscribe('kline', symbol, interval);
    const unregister = marketDataHub.onMessage('kline', handleWsMessage);

    // 使用事件监听替代轮询
    const unregisterStatus = marketDataHub.onStatusChange(setWsStatus);

    // 清理
    return () => {
      unsubscribe();
      unregister();
      unregisterStatus();
      
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [symbol, interval, handleWsMessage, setWsStatus]);

  /**
   * 当 symbol 或 interval 变化时，立即清空旧数据并重新加载
   */
  useEffect(() => {
    // 立即清空旧数据，避免显示错误的价格范围
    setKlineData([]);
    
    // 然后加载新数据
    loadHistoricalData();
  }, [loadHistoricalData, setKlineData]);

  return {
    klineData,
    loading,
    error,
    wsStatus,
    reload: loadHistoricalData,
    loadMore,
    loadingMore,
    hasMore,
  };
}

