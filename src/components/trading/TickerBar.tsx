import { useAtomValue } from 'jotai';
import { orderBookAtom } from '@/features/orderbook/atoms/orderBookAtom';
import Decimal from 'decimal.js';

// 模拟 24h 数据（真实场景应从 API 获取）
const mock24hData = {
  high: '98500.00',
  low: '94200.00',
  volume: '12345.67',
  quoteVolume: '1.2B',
  priceChange: '+2.45',
  priceChangePercent: '+2.45',
};

export function TickerBar() {
  const orderBook = useAtomValue(orderBookAtom);
  
  // 获取最新价格（卖一）
  const lastPrice = orderBook.asks.length > 0 
    ? new Decimal(orderBook.asks[0][0]).toFixed(2) 
    : '--';

  const isPositive = mock24hData.priceChange.startsWith('+');

  return (
    <div className="flex items-center gap-6 px-4 py-2.5 bg-bg-secondary/50 border-b border-white/10 overflow-x-auto">
      {/* 交易对 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white">
          ₿
        </div>
        <div>
          <h2 className="font-heading text-lg font-bold text-white">BTC/USDT</h2>
          <span className="text-xs text-slate-500">Bitcoin</span>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-8 bg-white/10 shrink-0" />

      {/* 最新价格 */}
      <div className="shrink-0">
        <div className={`font-heading text-2xl font-bold ${isPositive ? 'text-up' : 'text-down'}`}>
          {lastPrice}
        </div>
        <div className={`text-xs ${isPositive ? 'text-up' : 'text-down'}`}>
          ≈ ${lastPrice} USD
        </div>
      </div>

      {/* 24h 数据 */}
      <div className="flex items-center gap-6 text-xs shrink-0">
        <div>
          <span className="text-slate-500 block">24h涨跌</span>
          <span className={`font-mono ${isPositive ? 'text-up' : 'text-down'}`}>
            {mock24hData.priceChangePercent}%
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">24h最高</span>
          <span className="text-slate-200 font-mono">{mock24hData.high}</span>
        </div>
        <div>
          <span className="text-slate-500 block">24h最低</span>
          <span className="text-slate-200 font-mono">{mock24hData.low}</span>
        </div>
        <div>
          <span className="text-slate-500 block">24h成交量(BTC)</span>
          <span className="text-slate-200 font-mono">{mock24hData.volume}</span>
        </div>
        <div>
          <span className="text-slate-500 block">24h成交额</span>
          <span className="text-slate-200 font-mono">{mock24hData.quoteVolume}</span>
        </div>
      </div>
    </div>
  );
}
