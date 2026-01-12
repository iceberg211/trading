import { useRef } from 'react';
import { useKlineData } from '../hooks/useKlineData';
import { useChartInstance } from '../hooks/useChartInstance';
import { ChartToolbar } from './ChartToolbar';

export function ChartContainer() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { loading, error, wsStatus } = useKlineData();
  useChartInstance({ container: chartContainerRef.current });

  return (
    <div className="flex flex-col h-full bg-bg-secondary rounded-lg overflow-hidden">
      {/* 工具栏 */}
      <ChartToolbar />

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-bg-tertiary border-b border-border-primary text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">连接状态:</span>
            <span
              className={`
                px-2 py-0.5 rounded
                ${
                  wsStatus === 'connected'
                    ? 'bg-up/20 text-up'
                    : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                    ? 'bg-yellow-500/20 text-yellow-500'
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
              <div className="w-3 h-3 border-2 border-up border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-400">加载中...</span>
            </div>
          )}
        </div>

        {error && (
          <div className="text-down">{error}</div>
        )}
      </div>

      {/* 图表 */}
      <div ref={chartContainerRef} className="flex-1" />
    </div>
  );
}
