import Decimal from 'decimal.js';

interface OrderBookItemProps {
  price: string;
  qty: string;
  total: string;
  maxTotal: number;
  type: 'bid' | 'ask';
}

export function OrderBookItem({ price, qty, total, maxTotal, type }: OrderBookItemProps) {
  // 计算深度条宽度百分比
  const width = Math.min((parseFloat(total) / maxTotal) * 100, 100);
  
  const formattedPrice = new Decimal(price).toFixed(2);
  const formattedQty = new Decimal(qty).toFixed(4);
  const formattedTotal = new Decimal(total).toFixed(2);

  return (
    <div className="relative grid grid-cols-3 gap-2 px-3 py-[1px] text-xs hover:bg-bg-hover cursor-pointer transition-colors">
      {/* 深度背景条 (Depth Bar) */}
      <div
        className={`absolute top-0 right-0 bottom-0 transition-all duration-200 z-0 ${
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
}
