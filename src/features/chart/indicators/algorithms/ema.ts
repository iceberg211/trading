/**
 * EMA (指数移动平均线) 计算
 * 复用自 chartTransformers.ts
 */

import type { Candle } from '@/types/binance';
import type { IndicatorResult } from '../types';

/**
 * 计算指数移动平均线 (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): IndicatorResult[] {
  const results: IndicatorResult[] = [];
  const k = 2 / (period + 1);
  let ema = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const close = parseFloat(candles[i].close);
    
    if (i === 0) {
      ema = close;
    } else {
      ema = close * k + ema * (1 - k);
    }
    
    if (i >= period - 1) {
      results.push({ time: candles[i].time, value: ema });
    } else {
      results.push({ time: candles[i].time, value: null });
    }
  }
  
  return results;
}
