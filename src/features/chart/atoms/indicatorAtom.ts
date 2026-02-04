/**
 * 指标缓存 Atom
 * 
 * 集中管理所有技术指标的计算结果
 * 当 klineData 变化时自动重新计算
 */

import { atom } from 'jotai';
import { klineDataAtom } from './klineAtom';
import { calculateMA, calculateEMA } from '../utils/chartTransformers';
import { calculateBOLL } from '../indicators/algorithms/boll';
import { calculateMACD } from '../indicators/algorithms/macd';
import { calculateRSI } from '../indicators/algorithms/rsi';
import type { LineData, Time, WhitespaceData, HistogramData } from 'lightweight-charts';

// 指标配置
export const INDICATOR_CONFIG = {
  ma: { periods: [7, 25, 99] },
  ema: { periods: [7, 25] },
  boll: { period: 20, stdDev: 2 },
  macd: { fast: 12, slow: 26, signal: 9 },
  rsi: { period: 14 },
} as const;

// 指标数据类型
export interface IndicatorCache {
  // 主图指标 (LineData 格式，可直接用于 lightweight-charts)
  ma7: Array<LineData | WhitespaceData>;
  ma25: Array<LineData | WhitespaceData>;
  ma99: Array<LineData | WhitespaceData>;
  ema7: Array<LineData | WhitespaceData>;
  ema25: Array<LineData | WhitespaceData>;
  bollUpper: Array<LineData | WhitespaceData>;
  bollMiddle: Array<LineData | WhitespaceData>;
  bollLower: Array<LineData | WhitespaceData>;
  
  // 副图指标
  macd: {
    macdLine: Array<LineData | WhitespaceData>;
    signalLine: Array<LineData | WhitespaceData>;
    histogram: Array<HistogramData | WhitespaceData>;
  };
  rsi: Array<LineData | WhitespaceData>;
}

/**
 * 派生 Atom: 自动计算所有指标
 * 当 klineDataAtom 更新时自动触发重算
 */
export const indicatorCacheAtom = atom<IndicatorCache | null>((get) => {
  const klineData = get(klineDataAtom);
  
  if (klineData.length === 0) {
    return null;
  }

  // MA 计算
  const ma7Raw = calculateMA(klineData, INDICATOR_CONFIG.ma.periods[0]);
  const ma25Raw = calculateMA(klineData, INDICATOR_CONFIG.ma.periods[1]);
  const ma99Raw = calculateMA(klineData, INDICATOR_CONFIG.ma.periods[2]);
  
  // EMA 计算
  const ema7Raw = calculateEMA(klineData, INDICATOR_CONFIG.ema.periods[0]);
  const ema25Raw = calculateEMA(klineData, INDICATOR_CONFIG.ema.periods[1]);
  
  // BOLL 计算
  const bollRaw = calculateBOLL(
    klineData,
    INDICATOR_CONFIG.boll.period,
    INDICATOR_CONFIG.boll.stdDev
  );
  
  // MACD 计算
  const macdRaw = calculateMACD(
    klineData,
    INDICATOR_CONFIG.macd.fast,
    INDICATOR_CONFIG.macd.slow,
    INDICATOR_CONFIG.macd.signal
  );
  
  // RSI 计算
  const rsiRaw = calculateRSI(klineData, INDICATOR_CONFIG.rsi.period);

  const times: Time[] = klineData.map((d) => d.time as Time);

  const alignLineSeries = (
    data: Array<{ time: number; value: number }>
  ): Array<LineData | WhitespaceData> => {
    const map = new Map<number, number>();
    for (const item of data) {
      map.set(item.time, item.value);
    }
    return times.map((t) => {
      const value = map.get(t as number);
      if (value === undefined) return { time: t };
      return { time: t, value };
    });
  };

  const alignHistogramSeries = (
    data: Array<{ time: number; value: number; color: string }>
  ): Array<HistogramData | WhitespaceData> => {
    const map = new Map<number, { value: number; color: string }>();
    for (const item of data) {
      map.set(item.time, { value: item.value, color: item.color });
    }
    return times.map((t) => {
      const item = map.get(t as number);
      if (!item) return { time: t };
      return { time: t, value: item.value, color: item.color };
    });
  };

  return {
    // 主图指标
    ma7: alignLineSeries(ma7Raw),
    ma25: alignLineSeries(ma25Raw),
    ma99: alignLineSeries(ma99Raw),
    ema7: alignLineSeries(ema7Raw),
    ema25: alignLineSeries(ema25Raw),
    bollUpper: alignLineSeries(bollRaw.map((d) => ({ time: d.time, value: d.upper }))),
    bollMiddle: alignLineSeries(bollRaw.map((d) => ({ time: d.time, value: d.middle }))),
    bollLower: alignLineSeries(bollRaw.map((d) => ({ time: d.time, value: d.lower }))),
    
    // MACD 副图
    macd: {
      macdLine: alignLineSeries(macdRaw.map((d) => ({ time: d.time, value: d.macd }))),
      signalLine: alignLineSeries(macdRaw.map((d) => ({ time: d.time, value: d.signal }))),
      histogram: alignHistogramSeries(
        macdRaw.map((d) => ({
          time: d.time,
          value: d.histogram,
          color: d.histogram >= 0 ? '#0ECB81' : '#F6465D',
        }))
      ),
    },
    
    // RSI 副图
    rsi: alignLineSeries(rsiRaw.map((d) => ({ time: d.time, value: d.value }))),
  };
});

/**
 * 选择器 Atoms: 按需获取特定指标
 */
export const maIndicatorsAtom = atom((get) => {
  const cache = get(indicatorCacheAtom);
  if (!cache) return null;
  return { ma7: cache.ma7, ma25: cache.ma25, ma99: cache.ma99 };
});

export const emaIndicatorsAtom = atom((get) => {
  const cache = get(indicatorCacheAtom);
  if (!cache) return null;
  return { ema7: cache.ema7, ema25: cache.ema25 };
});

export const bollIndicatorsAtom = atom((get) => {
  const cache = get(indicatorCacheAtom);
  if (!cache) return null;
  return { upper: cache.bollUpper, middle: cache.bollMiddle, lower: cache.bollLower };
});

export const macdIndicatorAtom = atom((get) => {
  const cache = get(indicatorCacheAtom);
  return cache?.macd ?? null;
});

export const rsiIndicatorAtom = atom((get) => {
  const cache = get(indicatorCacheAtom);
  return cache?.rsi ?? null;
});
