import { useAtomValue } from 'jotai';
import { useRef } from 'react';
import { symbolAtom } from '@/features/symbol/atoms/symbolAtom';
import { tickerAtom } from '@/features/ticker/atoms/tickerAtom';
import { useTicker } from '@/features/ticker/hooks/useTicker';
import { SymbolSelector } from './SymbolSelector';
import { PriceFlash } from '../ui/PriceFlash';

// 格式化大数字
const formatLargeNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
  return num.toFixed(2);
};

// 格式化价格
const formatPrice = (value: string, decimals = 2): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return '--';
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export function TickerBar() {
  const symbol = useAtomValue(symbolAtom);
  const ticker = useAtomValue(tickerAtom);
  const prevPriceRef = useRef<string>('');
  
  // 初始化 Ticker 数据加载
  useTicker();

  const lastPrice = ticker?.lastPrice || '';
  const priceChangePercent = ticker?.priceChangePercent 
    ? parseFloat(ticker.priceChangePercent) 
    : 0;
  const isPositive = priceChangePercent >= 0;

  // 获取交易对的 base 币种（用于显示成交量单位）
  const baseAsset = symbol.replace('USDT', '');
  
  // 更新前一价格引用
  if (lastPrice && lastPrice !== prevPriceRef.current) {
    prevPriceRef.current = lastPrice;
  }

  return (
    <div className="relative flex items-center bg-bg-card/90 backdrop-blur border-b border-line-dark">
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

      {/* Symbol Selector - 独立容器，不受 overflow 影响 */}
        <div className="flex items-center gap-2 shrink-0 px-4 py-2.5">

        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-bold text-white">
          {baseAsset.charAt(0)}
        </div>
        <SymbolSelector />
      </div>

      {/* Divider */}
      <div className="w-px h-7 bg-line-dark shrink-0" />


      {/* 可滚动区域：价格和统计数据 */}
      <div className="flex items-center gap-4 lg:gap-6 px-4 py-2.5 overflow-x-auto">

        {/* Last Price with Flash Animation */}
        <div className="shrink-0">
          <div className="font-heading text-2xl lg:text-3xl font-bold font-mono tracking-tight">

            <PriceFlash 
              price={lastPrice} 
              precision={2}
              className={isPositive ? 'text-up' : 'text-down'}
            />
          </div>
          <div className="text-[10px] text-text-tertiary">
            ≈ ${lastPrice ? formatPrice(lastPrice) : '--'}
          </div>
        </div>

        {/* 24h Stats */}
        <div className="flex items-center gap-4 lg:gap-6 text-[11px] shrink-0">

          <div>
            <span className="text-text-tertiary block text-[10px]">24h Change</span>
            <span className={`font-mono font-medium ${isPositive ? 'text-up' : 'text-down'}`}>
              {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>
          <div className="hidden sm:block">
            <span className="text-text-tertiary block text-[10px]">24h High</span>
            <span className="text-text-primary font-mono">
              {ticker?.highPrice ? formatPrice(ticker.highPrice) : '--'}
            </span>
          </div>
          <div className="hidden sm:block">
            <span className="text-text-tertiary block text-[10px]">24h Low</span>
            <span className="text-text-primary font-mono">
              {ticker?.lowPrice ? formatPrice(ticker.lowPrice) : '--'}
            </span>
          </div>
          <div className="hidden md:block">
            <span className="text-text-tertiary block text-[10px]">24h Vol({baseAsset})</span>
            <span className="text-text-primary font-mono">
              {ticker?.volume ? formatLargeNumber(ticker.volume) : '--'}
            </span>
          </div>
          <div className="hidden lg:block">
            <span className="text-text-tertiary block text-[10px]">24h Vol(USDT)</span>
            <span className="text-text-primary font-mono">
              {ticker?.quoteVolume ? formatLargeNumber(ticker.quoteVolume) : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
