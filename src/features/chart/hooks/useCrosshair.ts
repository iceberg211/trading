/**
 * useCrosshair - 十字线事件处理
 * 
 * 职责：
 * - 监听十字线移动事件
 * - 获取鼠标位置对应的价格
 * - 更新 crosshairDataAtom
 */

import { useEffect, useRef, MutableRefObject } from 'react';
import { useSetAtom } from 'jotai';
import { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import { crosshairDataAtom } from '../atoms/crosshairAtom';

interface UseCrosshairOptions {
  chart: MutableRefObject<IChartApi | null>;
  candleSeries: MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  volumeMap: MutableRefObject<Map<number, number>>;
  maMap: MutableRefObject<Map<number, number>>;
  emaMap: MutableRefObject<Map<number, number>>;
}

export function useCrosshair({
  chart,
  candleSeries,
  volumeMap,
  maMap,
  emaMap,
}: UseCrosshairOptions) {
  const setCrosshairData = useSetAtom(crosshairDataAtom);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    const chartInstance = chart.current;
    const series = candleSeries.current;
    
    if (!chartInstance || !series) return;
    if (isSubscribedRef.current) return;

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time || !param.seriesData) {
        setCrosshairData(null);
        return;
      }

      const candleData = param.seriesData.get(series);
      if (!candleData || !('open' in candleData)) {
        setCrosshairData(null);
        return;
      }

      const ohlc = candleData as { 
        time: number; 
        open: number; 
        high: number; 
        low: number; 
        close: number;
      };
      
      const changePercent = ((ohlc.close - ohlc.open) / ohlc.open) * 100;
      const time = typeof param.time === 'number' ? param.time : 0;
      
      // 查询缓存的指标数据
      const volume = volumeMap.current.get(time);
      const ma = maMap.current.get(time);
      const ema = emaMap.current.get(time);

      // 获取十字线 Y 轴位置的真实价格
      let cursorPrice: number | undefined;
      if (param.point && typeof param.point.y === 'number') {
        const price = series.coordinateToPrice(param.point.y);
        if (price !== null) {
          cursorPrice = price;
        }
      }

      setCrosshairData({
        time,
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        volume,
        ma,
        ema,
        changePercent,
        cursorPrice,
      });
    };

    chartInstance.subscribeCrosshairMove(handleCrosshairMove);
    isSubscribedRef.current = true;

    return () => {
      chartInstance.unsubscribeCrosshairMove(handleCrosshairMove);
      setCrosshairData(null);
      isSubscribedRef.current = false;
    };
  }, [chart, candleSeries, volumeMap, maMap, emaMap, setCrosshairData]);
}
