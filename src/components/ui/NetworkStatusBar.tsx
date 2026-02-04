import { memo } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

/**
 * 网络状态提示栏
 * 断网时显示红色横幅，恢复后显示绿色提示
 */
export const NetworkStatusBar = memo(function NetworkStatusBar() {
  const { isOnline, wasOffline } = useNetworkStatus();

  // 离线状态
  if (!isOnline) {
    return (
      <div className="bg-down text-white px-4 py-2 text-center text-sm font-medium animate-pulse">
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" 
            />
          </svg>
          网络已断开，正在等待恢复连接…
        </span>
      </div>
    );
  }

  // 刚刚恢复连接
  if (wasOffline) {
    return (
      <div className="bg-up text-white px-4 py-2 text-center text-sm font-medium">
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          网络已恢复，正在同步数据…
        </span>
      </div>
    );
  }

  // 正常状态不显示任何内容
  return null;
});
