/**
 * 技术指标类型定义
 */

export type IndicatorType = 'MA' | 'EMA' | 'BOLL' | 'MACD' | 'RSI' | 'KDJ' | 'OBV' | 'WR';
export type IndicatorLayer = 'main' | 'sub';

/**
 * 指标配置
 */
export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  layer: IndicatorLayer;
  params: Record<string, number>;
  colors: string[];
  visible: boolean;
}

/**
 * 通用指标结果
 */
export interface IndicatorResult {
  time: number;
  value: number | null;
}

/**
 * 布林带结果
 */
export interface BollResult {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

/**
 * MACD 结果
 */
export interface MacdResult {
  time: number;
  macd: number;      // DIF
  signal: number;    // DEA
  histogram: number; // MACD柱
}

/**
 * RSI 结果
 */
export interface RsiResult {
  time: number;
  value: number;
}

/**
 * KDJ 结果
 */
export interface KdjResult {
  time: number;
  k: number;
  d: number;
  j: number;
}

/**
 * OBV 结果
 */
export interface ObvResult {
  time: number;
  value: number;
}

/**
 * WR 结果
 */
export interface WrResult {
  time: number;
  value: number;
}

/**
 * 默认指标配置
 */
export const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'ma7', type: 'MA', layer: 'main', params: { period: 7 }, colors: ['#F5BC00'], visible: true },
  { id: 'ma25', type: 'MA', layer: 'main', params: { period: 25 }, colors: ['#F032E6'], visible: true },
  { id: 'ma99', type: 'MA', layer: 'main', params: { period: 99 }, colors: ['#00BCD4'], visible: true },
];

/**
 * 指标颜色配置
 */
export const INDICATOR_COLORS = {
  MA: ['#F5BC00', '#F032E6', '#00BCD4'],
  EMA: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
  BOLL: {
    upper: '#F6465D',
    middle: '#F0B90B',
    lower: '#0ECB81',
  },
  MACD: {
    macd: '#2196F3',
    signal: '#FF9800',
    histogramUp: '#0ECB81',
    histogramDown: '#F6465D',
  },
  RSI: '#9C27B0',
  KDJ: {
    k: '#FCD535',
    d: '#4BD4FF',
    j: '#F6465D',
  },
  OBV: '#8C8CFF',
  WR: '#FFB86B',
};
