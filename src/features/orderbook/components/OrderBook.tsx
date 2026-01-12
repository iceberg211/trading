import { useMemo } from 'react';
import { useOrderBook } from '../hooks/useOrderBook';
import { OrderBookItem } from './OrderBookItem';
import { Card, CardHeader } from '@/components/ui';
import Decimal from 'decimal.js';

export function OrderBook() {
  const { orderBook, loading, error } = useOrderBook();

  // 处理买单数据
  const bids = useMemo(() => {
    let total = new Decimal(0);
    return orderBook.bids.slice(0, 12).map(([price, qty]) => {
      total = total.plus(qty);
      return { price, qty, total: total.toString() };
    });
  }, [orderBook.bids]);

  // 处理卖单数据
  const asks = useMemo(() => {
    let total = new Decimal(0);
    const lowestAsks = orderBook.asks.slice(0, 12);
    return lowestAsks.map(([price, qty]) => {
      total = total.plus(qty);
      return { price, qty, total: total.toString() };
    }).reverse();
  }, [orderBook.asks]);

  const maxTotal = useMemo(() => {
    const maxBid = bids.length > 0 ? parseFloat(bids[bids.length - 1].total) : 0;
    const maxAsk = asks.length > 0 ? parseFloat(asks[0].total) : 0;
    return Math.max(maxBid, maxAsk);
  }, [bids, asks]);

  // 计算 Spread
  const spread = useMemo(() => {
    if (orderBook.bids.length === 0 || orderBook.asks.length === 0) return null;
    const highestBid = new Decimal(orderBook.bids[0][0]);
    const lowestAsk = new Decimal(orderBook.asks[0][0]);
    const diff = lowestAsk.minus(highestBid);
    return {
      price: diff.toFixed(2),
      percentage: diff.div(lowestAsk).times(100).toFixed(3)
    };
  }, [orderBook.bids, orderBook.asks]);

  if (error) {
    return (
      <Card className="h-full flex items-center justify-center">
        <span className="text-down text-sm">{error}</span>
      </Card>
    );
  }

  return (
    <Card noPadding className="flex flex-col h-full">
      <CardHeader 
        title="订单簿" 
        extra={<span className="text-xs text-slate-500 font-mono">Depth 12</span>} 
      />

      {/* Table Header */}
      <div className="grid grid-cols-3 gap-2 px-3 py-1.5 text-[10px] font-medium text-slate-500 border-b border-white/5 uppercase tracking-wide">
        <span>价格</span>
        <span className="text-right">数量</span>
        <span className="text-right">累计</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative min-h-0">
        {loading && orderBook.bids.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-up border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">同步中...</span>
            </div>
          </div>
        )}

        {/* Asks */}
        <div className="flex-1 flex flex-col justify-end overflow-hidden">
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
        <div className="py-2 border-y border-white/10 bg-bg-tertiary/30 flex items-center justify-center gap-3">
          <span className={`text-base font-heading font-bold ${
            orderBook.asks.length > 0 ? 'text-up' : 'text-slate-400'
          }`}>
            {orderBook.asks.length > 0 
              ? new Decimal(orderBook.asks[0][0]).toFixed(2) 
              : '--'}
          </span>
          {spread && (
            <span className="text-[10px] font-mono text-slate-500">
              {spread.percentage}%
            </span>
          )}
        </div>

        {/* Bids */}
        <div className="flex-1 overflow-hidden">
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
    </Card>
  );
}
