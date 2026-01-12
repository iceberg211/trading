import { useAtom } from 'jotai';
import { intervalAtom } from '../atoms/klineAtom';
import type { KlineInterval } from '@/types/binance';

const intervals: { value: KlineInterval; label: string }[] = [
  { value: '1m', label: '1分钟' },
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '1h', label: '1小时' },
  { value: '4h', label: '4小时' },
  { value: '1d', label: '1天' },
];

export function ChartToolbar() {
  const [currentInterval, setCurrentInterval] = useAtom(intervalAtom);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-3 bg-bg-secondary/80 border-b border-white/10">
      <span className="text-sm text-slate-400">时间周期</span>
      <div className="flex flex-wrap gap-2">
        {intervals.map((interval) => (
          <button
            key={interval.value}
            onClick={() => setCurrentInterval(interval.value)}
            className={`
              px-3.5 py-1.5 text-sm rounded-full border transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-0
              ${
                currentInterval === interval.value
                  ? 'bg-up/80 text-white font-medium border-up/40 shadow-[0_8px_20px_-12px_rgba(20,184,166,0.9)]'
                  : 'bg-bg-tertiary/80 text-slate-300 border-white/10 hover:bg-bg-primary/80'
              }
            `}
          >
            {interval.label}
          </button>
        ))}
      </div>
    </div>
  );
}
