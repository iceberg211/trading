/**
 * KDJ 指标计算
 * RSV = (C - L) / (H - L) * 100
 * K = SMA(RSV, kPeriod)
 * D = SMA(K, dPeriod)
 * J = 3K - 2D
 */

import type { Candle } from '@/types/binance';
import type { KdjResult } from '../types';

export function calculateKDJ(
  candles: Candle[],
  period: number = 9,
  kPeriod: number = 3,
  dPeriod: number = 3
): KdjResult[] {
  const results: KdjResult[] = [];

  if (candles.length < period) {
    return results;
  }

  let prevK = 50;
  let prevD = 50;

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
    const rsv = range === 0 ? 0 : ((close - lowest) / range) * 100;

    const k = (prevK * (kPeriod - 1) + rsv) / kPeriod;
    const d = (prevD * (dPeriod - 1) + k) / dPeriod;
    const jValue = 3 * k - 2 * d;

    results.push({
      time: candles[i].time,
      k,
      d,
      j: jValue,
    });

    prevK = k;
    prevD = d;
  }

  return results;
}
