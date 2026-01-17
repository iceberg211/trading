/**
 * 订单簿数据处理 Web Worker
 * 用于在后台线程处理订单簿增量合并，避免阻塞主线程
 */

type OrderBookItem = [string, string];

interface MergeMessage {
  type: 'merge';
  payload: {
    currentBids: OrderBookItem[];
    currentAsks: OrderBookItem[];
    updateBids: OrderBookItem[];
    updateAsks: OrderBookItem[];
    limit: number;
  };
}

interface SortMessage {
  type: 'sort';
  payload: {
    data: OrderBookItem[];
    isBids: boolean;
    limit: number;
  };
}

type WorkerMessage = MergeMessage | SortMessage;

// 合并深度数据
function mergeDepth(
  currentList: OrderBookItem[],
  updates: OrderBookItem[],
  isBids: boolean
): OrderBookItem[] {
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

  const entries = Array.from(map.entries());
  
  // 排序：买盘从高到低，卖盘从低到高
  entries.sort((a, b) => {
    const priceA = parseFloat(a[0]);
    const priceB = parseFloat(b[0]);
    return isBids ? priceB - priceA : priceA - priceB;
  });

  return entries;
}

// 处理消息
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'merge': {
      const { currentBids, currentAsks, updateBids, updateAsks, limit } = payload;
      
      const newBids = mergeDepth(currentBids, updateBids, true).slice(0, limit);
      const newAsks = mergeDepth(currentAsks, updateAsks, false).slice(0, limit);

      self.postMessage({
        type: 'merge_result',
        payload: { bids: newBids, asks: newAsks },
      });
      break;
    }

    case 'sort': {
      const { data, isBids, limit } = payload;
      const sorted = [...data].sort((a, b) => {
        const priceA = parseFloat(a[0]);
        const priceB = parseFloat(b[0]);
        return isBids ? priceB - priceA : priceA - priceB;
      }).slice(0, limit);

      self.postMessage({
        type: 'sort_result',
        payload: { data: sorted },
      });
      break;
    }
  }
};

export {};
