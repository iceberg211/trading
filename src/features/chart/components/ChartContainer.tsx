import { useCallback, useState } from 'react';
import { useKlineData } from '../hooks/useKlineData';
import { useChartInstance } from '../hooks/useChartInstance';
import { ChartToolbar } from './ChartToolbar';
import { OHLCVPanel } from './OHLCVPanel';


export function ChartContainer() {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const { loading, error, wsStatus, loadMore, loadingMore, hasMore } = useKlineData();
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  const [showVolume, setShowVolume] = useState(true);
  const [showMA, setShowMA] = useState(true);
  const [showEMA, setShowEMA] = useState(false);
  
  const { resetScale, goToLatest } = useChartInstance({
    container: containerEl,
    onLoadMore: loadMore,
    chartType,
    showVolume,
    showMA,
    showEMA,
  });
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node);
  }, []);

  return (
    <div className="flex flex-col h-full bg-bg-card/90 backdrop-blur">
      {/* 工具栏 */}
      <div className="border-b border-line-dark px-2 bg-bg-soft/70">
         <ChartToolbar
           chartType={chartType}
           showVolume={showVolume}
           showMA={showMA}
           showEMA={showEMA}
           onChangeChartType={setChartType}
           onToggleVolume={() => setShowVolume((v) => !v)}
           onToggleMA={() => setShowMA((v) => !v)}
           onToggleEMA={() => setShowEMA((v) => !v)}
           onResetScale={resetScale}
           onGoToLatest={goToLatest}
         />
       </div>


      {/* OHLCV 悬浮信息 - 固定高度避免图表抖动 */}
      <div className="px-3 py-1.5 bg-bg-panel border-b border-line-dark h-[28px] overflow-hidden">
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
          
          {loadingMore && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 border border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary">Loading more...</span>
            </div>
          )}
          
          {!hasMore && !loading && !loadingMore && (
            <span className="text-text-tertiary">No more data</span>
          )}
        </div>

        {error && <div className="text-down">{error}</div>}
      </div>

      {/* 图表 */}
      <div ref={setContainerRef} className="flex-1 min-h-0" />
    </div>
  );
}
