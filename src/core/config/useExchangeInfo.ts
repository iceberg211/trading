/**
 * useExchangeInfo Hook
 * 提供 React 组件访问交易规则的接口
 */

import { useState, useEffect, useCallback } from 'react';
import { exchangeInfo, type SymbolConfig } from '@/core/config';

interface UseExchangeInfoReturn {
  ready: boolean;
  loading: boolean;
  symbolCount: number;
  getSymbol: (symbol: string) => SymbolConfig | undefined;
  searchSymbols: (query: string, limit?: number) => SymbolConfig[];
  getPopularSymbols: () => SymbolConfig[];
  refresh: () => Promise<void>;
}

/**
 * 交易规则 Hook
 * 自动初始化 ExchangeInfo 服务并提供查询接口
 */
export function useExchangeInfo(): UseExchangeInfoReturn {
  const [status, setStatus] = useState(exchangeInfo.getStatus());

  useEffect(() => {
    // 初始化服务
    exchangeInfo.initialize().then(() => {
      setStatus(exchangeInfo.getStatus());
    });
  }, []);

  const getSymbol = useCallback((symbol: string) => {
    return exchangeInfo.getSymbol(symbol);
  }, []);

  const searchSymbols = useCallback((query: string, limit = 20) => {
    return exchangeInfo.searchSymbols(query, limit);
  }, []);

  const getPopularSymbols = useCallback(() => {
    return exchangeInfo.getPopularSymbols();
  }, []);

  const refresh = useCallback(async () => {
    setStatus({ ...status, loading: true });
    await exchangeInfo.refresh();
    setStatus(exchangeInfo.getStatus());
  }, [status]);

  return {
    ready: status.ready,
    loading: status.loading,
    symbolCount: status.count,
    getSymbol,
    searchSymbols,
    getPopularSymbols,
    refresh,
  };
}
