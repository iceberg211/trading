/**
 * useChartGroup - 图表组管理 Hook
 * 
 * 统一管理主图和多个副图：
 * - 创建/销毁图表实例
 * - 时间轴同步
 * - 数据更新
 */

import { useEffect, useRef, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useAtomValue } from 'jotai';
import { klineDataAtom } from '../atoms/klineAtom';
import { indicatorCacheAtom } from '../atoms/indicatorAtom';
import { symbolConfigAtom } from '@/features/symbol/atoms/symbolAtom';
import { TimeScaleSync } from '../core/TimeScaleSync';
import { CHART_OPTIONS, SERIES_OPTIONS, CHART_COLORS } from '../constants/chartConfig';
import { toChartCandle, toLinePoint, toVolumeData } from '../utils/chartTransformers';

export type SubchartType = 'MACD' | 'RSI' | null;

export interface SubchartConfig {
  id: string;
  type: SubchartType;
  container: HTMLDivElement | null;
}

interface MainChartSeries {
  candleSeries: ISeriesApi<'Candlestick'> | null;
  lineSeries: ISeriesApi<'Line'> | null;
  volumeSeries: ISeriesApi<'Histogram'> | null;
  maSeries: ISeriesApi<'Line'> | null;
  emaSeries: ISeriesApi<'Line'> | null;
  bollUpperSeries: ISeriesApi<'Line'> | null;
  bollMiddleSeries: ISeriesApi<'Line'> | null;
  bollLowerSeries: ISeriesApi<'Line'> | null;
}

interface SubchartInstance {
  id: string;
  type: SubchartType;
  container: HTMLDivElement;
  chart: IChartApi;
  series: Record<string, ISeriesApi<any>>;
  resizeObserver: ResizeObserver;
}

interface UseChartGroupOptions {
  mainContainer: HTMLDivElement | null;
  subchartConfigs: SubchartConfig[];
  chartType?: 'candles' | 'line';
  showVolume?: boolean;
  showMA?: boolean;
  showEMA?: boolean;
  showBOLL?: boolean;
}

const DEFAULT_VISIBLE_BARS = 120;

export function useChartGroup({
  mainContainer,
  subchartConfigs,
  chartType = 'candles',
  showVolume = true,
  showMA = true,
  showEMA = false,
  showBOLL = false,
}: UseChartGroupOptions) {
  const klineData = useAtomValue(klineDataAtom);
  const indicators = useAtomValue(indicatorCacheAtom);
  const symbolConfig = useAtomValue(symbolConfigAtom);

  const mainChartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<MainChartSeries>({
    candleSeries: null,
    lineSeries: null,
    volumeSeries: null,
    maSeries: null,
    emaSeries: null,
    bollUpperSeries: null,
    bollMiddleSeries: null,
    bollLowerSeries: null,
  });
  const subchartsRef = useRef<SubchartInstance[]>([]);
  const timeSyncRef = useRef<TimeScaleSync>(new TimeScaleSync());
  const autoScrollRef = useRef(true);
  const lastDataLengthRef = useRef(0);
  const lastEndTimeRef = useRef<number | null>(null);

  // 创建主图
  useEffect(() => {
    if (!mainContainer) return;

    const chart = createChart(mainContainer, {
      width: mainContainer.clientWidth,
      height: mainContainer.clientHeight,
      ...CHART_OPTIONS,
    });

    mainChartRef.current = chart;
    timeSyncRef.current.setMainChart(chart);

    // 创建系列
    const candleSeries = chart.addCandlestickSeries(SERIES_OPTIONS.candlestick);
    const lineSeries = chart.addLineSeries(SERIES_OPTIONS.line);
    const volumeSeries = chart.addHistogramSeries(SERIES_OPTIONS.volume);
    const maSeries = chart.addLineSeries(SERIES_OPTIONS.ma);
    const emaSeries = chart.addLineSeries(SERIES_OPTIONS.ema);
    
    // BOLL 系列
    const bollUpperSeries = chart.addLineSeries({ color: '#F6465D', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: false });
    const bollMiddleSeries = chart.addLineSeries({ color: '#F0B90B', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: false });
    const bollLowerSeries = chart.addLineSeries({ color: '#0ECB81', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: false });

    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 }, borderVisible: false });

    mainSeriesRef.current = {
      candleSeries,
      lineSeries,
      volumeSeries,
      maSeries,
      emaSeries,
      bollUpperSeries,
      bollMiddleSeries,
      bollLowerSeries,
    };

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    resizeObserver.observe(mainContainer);

    return () => {
      resizeObserver.disconnect();
      timeSyncRef.current.dispose();
      chart.remove();
      mainChartRef.current = null;
    };
  }, [mainContainer]);

  // 创建/更新副图
  useEffect(() => {
    const newConfigs = subchartConfigs.filter((c) => c.container && c.type);

    // 移除不再需要的副图
    for (const subchart of subchartsRef.current) {
      if (!newConfigs.find((c) => c.id === subchart.id)) {
        timeSyncRef.current.removeSubchart(subchart.chart);
        subchart.resizeObserver.disconnect();
        subchart.chart.remove();
      }
    }

    // 创建或更新副图
    const updatedSubcharts: SubchartInstance[] = [];
    
    for (const config of newConfigs) {
      if (!config.container || !config.type) continue;

      const existing = subchartsRef.current.find((s) => s.id === config.id);
      
      if (existing && existing.type === config.type && existing.container === config.container) {
        updatedSubcharts.push(existing);
        continue;
      }

      // 移除旧的
      if (existing) {
        timeSyncRef.current.removeSubchart(existing.chart);
        existing.resizeObserver.disconnect();
        existing.chart.remove();
      }

      // 创建新的
      const chart = createChart(config.container, {
        width: config.container.clientWidth,
        height: config.container.clientHeight,
        ...CHART_OPTIONS,
        rightPriceScale: { ...CHART_OPTIONS.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { ...CHART_OPTIONS.timeScale, visible: false },
      });

      const series: Record<string, ISeriesApi<any>> = {};

      if (config.type === 'MACD') {
        series.histogram = chart.addHistogramSeries({ color: '#26a69a', priceFormat: { type: 'price', precision: 4, minMove: 0.0001 } });
        series.macdLine = chart.addLineSeries({ color: '#2962FF', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        series.signalLine = chart.addLineSeries({ color: '#FF6D00', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      } else if (config.type === 'RSI') {
        series.rsiLine = chart.addLineSeries({ color: '#9C27B0', lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
        series.rsiLine.createPriceLine({ price: 70, color: '#F6465D', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
        series.rsiLine.createPriceLine({ price: 30, color: '#0ECB81', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
      }

      timeSyncRef.current.addSubchart(chart);

      // ResizeObserver for subchart
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
        }
      });
      resizeObserver.observe(config.container);

      updatedSubcharts.push({ id: config.id, type: config.type, container: config.container, chart, series, resizeObserver });
    }

    subchartsRef.current = updatedSubcharts;
  }, [subchartConfigs]);

  // 组件卸载时清理副图
  useEffect(() => {
    return () => {
      for (const subchart of subchartsRef.current) {
        timeSyncRef.current.removeSubchart(subchart.chart);
        subchart.resizeObserver.disconnect();
        subchart.chart.remove();
      }
      subchartsRef.current = [];
    };
  }, []);

  // 更新主图数据
  useEffect(() => {
    const { candleSeries, lineSeries, volumeSeries, maSeries, emaSeries, bollUpperSeries, bollMiddleSeries, bollLowerSeries } = mainSeriesRef.current;
    const chart = mainChartRef.current;

    if (!chart || !candleSeries || !lineSeries || !volumeSeries) return;

    if (klineData.length === 0) {
      lastDataLengthRef.current = 0;
      lastEndTimeRef.current = null;
      return;
    }

    const isReset = klineData.length < lastDataLengthRef.current || lastDataLengthRef.current === 0;
    const currentEndTime = klineData[klineData.length - 1].time;
    const isNewCandle = lastEndTimeRef.current !== null && currentEndTime !== lastEndTimeRef.current;

    // K线数据
    candleSeries.setData(klineData.map(toChartCandle));
    lineSeries.setData(klineData.map(toLinePoint));
    volumeSeries.setData(klineData.map((c) => toVolumeData(c, CHART_COLORS.upColor, CHART_COLORS.downColor)));

    // 指标数据
    if (indicators) {
      maSeries?.setData(indicators.ma7);
      emaSeries?.setData(indicators.ema7);
      bollUpperSeries?.setData(indicators.bollUpper);
      bollMiddleSeries?.setData(indicators.bollMiddle);
      bollLowerSeries?.setData(indicators.bollLower);
    }

    // 设置初始视图
    if (isReset) {
      const to = klineData.length - 1;
      const from = Math.max(0, to - DEFAULT_VISIBLE_BARS + 1);
      chart.timeScale().setVisibleLogicalRange({ from, to });
      autoScrollRef.current = true;
    } else if (autoScrollRef.current && isNewCandle) {
      chart.timeScale().scrollToRealTime();
    }

    lastDataLengthRef.current = klineData.length;
    lastEndTimeRef.current = currentEndTime;

    // 同步副图时间轴
    timeSyncRef.current.syncToMainChart();
  }, [klineData, indicators]);

  // 更新副图数据 - 依赖 indicators 和 subchartConfigs 变化
  useEffect(() => {
    if (!indicators) return;
    
    // 使用 requestAnimationFrame 确保 DOM 更新后再设置数据
    requestAnimationFrame(() => {
      for (const subchart of subchartsRef.current) {
        if (subchart.type === 'MACD') {
          subchart.series.macdLine?.setData(indicators.macd.macdLine);
          subchart.series.signalLine?.setData(indicators.macd.signalLine);
          subchart.series.histogram?.setData(indicators.macd.histogram);
        } else if (subchart.type === 'RSI') {
          subchart.series.rsiLine?.setData(indicators.rsi);
        }
      }
      // 同步时间轴
      timeSyncRef.current.syncToMainChart();
    });
  }, [indicators, subchartConfigs]);

  // 视图切换
  useEffect(() => {
    const { candleSeries, lineSeries, volumeSeries, maSeries, emaSeries, bollUpperSeries, bollMiddleSeries, bollLowerSeries } = mainSeriesRef.current;
    if (!candleSeries) return;

    candleSeries.applyOptions({ visible: chartType === 'candles' });
    lineSeries?.applyOptions({ visible: chartType === 'line' });
    volumeSeries?.applyOptions({ visible: showVolume });
    maSeries?.applyOptions({ visible: showMA });
    emaSeries?.applyOptions({ visible: showEMA });
    bollUpperSeries?.applyOptions({ visible: showBOLL });
    bollMiddleSeries?.applyOptions({ visible: showBOLL });
    bollLowerSeries?.applyOptions({ visible: showBOLL });
  }, [chartType, showVolume, showMA, showEMA, showBOLL]);

  // 价格精度
  useEffect(() => {
    const { candleSeries } = mainSeriesRef.current;
    if (!candleSeries) return;

    const precision = symbolConfig?.pricePrecision ?? 2;
    const tickSize = symbolConfig?.tickSize ?? '0.01';
    const minMove = Number(tickSize);
    const safeMinMove = Number.isFinite(minMove) && minMove > 0 ? minMove : Math.pow(10, -precision);

    candleSeries.applyOptions({
      priceFormat: { type: 'price', precision, minMove: safeMinMove },
    });
  }, [symbolConfig?.pricePrecision, symbolConfig?.tickSize]);

  // 控制方法
  const resetScale = useCallback(() => {
    mainChartRef.current?.timeScale().fitContent();
    timeSyncRef.current.syncToMainChart();
  }, []);

  const goToLatest = useCallback(() => {
    autoScrollRef.current = true;
    mainChartRef.current?.timeScale().scrollToRealTime();
    timeSyncRef.current.syncToMainChart();
  }, []);

  return {
    mainChart: mainChartRef.current,
    mainChartRef,
    mainSeries: mainSeriesRef.current,
    subcharts: subchartsRef.current,
    autoScrollRef,
    resetScale,
    goToLatest,
  };
}
