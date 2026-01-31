/**
 * useDrawingTools - 画线工具交互 Hook
 * 
 * 管理工具状态和图表点击事件
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { IChartApi, MouseEventParams } from 'lightweight-charts';
import type { DrawingManager } from '../core/DrawingManager';
import type { DrawingTool, DrawingPoint } from '../core/types';

interface UseDrawingToolsOptions {
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<any>;
  manager: DrawingManager | null;
  onDrawingComplete?: () => void;
}

export function useDrawingTools({
  chartRef,
  seriesRef,
  manager,
  onDrawingComplete,
}: UseDrawingToolsOptions) {
  const [activeTool, setActiveTool] = useState<DrawingTool>(null);
  const [pendingPoint, setPendingPoint] = useState<DrawingPoint | null>(null);
  const pendingPointRef = useRef<DrawingPoint | null>(null);

  // 同步 ref
  useEffect(() => {
    pendingPointRef.current = pendingPoint;
  }, [pendingPoint]);

  // 处理图表点击
  const handleClick = useCallback((param: MouseEventParams) => {
    if (!activeTool || !manager) return;

    const series = seriesRef.current;
    if (!series || !param.point || !param.time) return;

    // 获取点击位置的价格
    const price = series.coordinateToPrice(param.point.y);
    if (price === null) return;

    // 时间戳
    const time = typeof param.time === 'number'
      ? param.time
      : Math.floor(new Date(param.time as string).getTime() / 1000);

    const point: DrawingPoint = { time, price };
    console.log('[useDrawingTools] Click at:', point);

    if (activeTool === 'horizontal') {
      manager.addHorizontalLine(price);
      setActiveTool(null);
      onDrawingComplete?.();
    } else if (activeTool === 'trendline' || activeTool === 'fibonacci') {
      if (!pendingPointRef.current) {
        // 第一个点
        setPendingPoint(point);
        console.log('[useDrawingTools] First point set');
      } else {
        // 第二个点 - 完成绘制
        if (activeTool === 'trendline') {
          manager.addTrendLine(pendingPointRef.current, point);
        } else {
          manager.addFibonacci(pendingPointRef.current, point);
        }
        setPendingPoint(null);
        setActiveTool(null);
        onDrawingComplete?.();
      }
    }
  }, [activeTool, manager, seriesRef, onDrawingComplete]);

  // 订阅点击事件
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (!activeTool) {
      setPendingPoint(null);
      return;
    }

    console.log('[useDrawingTools] Subscribing for tool:', activeTool);
    chart.subscribeClick(handleClick);

    return () => {
      chart.unsubscribeClick(handleClick);
    };
  }, [chartRef, activeTool, handleClick]);

  // ESC 取消绘制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTool) {
        console.log('[useDrawingTools] Cancelled via ESC');
        setPendingPoint(null);
        setActiveTool(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);

  // 选择工具
  const selectTool = useCallback((tool: DrawingTool) => {
    setPendingPoint(null);
    setActiveTool(tool);
    console.log('[useDrawingTools] Tool selected:', tool);
  }, []);

  // 取消当前绘制
  const cancel = useCallback(() => {
    setPendingPoint(null);
    setActiveTool(null);
  }, []);

  return {
    activeTool,
    setActiveTool: selectTool,
    pendingPoint,
    cancel,
    isDrawing: activeTool !== null,
  };
}
