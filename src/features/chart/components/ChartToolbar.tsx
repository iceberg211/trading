import { useAtom } from 'jotai';
import { intervalAtom } from '../atoms/klineAtom';
import { chartViewAtom } from '../atoms/chartViewAtom';
import type { KlineInterval } from '@/types/binance';
import { SegmentedControl } from '@/components/ui';

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
  showBOLL: boolean;
  subchartType: 'MACD' | 'RSI' | 'KDJ' | 'OBV' | 'WR' | null;
  onChangeChartType: (type: 'candles' | 'line') => void;
  onToggleVolume: () => void;
  onToggleMA: () => void;
  onToggleEMA: () => void;
  onToggleBOLL: () => void;
  onSelectSubchart: (type: 'MACD' | 'RSI' | 'KDJ' | 'OBV' | 'WR' | null) => void;
  onResetScale: () => void;
  onGoToLatest: () => void;
}

export function ChartToolbar({
  chartType,
  showVolume,
  showMA,
  showEMA,
  showBOLL,
  subchartType,
  onChangeChartType,
  onToggleVolume,
  onToggleMA,
  onToggleEMA,
  onToggleBOLL,
  onSelectSubchart,
  onResetScale,
  onGoToLatest,
}: ChartToolbarProps) {
  const [currentInterval, setCurrentInterval] = useAtom(intervalAtom);
  const [chartView, setChartView] = useAtom(chartViewAtom);
  const isTradingView = chartView === 'tradingview';

  const btnBase =
    'h-7 px-2 text-xxs font-medium rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35';

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-thin pr-1">
          {intervals.map((interval) => (
            <button
              key={interval.value}
              onClick={() => setCurrentInterval(interval.value)}
              className={`
                ${btnBase} shrink-0
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
      
        <div className="hidden md:block h-4 w-px bg-line-dark" />

        <SegmentedControl
          value={chartView}
          onChange={setChartView}
          options={[
            { value: 'basic', label: '基础图表' },
            { value: 'tradingview', label: 'TradingView' },
          ]}
        />

        {!isTradingView && (
          <>
            <div className="hidden lg:block h-4 w-px bg-line-dark" />

            <SegmentedControl
              value={chartType}
              onChange={onChangeChartType}
              options={[
                { value: 'candles', label: '蜡烛' },
                { value: 'line', label: '折线' },
              ]}
            />

            <div className="hidden lg:block h-4 w-px bg-line-dark" />

            <div className="flex items-center gap-0.5">
              <button
                onClick={onToggleVolume}
                className={`${btnBase} ${
                  showVolume
                    ? 'text-text-primary bg-bg-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
                }`}
              >
                成交量
              </button>
              <button
                onClick={onToggleMA}
                className={`${btnBase} ${
                  showMA
                    ? 'text-text-primary bg-bg-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
                }`}
              >
                均线
              </button>
              <button
                onClick={onToggleEMA}
                className={`${btnBase} ${
                  showEMA
                    ? 'text-text-primary bg-bg-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
                }`}
              >
                EMA
              </button>
              <button
                onClick={onToggleBOLL}
                className={`${btnBase} ${
                  showBOLL
                    ? 'text-text-primary bg-bg-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
                }`}
              >
                布林
              </button>
            </div>

            {/* 副图指标 */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onSelectSubchart('MACD')}
                className={`${btnBase} ${
                  subchartType === 'MACD'
                    ? 'text-text-primary bg-bg-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
                }`}
              >
                MACD
              </button>
              <button
                onClick={() => onSelectSubchart('RSI')}
                className={`${btnBase} ${
                  subchartType === 'RSI'
                    ? 'text-text-primary bg-bg-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
                }`}
              >
                RSI
              </button>
              <button
                onClick={() => onSelectSubchart('KDJ')}
                className={`${btnBase} ${
                  subchartType === 'KDJ'
                    ? 'text-text-primary bg-bg-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
                }`}
              >
                KDJ
              </button>
              <button
                onClick={() => onSelectSubchart('OBV')}
                className={`${btnBase} ${
                  subchartType === 'OBV'
                    ? 'text-text-primary bg-bg-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
                }`}
              >
                OBV
              </button>
              <button
                onClick={() => onSelectSubchart('WR')}
                className={`${btnBase} ${
                  subchartType === 'WR'
                    ? 'text-text-primary bg-bg-soft'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-soft/60'
                }`}
              >
                WR
              </button>
            </div>
          </>
        )}
      </div>

      {!isTradingView && (
        <div className="shrink-0 flex items-center gap-0.5">
          <button
            onClick={onResetScale}
            className={`${btnBase} text-text-secondary hover:text-text-primary hover:bg-bg-soft/60`}
          >
            重置
          </button>
          <button
            onClick={onGoToLatest}
            className={`${btnBase} text-text-secondary hover:text-text-primary hover:bg-bg-soft/60`}
          >
            最新
          </button>
        </div>
      )}
    </div>
  );
}
