import { useMemo, useState, useCallback, memo, CSSProperties } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useOrderBook } from '../hooks/useOrderBook';
import { DepthChart } from './DepthChart';
import Decimal from 'decimal.js';

type ViewMode = 'book' | 'depth';

interface OrderItem {
  price: string;
  qty: string;
  total: string;
}

// 虚拟列表行组件
const OrderRow = memo(function OrderRow({
  style,
  data,
  index,
}: {
  style: CSSProperties;
  data: { items: OrderItem[]; maxTotal: number; type: 'bid' | 'ask' };
  index: number;
}) {
  const { items, maxTotal, type } = data;
  const item = items[index];
  if (!item) return null;

  const width = Math.min((parseFloat(item.total) / maxTotal) * 100, 100);
  const formattedPrice = new Decimal(item.price).toFixed(2);
  const formattedQty = new Decimal(item.qty).toFixed(4);
  const formattedTotal = new Decimal(item.total).toFixed(2);

  return (
    <div
      style={style}
      className="relative grid grid-cols-3 gap-2 px-3 text-xs hover:bg-bg-hover cursor-pointer transition-colors items-center"
    >
      {/* 深度背景条 */}
      <div
        className={`absolute top-0 right-0 bottom-0 z-0 ${
          type === 'bid' ? 'bg-up-bg' : 'bg-down-bg'
        }`}
        style={{ width: `${width}%` }}
      />
      <span className={`relative z-10 font-medium font-mono ${type === 'bid' ? 'text-up' : 'text-down'}`}>
        {formattedPrice}
      </span>
      <span className="relative z-10 text-right text-text-primary font-mono">
        {formattedQty}
      </span>
      <span className="relative z-10 text-right text-text-tertiary font-mono">
        {formattedTotal}
      </span>
    </div>
  );
});

export function OrderBook() {
  const { orderBook, loading, error, syncStatus } = useOrderBook();
  const [viewMode, setViewMode] = useState<ViewMode>('book');

  // 处理买单数据
  const bids = useMemo(() => {
    let total = new Decimal(0);
    return orderBook.bids.slice(0, 25).map(([price, qty]) => {
      total = total.plus(qty);
      return { price, qty, total: total.toString() };
    });
  }, [orderBook.bids]);

  // 处理卖单数据（反转以便从低到高显示）
  const asks = useMemo(() => {
    let total = new Decimal(0);
    const lowestAsks = orderBook.asks.slice(0, 25);
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

  // 点击价格填入交易表单（预留功能）
  const handlePriceClick = useCallback((price: string) => {
    console.log('Price clicked:', price);
    // TODO: 联动交易表单
  }, []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-card">
        <span className="text-down text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-card">
      {/* Header with View Mode Tabs */}
      <div className="px-3 py-2 border-b border-line flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('book')}
            className={`text-sm font-medium transition-colors ${
              viewMode === 'book' 
                ? 'text-text-primary' 
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Order Book
          </button>
          <button
            onClick={() => setViewMode('depth')}
            className={`text-sm font-medium transition-colors ${
              viewMode === 'depth' 
                ? 'text-text-primary' 
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            Depth
          </button>
        </div>
        <div className="flex items-center gap-2">
          {syncStatus === 'syncing' && (
            <span className="text-[10px] text-accent animate-pulse">Syncing...</span>
          )}
          {syncStatus === 'gap_detected' && (
            <span className="text-[10px] text-down">Reconnecting...</span>
          )}
          <span className="text-xs text-text-tertiary font-mono">0.01</span>
        </div>
      </div>

      {/* Depth Chart View */}
      {viewMode === 'depth' && (
        <div className="flex-1 min-h-0">
          <DepthChart />
        </div>
      )}

      {/* Order Book View with Virtual List */}
      {viewMode === 'book' && (
        <>
          {/* Column Headers */}
          <div className="grid grid-cols-3 gap-2 px-3 py-1 text-[10px] font-medium text-text-tertiary uppercase tracking-wide">
            <span className="text-left">Price(USDT)</span>
            <span className="text-right">Amount(BTC)</span>
            <span className="text-right">Total</span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col relative min-h-0">
            {loading && orderBook.bids.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-card/80 z-20">
                <div className="w-5 h-5 border-2 border-up border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Asks (Sell Orders) - Virtual List */}
            <div className="flex-1 min-h-0">
              <List
                height={150}
                itemCount={asks.length}
                itemSize={20}
                width="100%"
                itemData={{ items: asks, maxTotal, type: 'ask' as const }}
                className="scrollbar-thin"
              >
                {({ index, style, data }) => (
                  <OrderRow style={style} data={data} index={index} />
                )}
              </List>
            </div>

            {/* Spread / Last Price */}
            <div className="py-1.5 border-y border-line bg-bg px-3 flex items-center justify-between shrink-0">
              <div className={`text-lg font-bold ${orderBook.asks.length > 0 ? 'text-up' : 'text-text-tertiary'} font-mono`}>
                {orderBook.asks.length > 0 ? new Decimal(orderBook.asks[0][0]).toFixed(2) : '--'}
                <span className="text-xs ml-2 text-text-tertiary font-normal">
                  ≈ ${orderBook.asks.length > 0 ? new Decimal(orderBook.asks[0][0]).toFixed(2) : '--'}
                </span>
              </div>
            </div>

            {/* Bids (Buy Orders) - Virtual List */}
            <div className="flex-1 min-h-0">
              <List
                height={150}
                itemCount={bids.length}
                itemSize={20}
                width="100%"
                itemData={{ items: bids, maxTotal, type: 'bid' as const }}
                className="scrollbar-thin"
              >
                {({ index, style, data }) => (
                  <OrderRow style={style} data={data} index={index} />
                )}
              </List>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
