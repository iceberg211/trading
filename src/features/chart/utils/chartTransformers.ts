/**
 * 图表数据转换工具函数
 * 将 K 线数据转换为 Lightweight Charts 所需格式
 */

import type { Candle } from '@/types/binance';

/**
 * 转换为蜡烛图数据格式
 */
export function toChartCandle(candle: Candle) {
  return {
    time: candle.time as any, // Lightweight Charts 接受 Unix 时间戳（秒）
    open: parseFloat(candle.open),
    high: parseFloat(candle.high),
    low: parseFloat(candle.low),
    close: parseFloat(candle.close),
  };
}

/**
 * 转换为折线图数据格式
 */
export function toLinePoint(candle: Candle) {
  return {
    time: candle.time as any,
    value: parseFloat(candle.close),
  };
}

/**
 * 转换为成交量柱状图数据格式
 */
export function toVolumeData(candle: Candle, upColor = '#0ECB81', downColor = '#F6465D') {
  const close = parseFloat(candle.close);
  const open = parseFloat(candle.open);
  return {
    time: candle.time as any,
    value: parseFloat(candle.volume),
    color: close >= open ? upColor : downColor,
  };
}

/**
 * 计算简单移动平均线 (MA)
 */
export function calculateMA(data: Candle[], period: number) {
  const result: Array<{ time: any; value: number }> = [];
  let sum = 0;
  
  for (let i = 0; i < data.length; i += 1) {
    const close = parseFloat(data[i].close);
    sum += close;
    
    if (i >= period) {
      sum -= parseFloat(data[i - period].close);
    }
    
    if (i >= period - 1) {
      result.push({ time: data[i].time as any, value: sum / period });
    }
  }
  
  return result;
}

/**
 * 计算指数移动平均线 (EMA)
 */
export function calculateEMA(data: Candle[], period: number) {
  const result: Array<{ time: any; value: number }> = [];
  const k = 2 / (period + 1);
  let ema = 0;
  
  for (let i = 0; i < data.length; i += 1) {
    const close = parseFloat(data[i].close);
    
    if (i === 0) {
      ema = close;
    } else {
      ema = close * k + ema * (1 - k);
    }
    
    if (i >= period - 1) {
      result.push({ time: data[i].time as any, value: ema });
    }
  }
  
  return result;
}

/**
 * 构建成交量 Map（用于十字线查询）
 */
export function buildVolumeMap(data: Candle[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const candle of data) {
    map.set(candle.time, parseFloat(candle.volume));
  }
  return map;
}

/**
 * 构建指标数据 Map（用于十字线查询）
 */
export function buildIndicatorMap(data: Array<{ time: any; value: number }>): Map<number, number> {
  const map = new Map<number, number>();
  for (const item of data) {
    map.set(item.time, item.value);
  }
  return map;
}
