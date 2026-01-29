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
          // Fallback: 主线程处理合并
          console.warn('[OrderBook Worker] Worker not available, falling back to main thread');
          
          // 主线程合并逻辑 - OrderBookItem 是 [price, quantity] tuple
          const mergeSide = (current: OrderBookItem[], updates: OrderBookItem[], isBid: boolean): OrderBookItem[] => {
            // 创建价格 -> 数量映射
            const map = new Map<string, string>();
            
            // 添加当前数据 (index 0: price, index 1: quantity)
            for (const item of current) {
              map.set(item[0], item[1]);
            }
            
            // 应用更新（数量为 0 表示删除）
            for (const item of updates) {
              if (item[1] === '0' || parseFloat(item[1]) === 0) {
                map.delete(item[0]);
              } else {
                map.set(item[0], item[1]);
              }
            }
            
            // 转换回数组并排序
            let result: OrderBookItem[] = Array.from(map.entries()).map(([price, quantity]) => [price, quantity] as OrderBookItem);
            
            // 排序：买盘降序，卖盘升序
            result.sort((a, b) => {
              const priceA = parseFloat(a[0]);
              const priceB = parseFloat(b[0]);
              return isBid ? priceB - priceA : priceA - priceB;
            });
            
            // 限制数量
            return result.slice(0, limit);
          };
          
          const mergedBids = mergeSide(currentBids, updateBids, true);
          const mergedAsks = mergeSide(currentAsks, updateAsks, false);
          
          resolve({ bids: mergedBids, asks: mergedAsks });
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
