/**
 * MACD (指数平滑异同移动平均线) 计算
 * DIF = EMA(fast) - EMA(slow)
 * DEA = EMA(DIF, signal)
 * MACD柱 = (DIF - DEA) × 2
 */

import type { Candle } from '@/types/binance';
import type { MacdResult } from '../types';

/**
 * 计算 MACD
 * @param candles K线数据
 * @param fastPeriod 快速EMA周期 (默认12)
 * @param slowPeriod 慢速EMA周期 (默认26)
 * @param signalPeriod 信号线周期 (默认9)
 */
export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MacdResult[] {
  const results: MacdResult[] = [];
  
  if (candles.length < slowPeriod) {
    return results;
  }
  
  // EMA 平滑系数
  const fastK = 2 / (fastPeriod + 1);
  const slowK = 2 / (slowPeriod + 1);
  const signalK = 2 / (signalPeriod + 1);
  
  let fastEMA = 0;
  let slowEMA = 0;
  let signalEMA = 0;
  const difValues: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    const close = parseFloat(candles[i].close);
    
    // 计算快速和慢速 EMA
    if (i === 0) {
      fastEMA = close;
      slowEMA = close;
    } else {
      fastEMA = close * fastK + fastEMA * (1 - fastK);
      slowEMA = close * slowK + slowEMA * (1 - slowK);
    }
    
    // DIF = 快速EMA - 慢速EMA
    const dif = fastEMA - slowEMA;
    difValues.push(dif);
    
    // 信号线 DEA = EMA(DIF)
    if (i === slowPeriod - 1) {
      signalEMA = dif;
    } else if (i > slowPeriod - 1) {
      signalEMA = dif * signalK + signalEMA * (1 - signalK);
    }
    
    // 只在有足够数据后输出
    if (i >= slowPeriod - 1) {
      const histogram = (dif - signalEMA) * 2;
      results.push({
        time: candles[i].time,
        macd: dif,
        signal: signalEMA,
        histogram: histogram,
      });
    }
  }
  
  return results;
}
