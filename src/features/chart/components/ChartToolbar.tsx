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
    <div className="flex items-center gap-1">
      {intervals.map((interval) => (
        <button
          key={interval.value}
          onClick={() => setCurrentInterval(interval.value)}
          className={`
            px-2 py-1 text-xs font-medium rounded transition-colors
            ${
              currentInterval === interval.value
                ? 'text-text-primary bg-bg-soft'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
            }
          `}
        >
          {interval.label}
        </button>
      ))}
    </div>
  );
}
