/**
 * useDrawing - 画线交互 Hook
 * 
 * 处理图表点击事件，实现画线功能
 */

import { useEffect, useRef, useCallback, MutableRefObject } from 'react';
import type { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import { drawingManager } from '../drawing';
import type { DrawingPoint } from '../drawing/types';

export type DrawingTool = 'horizontal' | 'trendline' | null;

interface UseDrawingOptions {
  chart: MutableRefObject<IChartApi | null>;
  candleSeries: MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  activeTool: DrawingTool;
  onDrawingComplete?: () => void;
}

export function useDrawing({
  chart,
  candleSeries,
  activeTool,
  onDrawingComplete,
}: UseDrawingOptions) {
  const pendingPointRef = useRef<DrawingPoint | null>(null);
  const isAttachedRef = useRef(false);

  // 绑定 DrawingManager 到图表
  useEffect(() => {
    const chartInstance = chart.current;
    const seriesInstance = candleSeries.current;
    
    if (chartInstance && seriesInstance && !isAttachedRef.current) {
      drawingManager.attach(chartInstance, seriesInstance);
      isAttachedRef.current = true;
    }
    
    return () => {
      if (isAttachedRef.current) {
        drawingManager.detach();
        isAttachedRef.current = false;
      }
    };
  }, [chart, candleSeries]);

  // 处理图表点击
  const handleClick = useCallback((param: MouseEventParams) => {
    if (!activeTool) return;
    
    const chartInstance = chart.current;
    const seriesInstance = candleSeries.current;
    if (!chartInstance || !seriesInstance || !param.point || !param.time) return;
    
    // 获取点击位置的价格
    const price = seriesInstance.coordinateToPrice(param.point.y);
    if (price === null) return;
    
    // 时间戳转换 (lightweight-charts 使用秒)
    const time = typeof param.time === 'number' 
      ? param.time * 1000 
      : new Date(param.time as string).getTime();
    
    const point: DrawingPoint = { time, price };

    if (activeTool === 'horizontal') {
      // 水平线只需要一个点
      drawingManager.addHorizontalLine(price);
      onDrawingComplete?.();
    } else if (activeTool === 'trendline') {
      // 趋势线需要两个点
      if (!pendingPointRef.current) {
        // 第一个点 - 等待第二个
        pendingPointRef.current = point;
      } else {
        // 第二个点 - 完成画线
        drawingManager.addTrendLine(pendingPointRef.current, point);
        pendingPointRef.current = null;
        onDrawingComplete?.();
      }
    }
  }, [activeTool, chart, candleSeries, onDrawingComplete]);

  // 订阅图表点击事件
  useEffect(() => {
    const chartInstance = chart.current;
    if (!chartInstance || !activeTool) {
      pendingPointRef.current = null;
      return;
    }

    chartInstance.subscribeClick(handleClick);
    
    return () => {
      chartInstance.unsubscribeClick(handleClick);
    };
  }, [chart, activeTool, handleClick]);

  // 重置画线状态
  const resetDrawing = useCallback(() => {
    pendingPointRef.current = null;
  }, []);

  // 移除最后一条画线
  const removeLastDrawing = useCallback(() => {
    const drawings = drawingManager.getDrawings();
    if (drawings.length > 0) {
      drawingManager.removeDrawing(drawings[drawings.length - 1].id);
    }
  }, []);

  // 清除所有画线
  const clearAllDrawings = useCallback(() => {
    drawingManager.removeAll();
  }, []);

  return {
    pendingPoint: pendingPointRef.current,
    resetDrawing,
    removeLastDrawing,
    clearAllDrawings,
  };
}
