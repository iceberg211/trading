/**
 * OBV (能量潮) 计算
 * 上涨日加成交量，下跌日减成交量，平盘不变
 */

import type { Candle } from '@/types/binance';
import type { ObvResult } from '../types';

export function calculateOBV(candles: Candle[]): ObvResult[] {
  const results: ObvResult[] = [];

  if (candles.length === 0) {
    return results;
  }

  let obv = 0;
  results.push({ time: candles[0].time, value: obv });

  for (let i = 1; i < candles.length; i++) {
    const prevClose = parseFloat(candles[i - 1].close);
    const close = parseFloat(candles[i].close);
    const volume = parseFloat(candles[i].volume);

    if (close > prevClose) {
      obv += volume;
    } else if (close < prevClose) {
      obv -= volume;
    }

    results.push({ time: candles[i].time, value: obv });
  }

  return results;
}
