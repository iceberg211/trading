import { memo, useMemo } from 'react';
import Decimal from 'decimal.js';

interface OrderBookTooltipProps {
  data: {
    price: string;
    avgPrice: string;
    totalBase: string; // Total BTC
    totalQuote: string; // Total USDT
    type: 'bid' | 'ask';
  } | null;
  position: { x: number; y: number } | null;
}

export const OrderBookTooltip = memo(function OrderBookTooltip({ data, position }: OrderBookTooltipProps) {
  const formattedStats = useMemo(() => {
    if (!data) return null;
    return {
      avg: new Decimal(data.avgPrice).toFixed(2),
      base: new Decimal(data.totalBase).toFixed(5), // 稍微多一点精度
      quote: new Decimal(data.totalQuote).toFixed(2),
    };
  }, [data]);

  if (!data || !position || !formattedStats) return null;

  const { price, type } = data;

  // 根据在屏幕的位置调整 tooltip 显示方向，防止溢出屏幕
  // 简单起见，默认显示在鼠标右侧或左侧。这里假设显示在左侧浮动。
  
  return (
    <div
      className="fixed z-tooltip pointer-events-none bg-bg-card border border-line-dark shadow-xl rounded-panel p-3 min-w-[200px]"
      style={{
        left: position.x - 220, // 默认显示在左侧
        top: position.y - 60,   //稍微向上偏移
      }}
    >
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-line-dark">
        <div className={`w-2 h-2 rounded-full ${type === 'bid' ? 'bg-up' : 'bg-down'}`} />
        <span className="text-sm font-bold font-mono text-text-primary">
           ≈ {new Decimal(price).toFixed(2)}
        </span>
      </div>
      
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-text-tertiary">均价:</span>
          <span className="text-text-primary font-mono">{formattedStats.avg}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">累计数量:</span>
          <span className="text-text-primary font-mono">{formattedStats.base}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">累计金额:</span>
          <span className="text-text-primary font-mono">{formattedStats.quote}</span>
        </div>
      </div>
    </div>
  );
});
