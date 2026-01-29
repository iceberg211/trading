import { useEffect, useRef, useCallback } from 'react';
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
import type { BinanceKlineWsMessage, BinanceCombinedStreamMessage, Candle } from '@/types/binance';

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

  const updateBufferRef = useRef<Candle | null>(null);
  const rafIdRef = useRef<number | null>(null);

  /**
   * 加载历史 K 线数据
   */
  const loadHistoricalData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const candles = await binanceApi.getKlines(symbol, interval, 500);
      setKlineData(candles);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, setKlineData, setLoading, setError]);

  /**
   * 合并实时 K 线更新
   */
  const mergeKlineUpdate = useCallback((newCandle: Candle) => {
    setKlineData((prev) => {
      if (prev.length === 0) return [newCandle];

      const lastCandle = prev[prev.length - 1];

      // 同一根 K 线：更新最后一根
      if (lastCandle.time === newCandle.time) {
        return [...prev.slice(0, -1), newCandle];
      }

      // 新的 K 线：追加
      return [...prev, newCandle];
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

    if (klineMsg.e === 'kline') {
      const k = klineMsg.k;
      const candle: Candle = {
        time: Math.floor(k.t / 1000),
        open: k.o,
        high: k.h,
        low: k.l,
        close: k.c,
        volume: k.v,
      };

      scheduleUpdate(candle);
    }
  }, [scheduleUpdate]);

  /**
   * 初始化 WebSocket 订阅
   */
  useEffect(() => {
    // 通过 MarketDataHub 订阅
    const unsubscribe = marketDataHub.subscribe('kline', symbol, interval);
    const unregister = marketDataHub.onMessage('kline', handleWsMessage);

    // 定期检查连接状态
    const statusCheckInterval = setInterval(() => {
      setWsStatus(marketDataHub.getStatus());
    }, 1000);

    // 清理
    return () => {
      clearInterval(statusCheckInterval);
      unsubscribe();
      unregister();
      
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
  };
}
