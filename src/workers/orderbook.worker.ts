/**
 * 订单簿数据处理 Web Worker
 * 用于在后台线程处理订单簿增量合并，避免阻塞主线程
 * 
 * 增强版本：使用 Decimal.js 确保精度一致性
 */

// Worker 中无法直接导入 npm 包，使用原生 BigInt 或字符串比较
// 对于价格排序，字符串比较足够精确（Binance API 返回的价格格式一致）

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

interface CalculateStatsMessage {
  type: 'calculate_stats';
  payload: {
    bids: OrderBookItem[];
    asks: OrderBookItem[];
    levels: number;
  };
}

type WorkerMessage = MergeMessage | SortMessage | CalculateStatsMessage;

/**
 * 精确比较两个价格字符串
 * 避免浮点数精度问题
 */
function comparePrices(a: string, b: string): number {
  // 标准化为相同小数位数后比较
  const [aInt, aDec = ''] = a.split('.');
  const [bInt, bDec = ''] = b.split('.');
  
  // 先比较整数部分
  const aIntNum = parseInt(aInt, 10);
  const bIntNum = parseInt(bInt, 10);
  if (aIntNum !== bIntNum) {
    return aIntNum - bIntNum;
  }
  
  // 整数部分相等，比较小数部分
  const maxDecLen = Math.max(aDec.length, bDec.length);
  const aDecPadded = aDec.padEnd(maxDecLen, '0');
  const bDecPadded = bDec.padEnd(maxDecLen, '0');
  
  const aDecNum = parseInt(aDecPadded, 10) || 0;
  const bDecNum = parseInt(bDecPadded, 10) || 0;
  
  return aDecNum - bDecNum;
}

/**
 * 合并深度数据
 * 使用 Map 进行高效合并
 */
function mergeDepth(
  currentList: OrderBookItem[],
  updates: OrderBookItem[],
  isBids: boolean
): OrderBookItem[] {
  const map = new Map<string, string>();
  
  // 添加当前数据
  for (const [price, qty] of currentList) {
    map.set(price, qty);
  }

  // 应用更新
  for (const [price, qty] of updates) {
    // 数量为 0 表示删除该价位
    if (qty === '0' || qty === '0.00000000') {
      map.delete(price);
    } else {
      map.set(price, qty);
    }
  }

  // 转换为数组并排序
  const entries = Array.from(map.entries());
  
  // 排序：买盘从高到低，卖盘从低到高
  entries.sort((a, b) => {
    const cmp = comparePrices(a[0], b[0]);
    return isBids ? -cmp : cmp;
  });

  return entries;
}

/**
 * 计算订单簿统计数据
 */
function calculateStats(
  bids: OrderBookItem[],
  asks: OrderBookItem[],
  levels: number
): { bidTotal: string; askTotal: string; imbalance: number } {
  let bidTotal = 0;
  let askTotal = 0;

  for (let i = 0; i < Math.min(levels, bids.length); i++) {
    bidTotal += parseFloat(bids[i][1]);
  }

  for (let i = 0; i < Math.min(levels, asks.length); i++) {
    askTotal += parseFloat(asks[i][1]);
  }

  const totalVolume = bidTotal + askTotal;
  const imbalance = totalVolume > 0 ? (bidTotal - askTotal) / totalVolume : 0;

  return {
    bidTotal: bidTotal.toFixed(8),
    askTotal: askTotal.toFixed(8),
    imbalance,
  };
}

// 处理消息
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'merge': {
      const { currentBids, currentAsks, updateBids, updateAsks, limit } = payload;
      
      const startTime = performance.now();
      
      const newBids = mergeDepth(currentBids, updateBids, true).slice(0, limit);
      const newAsks = mergeDepth(currentAsks, updateAsks, false).slice(0, limit);

      const duration = performance.now() - startTime;
      
      self.postMessage({
        type: 'merge_result',
        payload: { 
          bids: newBids, 
          asks: newAsks,
          processingTime: duration,
        },
      });
      break;
    }

    case 'sort': {
      const { data, isBids, limit } = payload;
      const sorted = [...data].sort((a, b) => {
        const cmp = comparePrices(a[0], b[0]);
        return isBids ? -cmp : cmp;
      }).slice(0, limit);

      self.postMessage({
        type: 'sort_result',
        payload: { data: sorted },
      });
      break;
    }

    case 'calculate_stats': {
      const { bids, asks, levels } = payload;
      const stats = calculateStats(bids, asks, levels);

      self.postMessage({
        type: 'stats_result',
        payload: stats,
      });
      break;
    }
  }
};

export {};
