import { useMemo, useState, useLayoutEffect, useRef, memo, CSSProperties, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useAtomValue } from 'jotai';
import { useOrderBook } from '../hooks/useOrderBook';
import { DepthChart } from './DepthChart';
import { symbolConfigAtom } from '@/features/symbol/atoms/symbolAtom';
import { aggregateOrders } from '../utils/orderAggregate';
import { OrderBookTooltip } from './OrderBookTooltip';
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
  data: { 
    items: OrderItem[]; 
    maxTotal: number; 
    type: 'bid' | 'ask'; 
    onHover: (data: any, e: React.MouseEvent) => void; 
    onLeave: () => void;
    pricePrecision: number;
    qtyPrecision: number;
  };
  index: number;
}) {
  const { items, maxTotal, type, onHover, onLeave, pricePrecision, qtyPrecision } = data;
  const item = items[index];
  if (!item) return null;

  const width = Math.min((parseFloat(item.total) / maxTotal) * 100, 100);
  const formattedPrice = new Decimal(item.price).toFixed(pricePrecision);
  const formattedQty = new Decimal(item.qty).toFixed(qtyPrecision);
  const formattedTotal = new Decimal(item.total).toFixed(qtyPrecision);

  // 准备 Tooltip 数据
  const handleMouseEnter = (e: React.MouseEvent) => {
    // 估算 Total USDT
    const totalUSDT = new Decimal(item.total).mul(item.price).toFixed(2);
    
    onHover({
      price: item.price,
      avgPrice: item.price,
      totalBase: item.total,
      totalQuote: totalUSDT,
      type
    }, e);
  };

  return (
    <div
      style={style}
      className="relative grid grid-cols-3 gap-2 px-3 text-xs hover:bg-bg-hover cursor-pointer transition-colors items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
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
  const symbolConfig = useAtomValue(symbolConfigAtom);
  const [viewMode, setViewMode] = useState<ViewMode>('book');
  const contentRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(160);

  // Tooltip State
  const [activeTooltip, setActiveTooltip] = useState<{data: any, position: {x: number, y: number}} | null>(null);

  // 从 symbolConfig 提取配置
  const quoteCurrency = symbolConfig?.quoteAsset || 'USDT';
  const baseCurrency = symbolConfig?.baseAsset || 'BTC';
  const defaultTickSize = symbolConfig?.tickSize || '0.01';
  const pricePrecision = symbolConfig?.pricePrecision || 2;
  const qtyPrecision = symbolConfig?.quantityPrecision || 4;
  
  // 精度选择状态
  const [precision, setPrecision] = useState(defaultTickSize);
  
  // 当 symbol 改变时重置 precision
  useLayoutEffect(() => {
    setPrecision(defaultTickSize);
  }, [defaultTickSize]);

  // 生成精度选项 (0.01 -> 0.1 -> 1 -> 10)
  const precisionOptions = useMemo(() => {
    const options = [];
    let current = new Decimal(defaultTickSize);
    for (let i = 0; i < 4; i++) {
      options.push(current.toFixed());
      current = current.mul(10);
    }
    return options;
  }, [defaultTickSize]);

  // 处理买单数据 (使用聚合工具)
  const bids = useMemo(() => {
    return aggregateOrders(orderBook.bids, precision, 'bids');
  }, [orderBook.bids, precision]);

  // 处理卖单数据 (反转以便高价在上)
  const asks = useMemo(() => {
    const result = aggregateOrders(orderBook.asks, precision, 'asks');
    return result.reverse(); 
  }, [orderBook.asks, precision]);

  const maxTotal = useMemo(() => {
    const maxBid = bids.length > 0 ? parseFloat(bids[bids.length - 1].total) : 0;
    const maxAsk = asks.length > 0 ? parseFloat(asks[0].total) : 0;
    return Math.max(maxBid, maxAsk);
  }, [bids, asks]);


  // 根据内容区域高度动态计算列表高度
  useLayoutEffect(() => {
    const updateHeights = () => {
      if (!contentRef.current || !spreadRef.current) return;
      const totalHeight = contentRef.current.clientHeight;
      const spreadHeight = spreadRef.current.clientHeight;
      const eachHeight = Math.max(Math.floor((totalHeight - spreadHeight) / 2), 1);
      setListHeight(eachHeight);
    };

    updateHeights();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateHeights);
    if (contentRef.current) observer.observe(contentRef.current);
    if (spreadRef.current) observer.observe(spreadRef.current);

    return () => observer.disconnect();
  }, [viewMode]);

  // Tooltip 事件处理
  const handleHover = useCallback((data: any, e: React.MouseEvent) => {
    setActiveTooltip({
      data,
      position: { x: e.clientX, y: e.clientY }
    });
  }, []);

  const handleLeave = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-card">
        <span className="text-down text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-card relative">
      {/* Global Tooltip */}
      {activeTooltip && (
        <OrderBookTooltip 
          data={activeTooltip.data} 
          position={activeTooltip.position} 
        />
      )}

      {/* Header with View Mode Tabs & Precision */}
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
          
          {/* Precision Selector */}
          <div className="relative group">
            <select
              value={precision}
              onChange={(e) => setPrecision(e.target.value)}
              className="appearance-none bg-transparent text-xs text-text-tertiary font-mono hover:text-text-primary cursor-pointer pr-4 focus:outline-none text-right"
            >
              {precisionOptions.map((p) => (
                <option key={p} value={p} className="bg-bg-card text-text-primary">
                  {p}
                </option>
              ))}
            </select>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary">
              <svg width="8" height="6" viewBox="0 0 8 6" fill="currentColor">
                <path d="M4 6L0 0H8L4 6Z" />
              </svg>
            </div>
          </div>
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
            <span className="text-left">Price({quoteCurrency})</span>
            <span className="text-right">Amount({baseCurrency})</span>
            <span className="text-right">Total</span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col relative min-h-0" ref={contentRef}>
            {loading && orderBook.bids.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg-card/80 z-20">
                <div className="w-5 h-5 border-2 border-up border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Asks (Sell Orders) - Virtual List */}
            <div className="flex-1 min-h-0">
              <List
                height={Math.max(listHeight, 1)}
                itemCount={asks.length}
                itemSize={20}
                width="100%"
                itemData={{ 
                  items: asks, 
                  maxTotal, 
                  type: 'ask' as const, 
                  onHover: handleHover, 
                  onLeave: handleLeave,
                  pricePrecision,
                  qtyPrecision
                }}
                className="scrollbar-thin"
              >
                {({ index, style, data }) => (
                  <OrderRow style={style} data={data} index={index} />
                )}
              </List>
            </div>

            {/* Spread / Last Price */}
            <div ref={spreadRef} className="py-1.5 border-y border-line bg-bg px-3 flex items-center justify-between shrink-0">
              <div className={`text-lg font-bold ${orderBook.asks.length > 0 ? 'text-up' : 'text-text-tertiary'} font-mono`}>
                {orderBook.asks.length > 0 ? new Decimal(orderBook.asks[0][0]).toFixed(pricePrecision) : '--'}
                <span className="text-xs ml-2 text-text-tertiary font-normal">
                  ≈ ${orderBook.asks.length > 0 ? new Decimal(orderBook.asks[0][0]).toFixed(2) : '--'}
                </span>
              </div>
            </div>

            {/* Bids (Buy Orders) - Virtual List */}
            <div className="flex-1 min-h-0">
              <List
                height={Math.max(listHeight, 1)}
                itemCount={bids.length}
                itemSize={20}
                width="100%"
                itemData={{ 
                  items: bids, 
                  maxTotal, 
                  type: 'bid' as const, 
                  onHover: handleHover, 
                  onLeave: handleLeave,
                  pricePrecision,
                  qtyPrecision
                }}
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
