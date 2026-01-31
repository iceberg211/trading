/**
 * RSI (相对强弱指标) 计算
 * RS = 平均涨幅 / 平均跌幅
 * RSI = 100 - 100/(1+RS)
 */

import type { Candle } from '@/types/binance';
import type { RsiResult } from '../types';

/**
 * 计算 RSI
 * @param candles K线数据
 * @param period 周期 (默认14)
 */
export function calculateRSI(candles: Candle[], period: number = 14): RsiResult[] {
  const results: RsiResult[] = [];
  
  if (candles.length < period + 1) {
    return results;
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  // 计算第一个周期的平均涨跌幅
  for (let i = 1; i <= period; i++) {
    const change = parseFloat(candles[i].close) - parseFloat(candles[i - 1].close);
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // 第一个 RSI 值
  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const firstRSI = 100 - 100 / (1 + firstRS);
  results.push({ time: candles[period].time, value: firstRSI });
  
  // 使用平滑方法计算后续 RSI
  for (let i = period + 1; i < candles.length; i++) {
    const change = parseFloat(candles[i].close) - parseFloat(candles[i - 1].close);
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    // 平滑平均
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    
    results.push({ time: candles[i].time, value: rsi });
  }
  
  return results;
}
