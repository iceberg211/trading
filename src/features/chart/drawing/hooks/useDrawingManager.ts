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

  // 创建/销毁 Manager
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;

    if (!chart || !series) {
      return;
    }

    // 创建新的 Manager
    const newManager = new DrawingManager(chart, series);
    
    // 监听变化
    newManager.onDrawingsChanged = (updatedDrawings) => {
      setDrawings(updatedDrawings);
    };

    managerRef.current = newManager;
    setManager(newManager);
    console.log('[useDrawingManager] Manager created');

    return () => {
      newManager.destroy();
      managerRef.current = null;
      setManager(null);
      setDrawings([]);
      console.log('[useDrawingManager] Manager destroyed');
    };
  }, [chartRef, seriesRef]);

  // 轮询检测图表实例可用
  useEffect(() => {
    if (managerRef.current) return;

    const checkInterval = setInterval(() => {
      const chart = chartRef.current;
      const series = seriesRef.current;

      if (chart && series && !managerRef.current) {
        const newManager = new DrawingManager(chart, series);
        newManager.onDrawingsChanged = (updatedDrawings) => {
          setDrawings(updatedDrawings);
        };
        managerRef.current = newManager;
        setManager(newManager);
        console.log('[useDrawingManager] Manager created via polling');
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [chartRef, seriesRef]);

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
