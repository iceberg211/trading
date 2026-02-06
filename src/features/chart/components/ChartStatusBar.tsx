import { useMemo } from 'react';

export interface ChartStatusBarProps {
  wsStatus: string;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

export function ChartStatusBar({
  wsStatus,
  loading,
  loadingMore,
  hasMore,
  error
}: ChartStatusBarProps) {
  // WS 状态显示配置
  const wsStatusInfo = useMemo(() => {
    const baseClass = "px-1.5 py-0.5 rounded font-medium";
    switch (wsStatus) {
      case 'connected':
        return { text: '实时', className: `${baseClass} bg-up-bg text-up` };
      case 'connecting':
        return { text: '…', className: `${baseClass} bg-accent/10 text-accent` };
      case 'reconnecting':
        return { text: '重连', className: `${baseClass} bg-accent/10 text-accent` };
      case 'disconnected':
        return { text: '离线', className: `${baseClass} bg-down-bg text-down` };
      default:
        return { text: wsStatus, className: `${baseClass} bg-down-bg text-down` };
    }
  }, [wsStatus]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1 bg-bg-panel border-b border-line-dark text-[10px]">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-text-secondary">连接:</span>
          <span className={wsStatusInfo.className}>
            {wsStatusInfo.text}
          </span>
        </div>
        
        {loading && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 border border-up border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary">加载中…</span>
          </div>
        )}
        
        {loadingMore && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 border border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary">加载更多…</span>
          </div>
        )}
        
        {!hasMore && !loading && !loadingMore && (
          <span className="text-text-tertiary">无更多数据</span>
        )}
      </div>

      {error && <div className="text-down">{error}</div>}
    </div>
  );
}
