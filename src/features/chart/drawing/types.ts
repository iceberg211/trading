/**
 * 画线工具类型定义
 */

export type DrawingType = 'horizontal' | 'trendline' | 'ray' | 'fibonacci';
export type LineStyle = 'solid' | 'dashed' | 'dotted';

/**
 * 画线点
 */
export interface DrawingPoint {
  time: number;  // Unix 时间戳（毫秒）
  price: number;
}

/**
 * 画线样式
 */
export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: LineStyle;
}

/**
 * 画线对象
 */
export interface Drawing {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  style: DrawingStyle;
  locked: boolean;
  visible: boolean;
}

/**
 * 斐波那契层级
 */
export const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/**
 * 默认画线样式
 */
export const DEFAULT_DRAWING_STYLES: Record<DrawingType, DrawingStyle> = {
  horizontal: { color: '#F0B90B', lineWidth: 1, lineStyle: 'solid' },
  trendline: { color: '#F0B90B', lineWidth: 1, lineStyle: 'solid' },
  ray: { color: '#2196F3', lineWidth: 1, lineStyle: 'dashed' },
  fibonacci: { color: '#9C27B0', lineWidth: 1, lineStyle: 'solid' },
};
