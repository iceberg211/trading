/**
 * useChartData - 图表数据同步
 * 
 * 职责：
 * - 同步 K 线数据到图表系列
 * - 处理增量更新 vs 全量重置
 * - 计算并更新 MA/EMA 指标
 * - 维护指标数据缓存（用于十字线查询）
 */

import { useEffect, useRef, MutableRefObject } from 'react';
import { useAtomValue } from 'jotai';
import { IChartApi } from 'lightweight-charts';
import { klineDataAtom } from '../atoms/klineAtom';
import { INDICATOR_PERIODS, CHART_COLORS } from '../constants/chartConfig';
import {
  toChartCandle,
  toLinePoint,
  toVolumeData,
  calculateMA,
  calculateEMA,
  buildVolumeMap,
  buildIndicatorMap,
} from '../utils/chartTransformers';
import type { ChartSeriesRefs } from './useChartCore';

interface UseChartDataOptions {
  chart: MutableRefObject<IChartApi | null>;
  series: MutableRefObject<ChartSeriesRefs>;
  autoScroll: MutableRefObject<boolean>;
}

interface UseChartDataReturn {
  dataLength: MutableRefObject<number>;
  volumeMap: MutableRefObject<Map<number, number>>;
  maMap: MutableRefObject<Map<number, number>>;
  emaMap: MutableRefObject<Map<number, number>>;
}

export function useChartData({
  chart,
  series,
  autoScroll,
}: UseChartDataOptions): UseChartDataReturn {
  const klineData = useAtomValue(klineDataAtom);
  
  const dataLengthRef = useRef(0);
  const lastStartTimeRef = useRef<number | null>(null);
  const volumeMapRef = useRef<Map<number, number>>(new Map());
  const maMapRef = useRef<Map<number, number>>(new Map());
  const emaMapRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const chartInstance = chart.current;
    const { candleSeries, lineSeries, volumeSeries, maSeries, emaSeries } = series.current;

    if (!chartInstance || !candleSeries || !lineSeries || !volumeSeries || !maSeries || !emaSeries) {
      return;
    }

    // 空数据时清理
    if (klineData.length === 0) {
      dataLengthRef.current = 0;
      lastStartTimeRef.current = null;
      volumeMapRef.current = new Map();
      maMapRef.current = new Map();
      emaMapRef.current = new Map();
      return;
    }


    const currentStartTime = klineData[0].time;
    const prevLength = dataLengthRef.current;
    
    // 判断是否需要全量重置
    const shouldReset =
      lastStartTimeRef.current === null ||
      klineData.length < prevLength ||
      currentStartTime !== lastStartTimeRef.current;

    const hasPrependedData =
      lastStartTimeRef.current !== null &&
      currentStartTime !== lastStartTimeRef.current &&
      klineData.length > prevLength;

    if (shouldReset) {
      const prevRange = chartInstance.timeScale().getVisibleLogicalRange();
      
      // 全量更新
      candleSeries.setData(klineData.map(toChartCandle));
      lineSeries.setData(klineData.map(toLinePoint));
      volumeSeries.setData(klineData.map((c) => toVolumeData(c, CHART_COLORS.upColor, CHART_COLORS.downColor)));

      // 调整视图
      if (lastStartTimeRef.current === null) {
        chartInstance.timeScale().fitContent();
        autoScroll.current = true;
      } else if (hasPrependedData && prevRange) {
        const addedBars = klineData.length - prevLength;
        chartInstance.timeScale().setVisibleLogicalRange({
          from: prevRange.from + addedBars,
          to: prevRange.to + addedBars,
        });
      } else {
        chartInstance.timeScale().fitContent();
      }
    } else {
      // 增量更新
      const lastCandle = klineData[klineData.length - 1];
      candleSeries.update(toChartCandle(lastCandle));
      lineSeries.update(toLinePoint(lastCandle));
      volumeSeries.update(toVolumeData(lastCandle, CHART_COLORS.upColor, CHART_COLORS.downColor));

      if (autoScroll.current) {
        chartInstance.timeScale().scrollToRealTime();
      }
    }

    // 计算并更新指标（统一计算一次）
    const maData = calculateMA(klineData, INDICATOR_PERIODS.MA);
    const emaData = calculateEMA(klineData, INDICATOR_PERIODS.EMA);
    maSeries.setData(maData);
    emaSeries.setData(emaData);

    // 更新状态
    dataLengthRef.current = klineData.length;
    lastStartTimeRef.current = currentStartTime;

    // 更新缓存 Map（用于十字线查询）
    volumeMapRef.current = buildVolumeMap(klineData);
    maMapRef.current = buildIndicatorMap(maData);
    emaMapRef.current = buildIndicatorMap(emaData);
  }, [klineData, chart, series, autoScroll]);

  return {
    dataLength: dataLengthRef,
    volumeMap: volumeMapRef,
    maMap: maMapRef,
    emaMap: emaMapRef,
  };
}
