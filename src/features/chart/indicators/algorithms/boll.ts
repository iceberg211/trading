/**
 * BOLL (布林带) 计算
 * 中轨 = MA(n)
 * 上轨 = 中轨 + k × 标准差
 * 下轨 = 中轨 - k × 标准差
 */

import type { Candle } from '@/types/binance';
import type { BollResult } from '../types';

/**
 * 计算布林带
 * @param candles K线数据
 * @param period 周期 (默认20)
 * @param stdDev 标准差倍数 (默认2)
 */
export function calculateBOLL(
  candles: Candle[],
  period: number = 20,
  stdDev: number = 2
): BollResult[] {
  const results: BollResult[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      // 数据不足时跳过
      continue;
    }
    
    // 计算中轨 (SMA)
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += parseFloat(candles[i - j].close);
    }
    const middle = sum / period;
    
    // 计算标准差
    let squaredSum = 0;
    for (let j = 0; j < period; j++) {
      const diff = parseFloat(candles[i - j].close) - middle;
      squaredSum += diff * diff;
    }
    const std = Math.sqrt(squaredSum / period);
    
    // 计算上下轨
    results.push({
      time: candles[i].time,
      upper: middle + stdDev * std,
      middle: middle,
      lower: middle - stdDev * std,
    });
  }
  
  return results;
}
