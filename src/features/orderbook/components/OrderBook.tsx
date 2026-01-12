import { useMemo } from 'react';
import { useOrderBook } from '../hooks/useOrderBook';
import { OrderBookItem } from './OrderBookItem';
import Decimal from 'decimal.js';

export function OrderBook() {
  const { orderBook, loading, error } = useOrderBook();

  // 处理买单数据：计算累计数量 (降序，高价在前)
  const bids = useMemo(() => {
    let total = new Decimal(0);
    return orderBook.bids.slice(0, 15).map(([price, qty]) => {
      total = total.plus(qty);
      return { price, qty, total: total.toString() };
    });
  }, [orderBook.bids]);

  // 处理卖单数据：计算累计数量
  // 原始数据：升序 (低价在前)
  // 我们需要取最低的 15 个卖单，展示时从上往下是：高价 -> 低价
  // 所以需要先取前 15 个 (最低价的 15 个)，然后反转顺序
  const asks = useMemo(() => {
    let total = new Decimal(0);
    const lowestAsks = orderBook.asks.slice(0, 15);
    // 计算累计量是从最低价开始累加 (对于卖单，只要价格 >= P 就能成交，所以通常是向上累加？)
    // 这里的累计量通常指：如果我买入，吃掉这一档及更优档及的数量。
    // 即：从最低卖价开始累加。
    return lowestAsks.map(([price, qty]) => {
      total = total.plus(qty);
      return { price, qty, total: total.toString() };
    }).reverse(); // 反转，为了在 UI 上从上到下显示：高价...低价
  }, [orderBook.asks]);

  const maxTotal = useMemo(() => {
    const maxBid = bids.length > 0 ? parseFloat(bids[bids.length - 1].total) : 0;
    // asks 反转后，最大的 accumulated total 在第一个元素 (原数组最后一个)
    const maxAsk = asks.length > 0 ? parseFloat(asks[0].total) : 0;
    return Math.max(maxBid, maxAsk);
  }, [bids, asks]);

  // 计算 Spread
  const spread = useMemo(() => {
    if (orderBook.bids.length === 0 || orderBook.asks.length === 0) return null;
    const highestBid = new Decimal(orderBook.bids[0][0]);
    const lowestAsk = new Decimal(orderBook.asks[0][0]);
    const diff = lowestAsk.minus(highestBid);
    const percentage = diff.div(lowestAsk).times(100);
    
    return {
      price: diff.toFixed(2),
      percentage: percentage.toFixed(2)
    };
  }, [orderBook.bids, orderBook.asks]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-secondary/70 rounded-2xl border border-white/10 p-4">
        <span className="text-down text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-secondary/70 backdrop-blur rounded-2xl border border-white/10 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-bg-tertiary/30">
        <h3 className="font-heading font-medium text-slate-200">Order Book</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Depth</span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300">15</span>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-3 gap-2 px-2 py-2 text-xs font-medium text-slate-500 border-b border-white/5 bg-bg-primary/20">
        <span className="pl-1">Price(USDT)</span>
        <span className="text-right">Amount</span>
        <span className="text-right pr-1">Total</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative min-h-0">
        {loading && orderBook.bids.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-up border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-400">Syncing...</span>
            </div>
          </div>
        )}

        {/* Asks (Red) */}
        <div className="flex-1 flex flex-col justify-end py-1">
          {asks.map((item) => (
            <OrderBookItem
              key={item.price}
              price={item.price}
              qty={item.qty}
              total={item.total}
              maxTotal={maxTotal}
              type="ask"
            />
          ))}
        </div>

        {/* Spread */}
        <div className="sticky top-0 bottom-0 z-10 py-2.5 my-1 border-y border-white/10 bg-bg-tertiary/50 backdrop-blur-sm flex items-center justify-center gap-3">
          <span className={`text-lg font-heading font-bold tracking-tight ${
            orderBook.asks.length > 0 && orderBook.bids.length > 0
              ? parseFloat(spread?.price || '0') >= 0 ? 'text-up' : 'text-down'
              : 'text-slate-400'
          }`}>
            {orderBook.asks.length > 0 
              ? new Decimal(orderBook.asks[0][0]).toFixed(2) 
              : '--'}
          </span>
          {spread && (
            <span className="text-xs font-mono text-slate-400 opacity-80">
              {spread.price} ({spread.percentage}%)
            </span>
          )}
        </div>

        {/* Bids (Green) */}
        <div className="flex-1 py-1">
          {bids.map((item) => (
            <OrderBookItem
              key={item.price}
              price={item.price}
              qty={item.qty}
              total={item.total}
              maxTotal={maxTotal}
              type="bid"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
