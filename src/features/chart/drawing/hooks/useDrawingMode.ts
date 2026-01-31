/**
 * 画线模式 Hook
 * 管理画线工具的激活状态和绘图交互
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { IChartApi } from 'lightweight-charts';
import type { DrawingType, DrawingPoint } from '../types';
import { drawingManager } from '../DrawingManager';

interface UseDrawingModeOptions {
  chart: IChartApi | null;
  onDrawingComplete?: (id: string) => void;
}

interface UseDrawingModeReturn {
  activeToolType: DrawingType | null;
  isDrawing: boolean;
  setToolType: (type: DrawingType | null) => void;
  cancelDrawing: () => void;
}

/**
 * 画线模式 Hook
 */
export function useDrawingMode({ chart, onDrawingComplete }: UseDrawingModeOptions): UseDrawingModeReturn {
  const [activeToolType, setActiveToolType] = useState<DrawingType | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const pendingPoint = useRef<DrawingPoint | null>(null);

  /**
   * 设置当前工具类型
   */
  const setToolType = useCallback((type: DrawingType | null) => {
    setActiveToolType(type);
    setIsDrawing(false);
    pendingPoint.current = null;
  }, []);

  /**
   * 取消绘制
   */
  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    pendingPoint.current = null;
  }, []);

  /**
   * 处理图表点击事件
   */
  useEffect(() => {
    if (!chart || !activeToolType) return;

    const handleClick = (param: { time?: any; point?: { x: number; y: number } }) => {
      if (!param.time || !param.point) return;

      // 获取时间戳（秒）
      const timeValue = typeof param.time === 'number' ? param.time : new Date(param.time).getTime() / 1000;

      // 获取价格坐标
      const mainSeries = (chart as any).series?.values()?.next()?.value;
      if (!mainSeries) return;
      
      const coordinate = chart.timeScale().timeToCoordinate(param.time as any);
      if (coordinate === null) return;

      const price = mainSeries.coordinateToPrice(param.point.y);
      if (price === null) return;

      const point: DrawingPoint = {
        time: timeValue * 1000, // 转换为毫秒
        price,
      };

      if (activeToolType === 'horizontal') {
        // 水平线只需要一次点击
        const id = drawingManager.addHorizontalLine(price);
        onDrawingComplete?.(id);
        setToolType(null);
      } else if (activeToolType === 'trendline' || activeToolType === 'fibonacci') {
        // 趋势线和斐波那契需要两次点击
        if (!pendingPoint.current) {
          pendingPoint.current = point;
          setIsDrawing(true);
        } else {
          const id = activeToolType === 'trendline'
            ? drawingManager.addTrendLine(pendingPoint.current, point)
            : drawingManager.addFibonacci(pendingPoint.current, point);
          onDrawingComplete?.(id);
          pendingPoint.current = null;
          setIsDrawing(false);
          setToolType(null);
        }
      }
    };

    chart.subscribeClick(handleClick);


    return () => {
      chart.unsubscribeClick(handleClick);
    };
  }, [chart, activeToolType, onDrawingComplete, setToolType]);

  return {
    activeToolType,
    isDrawing,
    setToolType,
    cancelDrawing,
  };
}
