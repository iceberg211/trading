import { useRef } from 'react';
import { useKlineData } from '../hooks/useKlineData';
import { useChartInstance } from '../hooks/useChartInstance';
import { ChartToolbar } from './ChartToolbar';
import { OHLCVPanel } from './OHLCVPanel';


export function ChartContainer() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { loading, error, wsStatus } = useKlineData();
  useChartInstance({ container: chartContainerRef.current });

  return (
    <div className="flex flex-col h-full bg-bg-card/90 backdrop-blur">
      {/* 工具栏 */}
      <div className="border-b border-line-dark px-2 bg-bg-soft/70">
         <ChartToolbar />
       </div>


      {/* OHLCV 悬浮信息 */}
      <div className="px-3 py-1.5 bg-bg-panel border-b border-line-dark min-h-[28px]">
        <OHLCVPanel />
      </div>

      {/* 状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1 bg-bg-panel border-b border-line-dark text-[10px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary">WS:</span>
            <span
              className={`
                px-1.5 py-0.5 rounded font-medium
                ${
                  wsStatus === 'connected'
                    ? 'bg-up-bg text-up'
                    : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-down-bg text-down'
                }
              `}
            >
              {{
                connected: 'Live',
                connecting: '...',
                reconnecting: 'Retry',
                disconnected: 'Off',
              }[wsStatus]}
            </span>
          </div>
          
          {loading && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 border border-up border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary">Loading...</span>
            </div>
          )}
        </div>

        {error && <div className="text-down">{error}</div>}
      </div>

      {/* 图表 */}
      <div ref={chartContainerRef} className="flex-1 min-h-0" />
    </div>
  );
}
