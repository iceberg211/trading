import { useMemo } from 'react';
import { useOrderBook } from '../hooks/useOrderBook';
import { OrderBookItem } from './OrderBookItem';
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



  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-card">
        <span className="text-down text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-card">
      {/* Header */}
      <div className="px-3 py-2 border-b border-line flex justify-between items-center">
        <span className="text-sm font-medium text-text-primary">Order Book</span>
        <span className="text-xs text-text-tertiary font-mono">0.01</span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-3 py-1 text-[10px] font-medium text-text-tertiary uppercase tracking-wide">
        <span className="text-left">Price(USDT)</span>
        <span className="text-right">Amount(BTC)</span>
        <span className="text-right">Total</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative min-h-0 text-xs">
        {loading && orderBook.bids.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-card/80 z-20">
            <div className="w-5 h-5 border-2 border-up border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Asks (Sell Orders) - Red */}
        <div className="flex-1 flex flex-col justify-end overflow-hidden pb-1">
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

        {/* Spread / Last Price */}
        <div className="py-1.5 border-y border-line bg-bg px-3 flex items-center justify-between">
          <div className={`text-lg font-bold ${orderBook.asks.length > 0 ? 'text-up' : 'text-text-tertiary'} font-mono`}>
             {orderBook.asks.length > 0 ? new Decimal(orderBook.asks[0][0]).toFixed(2) : '--'}
             <span className="text-xs ml-2 text-text-tertiary font-normal">
               ≈ ${orderBook.asks.length > 0 ? new Decimal(orderBook.asks[0][0]).toFixed(2) : '--'}
             </span>
          </div>
        </div>

        {/* Bids (Buy Orders) - Green */}
        <div className="flex-1 overflow-hidden pt-1">
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
