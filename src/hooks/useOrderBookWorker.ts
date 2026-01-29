import { useRef, useEffect, useCallback } from 'react';

type OrderBookItem = [string, string];

interface MergeResult {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
  processingTime?: number;
}

interface WorkerResult {
  type: string;
  payload: {
    bids?: OrderBookItem[];
    asks?: OrderBookItem[];
    data?: OrderBookItem[];
    processingTime?: number;
    bidTotal?: string;
    askTotal?: string;
    imbalance?: number;
  };
}

/**
 * 订单簿 Worker Hook
 * 封装 Worker 的生命周期和消息通信
 */
export function useOrderBookWorker() {
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<string, (result: WorkerResult['payload']) => void>>(new Map());
  const readyRef = useRef(false);

  useEffect(() => {
    // 创建 Worker
    workerRef.current = new Worker(
      new URL('../workers/orderbook.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // 处理 Worker 返回的消息
    workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
      const { type, payload } = e.data;
      const callback = callbacksRef.current.get(type);
      if (callback) {
        callback(payload);
        callbacksRef.current.delete(type);
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('[OrderBook Worker] Error:', error);
    };

    readyRef.current = true;

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // 发送合并请求
  const mergeDepth = useCallback(
    (
      currentBids: OrderBookItem[],
      currentAsks: OrderBookItem[],
      updateBids: OrderBookItem[],
      updateAsks: OrderBookItem[],
      limit: number = 500
    ): Promise<MergeResult> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          // Fallback: 主线程处理
          console.warn('[OrderBook Worker] Worker not available, falling back to main thread');
          resolve({ bids: currentBids, asks: currentAsks });
          return;
        }

        callbacksRef.current.set('merge_result', (payload) => {
          resolve({
            bids: payload.bids || [],
            asks: payload.asks || [],
            processingTime: payload.processingTime,
          });
        });

        workerRef.current.postMessage({
          type: 'merge',
          payload: { currentBids, currentAsks, updateBids, updateAsks, limit },
        });
      });
    },
    []
  );

  // 发送排序请求
  const sortDepth = useCallback(
    (
      data: OrderBookItem[],
      isBids: boolean,
      limit: number = 500
    ): Promise<OrderBookItem[]> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          resolve(data);
          return;
        }

        callbacksRef.current.set('sort_result', (payload) => {
          resolve(payload.data || []);
        });

        workerRef.current.postMessage({
          type: 'sort',
          payload: { data, isBids, limit },
        });
      });
    },
    []
  );

  // 计算统计数据
  const calculateStats = useCallback(
    (
      bids: OrderBookItem[],
      asks: OrderBookItem[],
      levels: number = 20
    ): Promise<{ bidTotal: string; askTotal: string; imbalance: number }> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          resolve({ bidTotal: '0', askTotal: '0', imbalance: 0 });
          return;
        }

        callbacksRef.current.set('stats_result', (payload) => {
          resolve({
            bidTotal: payload.bidTotal || '0',
            askTotal: payload.askTotal || '0',
            imbalance: payload.imbalance || 0,
          });
        });

        workerRef.current.postMessage({
          type: 'calculate_stats',
          payload: { bids, asks, levels },
        });
      });
    },
    []
  );

  return {
    mergeDepth,
    sortDepth,
    calculateStats,
    isReady: readyRef.current,
  };
}
