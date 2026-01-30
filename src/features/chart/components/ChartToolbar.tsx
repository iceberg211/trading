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

interface ChartToolbarProps {
  chartType: 'candles' | 'line';
  showVolume: boolean;
  showMA: boolean;
  showEMA: boolean;
  onChangeChartType: (type: 'candles' | 'line') => void;
  onToggleVolume: () => void;
  onToggleMA: () => void;
  onToggleEMA: () => void;
  onResetScale: () => void;
  onGoToLatest: () => void;
}

export function ChartToolbar({
  chartType,
  showVolume,
  showMA,
  showEMA,
  onChangeChartType,
  onToggleVolume,
  onToggleMA,
  onToggleEMA,
  onResetScale,
  onGoToLatest,
}: ChartToolbarProps) {
  const [currentInterval, setCurrentInterval] = useAtom(intervalAtom);

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      
      <div className="h-4 w-px bg-line-dark" />
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChangeChartType('candles')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            chartType === 'candles'
              ? 'text-text-primary bg-bg-soft'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
          }`}
        >
          蜡烛
        </button>
        <button
          onClick={() => onChangeChartType('line')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            chartType === 'line'
              ? 'text-text-primary bg-bg-soft'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
          }`}
        >
          折线
        </button>
      </div>
      
      <div className="h-4 w-px bg-line-dark" />
      
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleVolume}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showVolume
              ? 'text-text-primary bg-bg-soft'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
          }`}
        >
          VOL
        </button>
        <button
          onClick={onToggleMA}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showMA
              ? 'text-text-primary bg-bg-soft'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
          }`}
        >
          MA
        </button>
        <button
          onClick={onToggleEMA}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showEMA
              ? 'text-text-primary bg-bg-soft'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
          }`}
        >
          EMA
        </button>
      </div>
      
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onResetScale}
          className="px-2 py-1 text-xs rounded text-text-secondary hover:text-text-primary hover:bg-bg-soft/60 transition-colors"
        >
          重置
        </button>
        <button
          onClick={onGoToLatest}
          className="px-2 py-1 text-xs rounded text-text-secondary hover:text-text-primary hover:bg-bg-soft/60 transition-colors"
        >
          最新
        </button>
      </div>
    </div>
  );
}
