/**
 * useChartCore - 图表核心实例管理
 * 
 * 职责：
 * - 创建/销毁图表实例
 * - 创建各类系列（蜡烛、折线、成交量、MA、EMA）
 * - 管理 ResizeObserver 响应式调整
 */

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { CHART_OPTIONS, SERIES_OPTIONS } from '../constants/chartConfig';

export interface ChartSeriesRefs {
  candleSeries: ISeriesApi<'Candlestick'> | null;
  lineSeries: ISeriesApi<'Line'> | null;
  volumeSeries: ISeriesApi<'Histogram'> | null;
  maSeries: ISeriesApi<'Line'> | null;
  emaSeries: ISeriesApi<'Line'> | null;
  bollUpperSeries: ISeriesApi<'Line'> | null;
  bollMiddleSeries: ISeriesApi<'Line'> | null;
  bollLowerSeries: ISeriesApi<'Line'> | null;
}

interface UseChartCoreOptions {
  container: HTMLDivElement | null;
}

export function useChartCore({ container }: UseChartCoreOptions) {
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ChartSeriesRefs>({
    candleSeries: null,
    lineSeries: null,
    volumeSeries: null,
    maSeries: null,
    emaSeries: null,
    bollUpperSeries: null,
    bollMiddleSeries: null,
    bollLowerSeries: null,
  });

  useEffect(() => {
    if (!container) return;

    // 创建图表实例
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      ...CHART_OPTIONS,
    });

    chartRef.current = chart;

    // 创建蜡烛图系列
    const candleSeries = chart.addCandlestickSeries(SERIES_OPTIONS.candlestick);
    seriesRef.current.candleSeries = candleSeries;

    // 折线图系列
    const lineSeries = chart.addLineSeries(SERIES_OPTIONS.line);
    seriesRef.current.lineSeries = lineSeries;

    // 成交量柱状图
    const volumeSeries = chart.addHistogramSeries(SERIES_OPTIONS.volume);
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      borderVisible: false,
    });
    seriesRef.current.volumeSeries = volumeSeries;

    // MA 系列
    const maSeries = chart.addLineSeries(SERIES_OPTIONS.ma);
    seriesRef.current.maSeries = maSeries;

    // EMA 系列
    const emaSeries = chart.addLineSeries(SERIES_OPTIONS.ema);
    seriesRef.current.emaSeries = emaSeries;

    // BOLL 系列 (上轨/中轨/下轨)
    const bollUpperSeries = chart.addLineSeries({
      color: '#F6465D',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      visible: false,
    });
    seriesRef.current.bollUpperSeries = bollUpperSeries;

    const bollMiddleSeries = chart.addLineSeries({
      color: '#F0B90B',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      visible: false,
    });
    seriesRef.current.bollMiddleSeries = bollMiddleSeries;

    const bollLowerSeries = chart.addLineSeries({
      color: '#0ECB81',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      visible: false,
    });
    seriesRef.current.bollLowerSeries = bollLowerSeries;

    // 响应式调整
    let resizeObserver: ResizeObserver | null = null;
    const handleResize = () => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      });
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', handleResize);
    }

    // 页面可见性变化时刷新尺寸
    const handleVisibility = () => {
      if (document.hidden) return;
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 清理
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {
        candleSeries: null,
        lineSeries: null,
        volumeSeries: null,
        maSeries: null,
        emaSeries: null,
        bollUpperSeries: null,
        bollMiddleSeries: null,
        bollLowerSeries: null,
      };
    };
  }, [container]);

  return {
    chart: chartRef,
    series: seriesRef,
  };
}
