import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DepthDelta,
  EngineSyncStatus,
  HubWsStatus,
  MainToWorkerMessage,
  OrderBookSnapshot,
  WorkerToMainMessage,
} from '@/workers/orderbookEngine.types';

export type OrderBookEngineState = {
  symbol: string;
  syncStatus: EngineSyncStatus;
  lastUpdateId: number;
  bufferSize: number;
};

export type OrderBookEngineCallbacks = {
  onUpdate?: (payload: Extract<WorkerToMainMessage, { type: 'ORDERBOOK_UPDATE' }>['payload']) => void;
  onGapDetected?: (payload: Extract<WorkerToMainMessage, { type: 'GAP_DETECTED' }>['payload']) => void;
  onStatus?: (payload: Extract<WorkerToMainMessage, { type: 'STATUS' }>['payload']) => void;
};

export function useOrderBookEngine() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<OrderBookEngineCallbacks>({});
  const [state, setState] = useState<OrderBookEngineState>({
    symbol: '',
    syncStatus: 'uninitialized',
    lastUpdateId: 0,
    bufferSize: 0,
  });

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/orderbook.worker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      const msg = event.data;

      if (msg.type === 'ORDERBOOK_UPDATE') {
        setState({
          symbol: msg.payload.symbol,
          syncStatus: msg.payload.syncStatus,
          lastUpdateId: msg.payload.lastUpdateId,
          bufferSize: msg.payload.bufferSize,
        });
        callbacksRef.current.onUpdate?.(msg.payload);
        return;
      }

      if (msg.type === 'GAP_DETECTED') {
        callbacksRef.current.onGapDetected?.(msg.payload);
        return;
      }

      if (msg.type === 'STATUS') {
        setState({
          symbol: msg.payload.symbol,
          syncStatus: msg.payload.syncStatus,
          lastUpdateId: msg.payload.lastUpdateId,
          bufferSize: msg.payload.bufferSize,
        });
        callbacksRef.current.onStatus?.(msg.payload);
      }
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const post = useCallback((msg: MainToWorkerMessage) => {
    workerRef.current?.postMessage(msg);
  }, []);

  const registerCallbacks = useCallback((callbacks: OrderBookEngineCallbacks) => {
    callbacksRef.current = { ...callbacksRef.current, ...callbacks };
  }, []);

  const setSymbol = useCallback((symbol: string) => {
    post({ type: 'SET_SYMBOL', payload: { symbol } });
  }, [post]);

  const reset = useCallback(() => {
    post({ type: 'RESET' });
  }, [post]);

  const initSnapshot = useCallback((snapshot: OrderBookSnapshot) => {
    post({ type: 'INIT_SNAPSHOT', payload: snapshot });
  }, [post]);

  const pushDelta = useCallback((delta: DepthDelta) => {
    post({ type: 'DEPTH_DELTA', payload: delta });
  }, [post]);

  const setWsStatus = useCallback((status: HubWsStatus) => {
    post({ type: 'WS_STATUS', payload: { status } });
  }, [post]);

  const api = useMemo(() => ({
    registerCallbacks,
    setSymbol,
    reset,
    initSnapshot,
    pushDelta,
    setWsStatus,
  }), [registerCallbacks, setSymbol, reset, initSnapshot, pushDelta, setWsStatus]);

  return { api, state };
}
