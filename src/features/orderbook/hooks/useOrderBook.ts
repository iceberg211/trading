import { useEffect, useRef, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { symbolAtom } from '@/features/chart/atoms/klineAtom';
import {
  orderBookAtom,
  orderBookLoadingAtom,
  orderBookErrorAtom,
} from '../atoms/orderBookAtom';
import { binanceApi } from '@/services/api/binance';
import { WebSocketManager } from '@/services/websocket/manager';
import Decimal from 'decimal.js';

type OrderBookUpdate = {
  e: string;
  E: number;
  s: string;
  U: number;
  u: number;
  b: [string, string][];
  a: [string, string][];
};

export function useOrderBook() {
  const symbol = useAtomValue(symbolAtom);
  const [orderBook, setOrderBook] = useAtom(orderBookAtom);
  const [loading, setLoading] = useAtom(orderBookLoadingAtom);
  const [error, setError] = useAtom(orderBookErrorAtom);

  const wsManagerRef = useRef<WebSocketManager | null>(null);
  const bufferRef = useRef<OrderBookUpdate[]>([]);
  const lastUpdateIdRef = useRef<number>(0);

  const resetState = useCallback(() => {
    setOrderBook({ lastUpdateId: 0, bids: [], asks: [] });
    bufferRef.current = [];
    lastUpdateIdRef.current = 0;
  }, [setOrderBook]);

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

  const handleWsMessage = useCallback(
    (eventData: any) => {
      const data: OrderBookUpdate = eventData.data || eventData;

      if (data.e !== 'depthUpdate') return;

      if (lastUpdateIdRef.current === 0) {
        bufferRef.current.push(data);
        return;
      }

      if (data.u <= lastUpdateIdRef.current) {
        return;
      }

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
    },
    [mergeDepth, setOrderBook]
  );

  useEffect(() => {
    resetState();
    setLoading(true);

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
        const validUpdates = bufferRef.current.filter(
          (u) => u.u > snapshot.lastUpdateId
        );

        let currentBids = snapshot.bids;
        let currentAsks = snapshot.asks;
        let lastId = snapshot.lastUpdateId;

        validUpdates.forEach((update) => {
          if (update.u <= lastId) return;
          currentBids = mergeDepth(currentBids, update.b, true);
          currentAsks = mergeDepth(currentAsks, update.a, false);
          lastId = update.u;
        });

        lastUpdateIdRef.current = lastId;
        setOrderBook({
          lastUpdateId: lastId,
          bids: currentBids.slice(0, 500),
          asks: currentAsks.slice(0, 500),
        });

        bufferRef.current = [];
        setLoading(false);
      } catch (err) {
        setError('初始化订单簿失败');
        setLoading(false);
        console.error(err);
      }
    };

    initOrderBook();

    return () => {
      unsubscribe();
      wsManager.disconnect();
      resetState();
    };
  }, [symbol, handleWsMessage, mergeDepth, resetState, setOrderBook, setLoading, setError]);

  return {
    orderBook,
    loading,
    error,
  };
}
