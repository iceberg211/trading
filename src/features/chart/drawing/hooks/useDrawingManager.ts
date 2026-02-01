/**
 * useDrawingManager - 画线管理器生命周期 Hook
 * 
 * 创建和管理 DrawingManager 实例
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { DrawingManager } from '../core/DrawingManager';
import type { Drawing } from '../core/types';

interface UseDrawingManagerOptions {
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
}

export function useDrawingManager({ chartRef, seriesRef }: UseDrawingManagerOptions) {
  const [manager, setManager] = useState<DrawingManager | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const managerRef = useRef<DrawingManager | null>(null);
  const boundChartRef = useRef<IChartApi | null>(null);
  const boundSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const destroyManager = useCallback(() => {
    if (!managerRef.current) return;
    managerRef.current.destroy();
    managerRef.current = null;
    setManager(null);
    setDrawings([]);
    boundChartRef.current = null;
    boundSeriesRef.current = null;
    console.log('[useDrawingManager] Manager destroyed');
  }, []);

  const createManager = useCallback((chart: IChartApi, series: ISeriesApi<'Candlestick'>) => {
    const newManager = new DrawingManager(chart, series);
    newManager.onDrawingsChanged = (updatedDrawings) => {
      setDrawings(updatedDrawings);
    };
    managerRef.current = newManager;
    setManager(newManager);
    boundChartRef.current = chart;
    boundSeriesRef.current = series;
    console.log('[useDrawingManager] Manager created');
  }, []);

  // 监听 chart/series 变化，自动重新绑定
  useEffect(() => {
    const syncManager = () => {
      const chart = chartRef.current;
      const series = seriesRef.current;

      if (!chart || !series) {
        if (managerRef.current) {
          destroyManager();
        }
        return;
      }

      const chartChanged = chart !== boundChartRef.current;
      const seriesChanged = series !== boundSeriesRef.current;

      if (chartChanged || seriesChanged || !managerRef.current) {
        destroyManager();
        createManager(chart, series);
      }
    };

    syncManager();
    const checkInterval = setInterval(syncManager, 200);
    return () => {
      clearInterval(checkInterval);
      destroyManager();
    };
  }, [chartRef, seriesRef, createManager, destroyManager]);

  // 清除所有画线
  const clearAll = useCallback(() => {
    managerRef.current?.removeAll();
  }, []);

  // 移除最后一条
  const removeLast = useCallback(() => {
    managerRef.current?.removeLast();
  }, []);

  return {
    manager,
    drawings,
    drawingsCount: drawings.length,
    clearAll,
    removeLast,
  };
}
