import { useEffect, useRef, useCallback, useMemo, useState } from 'react';

type OrderBookUpdate = {
  bids: [string, string][];
  asks: [string, string][];
  lastUpdateId: number;
};

type WorkerMessage = 
  | { type: 'ORDERBOOK_UPDATE'; payload: OrderBookUpdate }
  | { type: 'STATUS'; payload: string }
  | { type: 'GAP_DETECTED' };

export function useTradingEngine() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const callbacksRef = useRef<{
    onOrderBookUpdate?: (data: OrderBookUpdate) => void;
    onStatusChange?: (status: string) => void;
    onGapDetected?: () => void;
  }>({});

  useEffect(() => {
    // Initialize Worker
    workerRef.current = new Worker(
      new URL('../workers/tradingEngine.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      
      switch (msg.type) {
        case 'ORDERBOOK_UPDATE':
          callbacksRef.current.onOrderBookUpdate?.(msg.payload);
          break;
        case 'STATUS':
          callbacksRef.current.onStatusChange?.(msg.payload);
          break;
        case 'GAP_DETECTED':
          callbacksRef.current.onGapDetected?.();
          break;
      }
    };

    setIsReady(true);

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, []);

  const connect = useCallback((url: string) => {
    workerRef.current?.postMessage({ type: 'CONNECT', payload: { url } });
  }, []);

  const subscribe = useCallback((symbol: string) => {
    workerRef.current?.postMessage({ type: 'SUBSCRIBE', payload: { symbol } });
  }, []);

  const initSnapshot = useCallback((data: { lastUpdateId: number, bids: any[], asks: any[] }) => {
    workerRef.current?.postMessage({ type: 'INIT_SNAPSHOT', payload: data });
  }, []);

  const registerCallbacks = useCallback((callbacks: {
    onOrderBookUpdate?: (data: OrderBookUpdate) => void;
    onStatusChange?: (status: string) => void;
    onGapDetected?: () => void;
  }) => {
    callbacksRef.current = { ...callbacksRef.current, ...callbacks };
  }, []);

  // Return a stable object reference using useMemo
  return useMemo(() => ({
    connect,
    subscribe,
    initSnapshot,
    registerCallbacks,
    isReady,
  }), [connect, subscribe, initSnapshot, registerCallbacks, isReady]);
}
