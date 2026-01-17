import { useState, useEffect, useCallback } from 'react';
import { atom, useAtom } from 'jotai';

// 全局网络状态 atom
export const networkStatusAtom = atom({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isVisible: typeof document !== 'undefined' ? !document.hidden : true,
  lastOnlineTime: Date.now(),
});

interface NetworkStatus {
  isOnline: boolean;
  isVisible: boolean;
  wasOffline: boolean;
  offlineDuration: number;
}

/**
 * 网络状态监听 Hook
 * 监听 navigator.onLine 和 visibilitychange
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useAtom(networkStatusAtom);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: true,
      lastOnlineTime: Date.now(),
    }));
  }, [setStatus]);

  const handleOffline = useCallback(() => {
    setWasOffline(true);
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
    }));
  }, [setStatus]);

  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    setStatus((prev) => ({
      ...prev,
      isVisible,
    }));
  }, [setStatus]);

  useEffect(() => {
    // 初始化状态
    setStatus((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
      isVisible: !document.hidden,
    }));

    // 添加事件监听
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleOnline, handleOffline, handleVisibilityChange, setStatus]);

  // 计算离线时长
  const offlineDuration = status.isOnline ? 0 : Date.now() - status.lastOnlineTime;

  // 重置 wasOffline 标志
  useEffect(() => {
    if (status.isOnline && wasOffline) {
      const timer = setTimeout(() => setWasOffline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status.isOnline, wasOffline]);

  return {
    isOnline: status.isOnline,
    isVisible: status.isVisible,
    wasOffline,
    offlineDuration,
  };
}
