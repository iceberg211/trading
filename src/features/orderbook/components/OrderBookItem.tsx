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
    <div className="relative grid grid-cols-3 gap-2 px-2 py-0.5 text-xs hover:bg-white/5 group z-0 cursor-default">
      {/* 深度背景条 */}
      <div
        className={`absolute top-0 right-0 bottom-0 transition-all duration-200 opacity-10 ${
          type === 'bid' ? 'bg-up' : 'bg-down'
        }`}
        style={{ width: `${width}%` }}
      />
      
      <span className={`z-10 font-medium font-mono ${type === 'bid' ? 'text-up' : 'text-down'}`}>
        {formattedPrice}
      </span>
      <span className="z-10 text-right text-slate-300 group-hover:text-white font-mono opacity-80">
        {formattedQty}
      </span>
      <span className="z-10 text-right text-slate-400 group-hover:text-slate-200 font-mono opacity-60">
        {formattedTotal}
      </span>
    </div>
  );
}
