/**
 * MA (简单移动平均线) 计算
 * 复用自 chartTransformers.ts
 */

import type { Candle } from '@/types/binance';
import type { IndicatorResult } from '../types';

/**
 * 计算简单移动平均线 (SMA)
 */
export function calculateMA(candles: Candle[], period: number): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  let sum = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const close = parseFloat(candles[i].close);
    sum += close;
    
    if (i >= period) {
      sum -= parseFloat(candles[i - period].close);
    }
    
    if (i >= period - 1) {
      results.push({ time: candles[i].time, value: sum / period });
    } else {
      results.push({ time: candles[i].time, value: null });
    }
  }
  
  return results;
}

/**
 * 计算最后一个 MA 值
 */
export function calculateLastMA(candles: Candle[], period: number): number | null {
  if (candles.length < period) return null;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i += 1) {
    sum += parseFloat(candles[i].close);
  }
  return sum / period;
}
