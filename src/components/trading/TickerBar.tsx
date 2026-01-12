import { useAtomValue } from 'jotai';
import { orderBookAtom } from '@/features/orderbook/atoms/orderBookAtom';
import Decimal from 'decimal.js';
import { SymbolSelector } from './SymbolSelector';

// 模拟 24h 数据
const mock24hData = {
  high: '98,500.00',
  low: '94,200.00',
  volume: '12,345.67',
  quoteVolume: '1.2B',
  priceChangePercent: '+2.45',
};

export function TickerBar() {
  const orderBook = useAtomValue(orderBookAtom);
  
  const lastPrice = orderBook.asks.length > 0 
    ? new Decimal(orderBook.asks[0][0]).toFixed(2) 
    : '--';

  const isPositive = mock24hData.priceChangePercent.startsWith('+');

  return (
    <div className="flex items-center gap-4 lg:gap-6 px-4 py-2 bg-bg-card overflow-x-auto">
      {/* Symbol Selector */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-bold text-white">
          ₿
        </div>
        <SymbolSelector />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-line shrink-0" />

      {/* Last Price */}
      <div className="shrink-0">
        <div className={`font-heading text-xl font-bold font-mono ${isPositive ? 'text-up' : 'text-down'}`}>
          {lastPrice}
        </div>
        <div className="text-[10px] text-text-tertiary">
          ≈ ${lastPrice}
        </div>
      </div>

      {/* 24h Stats */}
      <div className="flex items-center gap-4 lg:gap-6 text-xs shrink-0">
        <div>
          <span className="text-text-tertiary block text-[10px]">24h Change</span>
          <span className={`font-mono font-medium ${isPositive ? 'text-up' : 'text-down'}`}>
            {mock24hData.priceChangePercent}%
          </span>
        </div>
        <div className="hidden sm:block">
          <span className="text-text-tertiary block text-[10px]">24h High</span>
          <span className="text-text-primary font-mono">{mock24hData.high}</span>
        </div>
        <div className="hidden sm:block">
          <span className="text-text-tertiary block text-[10px]">24h Low</span>
          <span className="text-text-primary font-mono">{mock24hData.low}</span>
        </div>
        <div className="hidden md:block">
          <span className="text-text-tertiary block text-[10px]">24h Vol(BTC)</span>
          <span className="text-text-primary font-mono">{mock24hData.volume}</span>
        </div>
        <div className="hidden lg:block">
          <span className="text-text-tertiary block text-[10px]">24h Vol(USDT)</span>
          <span className="text-text-primary font-mono">{mock24hData.quoteVolume}</span>
        </div>
      </div>
    </div>
  );
}
