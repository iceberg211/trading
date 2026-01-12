import { useRef } from 'react';
import { useKlineData } from '../hooks/useKlineData';
import { useChartInstance } from '../hooks/useChartInstance';
import { ChartToolbar } from './ChartToolbar';
import { Card } from '@/components/ui';

export function ChartContainer() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { loading, error, wsStatus } = useKlineData();
  useChartInstance({ container: chartContainerRef.current });

  return (
    <Card noPadding className="flex flex-col h-full">
      {/* 工具栏 */}
      <ChartToolbar />

      {/* 状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-bg-tertiary/30 border-b border-white/10 text-[10px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">WS:</span>
            <span
              className={`
                px-1.5 py-0.5 rounded font-medium
                ${
                  wsStatus === 'connected'
                    ? 'bg-up/20 text-up'
                    : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-down/20 text-down'
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
              <span className="text-slate-500">加载中</span>
            </div>
          )}
        </div>

        {error && <div className="text-down">{error}</div>}
      </div>

      {/* 图表 */}
      <div ref={chartContainerRef} className="flex-1 min-h-0" />
    </Card>
  );
}
