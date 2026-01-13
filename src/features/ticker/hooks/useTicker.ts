import { useEffect, useRef, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { symbolAtom } from '@/features/symbol/atoms/symbolAtom';
import { tickerAtom, tickerLoadingAtom, tickerErrorAtom } from '../atoms/tickerAtom';
import { binanceApi } from '@/services/api/binance';
import { WebSocketManager } from '@/services/websocket/manager';
import type { Ticker24hr } from '@/types/binance';

// Binance WebSocket 24h Ticker 消息
interface TickerWsMessage {
  e: '24hrTicker';
  E: number;
  s: string;
  p: string;   // priceChange
  P: string;   // priceChangePercent
  w: string;   // weightedAvgPrice
  x: string;   // prevClosePrice
  c: string;   // lastPrice
  Q: string;   // lastQty
  b: string;   // bidPrice
  B: string;   // bidQty
  a: string;   // askPrice
  A: string;   // askQty
  o: string;   // openPrice
  h: string;   // highPrice
  l: string;   // lowPrice
  v: string;   // volume
  q: string;   // quoteVolume
  O: number;   // openTime
  C: number;   // closeTime
  F: number;   // firstId
  L: number;   // lastId
  n: number;   // count
}

/**
 * 24h Ticker 数据管理 Hook
 */
export function useTicker() {
  const symbol = useAtomValue(symbolAtom);
  const [ticker, setTicker] = useAtom(tickerAtom);
  const [loading, setLoading] = useAtom(tickerLoadingAtom);
  const [error, setError] = useAtom(tickerErrorAtom);
  const wsManagerRef = useRef<WebSocketManager | null>(null);

  /**
   * 加载初始 Ticker 数据
   */
  const loadTicker = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await binanceApi.getTicker24hr(symbol);
      setTicker(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 Ticker 失败');
    } finally {
      setLoading(false);
    }
  }, [symbol, setTicker, setLoading, setError]);

  /**
   * 转换 WebSocket 消息为标准格式
   */
  const normalizeWsData = (msg: TickerWsMessage): Ticker24hr => ({
    symbol: msg.s,
    priceChange: msg.p,
    priceChangePercent: msg.P,
    weightedAvgPrice: msg.w,
    prevClosePrice: msg.x,
    lastPrice: msg.c,
    lastQty: msg.Q,
    bidPrice: msg.b,
    bidQty: msg.B,
    askPrice: msg.a,
    askQty: msg.A,
    openPrice: msg.o,
    highPrice: msg.h,
    lowPrice: msg.l,
    volume: msg.v,
    quoteVolume: msg.q,
    openTime: msg.O,
    closeTime: msg.C,
    firstId: msg.F,
    lastId: msg.L,
    count: msg.n,
  });

  /**
   * 处理 WebSocket 消息
   */
  const handleWsMessage = useCallback((data: any) => {
    const msg = data.data || data;
    if (msg.e === '24hrTicker') {
      setTicker(normalizeWsData(msg));
    }
  }, [setTicker]);

  /**
   * 初始化 WebSocket 连接
   */
  useEffect(() => {
    // 加载初始数据
    loadTicker();

    // 订阅实时更新
    const streamName = `${symbol.toLowerCase()}@ticker`;
    const wsUrl = `wss://data-stream.binance.vision/stream?streams=${streamName}`;

    const wsManager = new WebSocketManager({
      url: wsUrl,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
    });

    wsManagerRef.current = wsManager;
    const unsubscribe = wsManager.subscribe(handleWsMessage);
    wsManager.connect();

    return () => {
      unsubscribe();
      wsManager.disconnect();
    };
  }, [symbol, loadTicker, handleWsMessage]);

  return {
    ticker,
    loading,
    error,
    reload: loadTicker,
  };
}
