/**
 * WR (Williams %R) 计算
 * WR = (H - C) / (H - L) * -100
 */

import type { Candle } from '@/types/binance';
import type { WrResult } from '../types';

export function calculateWR(candles: Candle[], period: number = 14): WrResult[] {
  const results: WrResult[] = [];

  if (candles.length < period) {
    return results;
  }

  for (let i = period - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;

    for (let j = i - period + 1; j <= i; j++) {
      const high = parseFloat(candles[j].high);
      const low = parseFloat(candles[j].low);
      if (high > highest) highest = high;
      if (low < lowest) lowest = low;
    }

    const close = parseFloat(candles[i].close);
    const range = highest - lowest;
    const wr = range === 0 ? 0 : ((highest - close) / range) * -100;

    results.push({ time: candles[i].time, value: wr });
  }

  return results;
}
