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
    <div className="flex items-center gap-2 p-3 bg-bg-secondary border-b border-border-primary">
      <span className="text-sm text-gray-400">时间周期：</span>
      <div className="flex gap-1">
        {intervals.map((interval) => (
          <button
            key={interval.value}
            onClick={() => setCurrentInterval(interval.value)}
            className={`
              px-3 py-1.5 text-sm rounded transition-colors
              ${
                currentInterval === interval.value
                  ? 'bg-up text-white font-medium'
                  : 'bg-bg-tertiary text-gray-300 hover:bg-bg-primary'
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
