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
import { WebSocketManager } from '@/services/websocket/manager';
import type { BinanceKlineWsMessage, BinanceCombinedStreamMessage, Candle } from '@/types/binance';

/**
 * K 线数据管理 Hook
 * 负责加载历史数据、订阅实时推送、合并更新
 */
export function useKlineData() {
  const symbol = useAtomValue(symbolAtom);
  const interval = useAtomValue(intervalAtom);
  const [klineData, setKlineData] = useAtom(klineDataAtom);
  const [loading, setLoading] = useAtom(klineLoadingAtom);
  const [error, setError] = useAtom(klineErrorAtom);
  const [wsStatus, setWsStatus] = useAtom(wsStatusAtom);

  const wsManagerRef = useRef<WebSocketManager | null>(null);
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
  const handleWsMessage = useCallback((data: BinanceCombinedStreamMessage | BinanceKlineWsMessage) => {
    // 处理 Combined Stream 包装
    const klineMsg = 'stream' in data ? data.data : data;

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
   * 初始化 WebSocket 连接
   */
  useEffect(() => {
    // 构建 WebSocket URL（使用 Combined Stream）
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    const wsUrl = `wss://data-stream.binance.vision/stream?streams=${streamName}`;

    // 创建 WebSocket 管理器
    const wsManager = new WebSocketManager({
      url: wsUrl,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
    });

    wsManagerRef.current = wsManager;

    // 订阅消息
    const unsubscribe = wsManager.subscribe(handleWsMessage);

    // 连接
    wsManager.connect();

    // 定期检查连接状态
    const statusCheckInterval = setInterval(() => {
      setWsStatus(wsManager.getStatus());
    }, 1000);

    // 清理
    return () => {
      clearInterval(statusCheckInterval);
      unsubscribe();
      wsManager.disconnect();
      
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [symbol, interval, handleWsMessage, setWsStatus]);

  /**
   * 当 symbol 或 interval 变化时，重新加载数据
   */
  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  return {
    klineData,
    loading,
    error,
    wsStatus,
    reload: loadHistoricalData,
  };
}
