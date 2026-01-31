/**
 * 画线类型定义
 */

import type { IPriceLine, ISeriesApi } from 'lightweight-charts';

// 画线类型
export type DrawingType = 'horizontal' | 'trendline' | 'fibonacci';

// 画线工具（可选择的工具）
export type DrawingTool = DrawingType | null;

// 画线点
export interface DrawingPoint {
  time: number;  // 秒（lightweight-charts 时间格式）
  price: number;
}

// 画线样式
export interface DrawingStyle {
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

// 画线对象
export interface Drawing {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  style: DrawingStyle;
  visible: boolean;
  // locked: boolean;  // 暂不使用
}

// 画线元素（lightweight-charts 实际渲染元素）
export interface DrawingElement {
  id: string;
  type: DrawingType;
  priceLine?: IPriceLine;
  lineSeries?: ISeriesApi<'Line'>;
}

// 默认样式
export const DEFAULT_STYLES: Record<DrawingType, DrawingStyle> = {
  horizontal: {
    color: '#2962FF',
    lineWidth: 2,
    lineStyle: 'solid',
  },
  trendline: {
    color: '#FF6D00',
    lineWidth: 2,
    lineStyle: 'solid',
  },
  fibonacci: {
    color: '#9C27B0',
    lineWidth: 1,
    lineStyle: 'dashed',
  },
};

// 斐波那契水平
export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// 线条样式映射到 lightweight-charts
export const LINE_STYLE_MAP = {
  solid: 0,
  dashed: 1,
  dotted: 2,
} as const;
