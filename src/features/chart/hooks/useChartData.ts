/**
 * useChartData - 图表数据同步
 * 
 * 职责：
 * - 同步 K 线数据到图表系列
 * - 处理增量更新 vs 全量重置
 * - 计算并更新 MA/EMA 指标
 * - 维护指标数据缓存（用于十字线查询）
 * 
 * 关键设计：
 * - 只有在 shouldReset 时才调用 setData() 和 setVisibleLogicalRange()
 * - 增量更新时只调用 update()，绝不干扰用户拖动
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
import { calculateBOLL } from '../indicators/algorithms/boll';
import type { ChartSeriesRefs } from './useChartCore';

const DEFAULT_VISIBLE_BARS = 120;

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
  const lastEndTimeRef = useRef<number | null>(null);
  const volumeMapRef = useRef<Map<number, number>>(new Map());
  const maMapRef = useRef<Map<number, number>>(new Map());
  const emaMapRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const chartInstance = chart.current;
    const { candleSeries, lineSeries, volumeSeries, maSeries, emaSeries, bollUpperSeries, bollMiddleSeries, bollLowerSeries } = series.current;

    if (!chartInstance || !candleSeries || !lineSeries || !volumeSeries || !maSeries || !emaSeries || !bollUpperSeries || !bollMiddleSeries || !bollLowerSeries) {
      return;
    }

    // 空数据时清理
    if (klineData.length === 0) {
      dataLengthRef.current = 0;
      lastStartTimeRef.current = null;
      lastEndTimeRef.current = null;
      volumeMapRef.current = new Map();
      maMapRef.current = new Map();
      emaMapRef.current = new Map();
      return;
    }

    const currentStartTime = klineData[0].time;
    const currentEndTime = klineData[klineData.length - 1].time;
    const prevLength = dataLengthRef.current;
    
    // 判断是否需要全量重置
    // 1. 首次加载
    // 2. 数据减少（切换周期导致）
    // 3. 开始时间变化（加载更多历史 or 切换交易对）
    const isFirstLoad = lastStartTimeRef.current === null;
    const dataReduced = klineData.length < prevLength;
    const startTimeChanged = lastStartTimeRef.current !== null && currentStartTime !== lastStartTimeRef.current;
    
    const shouldReset = isFirstLoad || dataReduced || startTimeChanged;

    // 判断是否是加载更多历史数据（prepend）
    const hasPrependedData = startTimeChanged && klineData.length > prevLength;

    if (shouldReset) {
      const prevRange = chartInstance.timeScale().getVisibleLogicalRange();
      
      // 全量更新所有系列
      candleSeries.setData(klineData.map(toChartCandle));
      lineSeries.setData(klineData.map(toLinePoint));
      volumeSeries.setData(klineData.map((c) => toVolumeData(c, CHART_COLORS.upColor, CHART_COLORS.downColor)));

      // 全量更新指标
      const maData = calculateMA(klineData, INDICATOR_PERIODS.MA);
      const emaData = calculateEMA(klineData, INDICATOR_PERIODS.EMA);
      const bollData = calculateBOLL(klineData, 20, 2);
      
      maSeries.setData(maData);
      emaSeries.setData(emaData);
      
      // BOLL 数据
      if (bollData.length > 0) {
        bollUpperSeries.setData(bollData.map(d => ({ time: (d.time / 1000) as any, value: d.upper })));
        bollMiddleSeries.setData(bollData.map(d => ({ time: (d.time / 1000) as any, value: d.middle })));
        bollLowerSeries.setData(bollData.map(d => ({ time: (d.time / 1000) as any, value: d.lower })));
      }

      // 更新缓存 Map
      volumeMapRef.current = buildVolumeMap(klineData);
      maMapRef.current = buildIndicatorMap(maData);
      emaMapRef.current = buildIndicatorMap(emaData);

      // 调整视图 - 只在全量重置时调整
      if (hasPrependedData && prevRange) {
        // 加载更多历史数据时，保持当前视图位置
        const addedBars = klineData.length - prevLength;
        chartInstance.timeScale().setVisibleLogicalRange({
          from: prevRange.from + addedBars,
          to: prevRange.to + addedBars,
        });
      } else if (isFirstLoad || dataReduced) {
        // 只有首次加载或切换周期时才设置视图范围
        const to = klineData.length - 1;
        const from = Math.max(0, to - DEFAULT_VISIBLE_BARS + 1);
        chartInstance.timeScale().setVisibleLogicalRange({ from, to });
        autoScroll.current = true;
      }
      // 其他情况（如加载更多但 prevRange 为 null）不调整视图
    } else {
      // 增量更新 - 只更新最后一根 K 线
      // 这里处理两种情况：
      // 1. 最后一根 K 线价格更新（同一时间戳）
      // 2. 新 K 线追加（新时间戳）
      const lastCandle = klineData[klineData.length - 1];
      const isNewCandle = lastEndTimeRef.current !== null && currentEndTime !== lastEndTimeRef.current;
      
      // update() 方法会自动处理追加和更新两种情况
      candleSeries.update(toChartCandle(lastCandle));
      lineSeries.update(toLinePoint(lastCandle));
      volumeSeries.update(toVolumeData(lastCandle, CHART_COLORS.upColor, CHART_COLORS.downColor));

      // 增量更新指标
      const maData = calculateMA(klineData, INDICATOR_PERIODS.MA);
      const emaData = calculateEMA(klineData, INDICATOR_PERIODS.EMA);
      
      if (maData.length > 0) {
        const lastMa = maData[maData.length - 1];
        maSeries.update(lastMa);
        maMapRef.current.set(lastMa.time as number, lastMa.value);
      }
      if (emaData.length > 0) {
        const lastEma = emaData[emaData.length - 1];
        emaSeries.update(lastEma);
        emaMapRef.current.set(lastEma.time as number, lastEma.value);
      }

      // 更新 volume map
      volumeMapRef.current.set(lastCandle.time, parseFloat(lastCandle.volume));

      // 只有在自动滚动模式下才滚动到最新
      // 用户拖动后 autoScroll 会被设为 false，此时不会自动滚动
      if (autoScroll.current && isNewCandle) {
        chartInstance.timeScale().scrollToRealTime();
      }
    }

    // 更新状态
    dataLengthRef.current = klineData.length;
    lastStartTimeRef.current = currentStartTime;
    lastEndTimeRef.current = currentEndTime;
  }, [klineData, chart, series, autoScroll]);

  return {
    dataLength: dataLengthRef,
    volumeMap: volumeMapRef,
    maMap: maMapRef,
    emaMap: emaMapRef,
  };
}
