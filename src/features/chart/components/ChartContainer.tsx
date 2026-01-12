import { useRef } from 'react';
import { useKlineData } from '../hooks/useKlineData';
import { useChartInstance } from '../hooks/useChartInstance';
import { ChartToolbar } from './ChartToolbar';

export function ChartContainer() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { loading, error, wsStatus } = useKlineData();
  useChartInstance({ container: chartContainerRef.current });

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-bg-secondary/70 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] backdrop-blur">
      {/* 工具栏 */}
      <ChartToolbar />

      {/* 状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-bg-tertiary/70 border-b border-white/10 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">连接状态:</span>
            <span
              className={`
                px-2.5 py-0.5 rounded-full border border-white/10 font-medium
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
                connected: '已连接',
                connecting: '连接中',
                reconnecting: '重连中',
                disconnected: '已断开',
              }[wsStatus]}
            </span>
          </div>
          
          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-up border-t-transparent rounded-full animate-spin motion-reduce:animate-none"></div>
              <span className="text-slate-400">加载中...</span>
            </div>
          )}
        </div>

        {error && (
          <div className="text-down" role="alert">
            {error}
          </div>
        )}
      </div>

      {/* 图表 */}
      <div ref={chartContainerRef} className="flex-1" />
    </div>
  );
}
