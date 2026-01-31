/**
 * useSubchart - 副图管理 Hook
 * 
 * 管理 MACD/RSI 副图区域
 */

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts';
import { useAtomValue } from 'jotai';
import { klineDataAtom } from '../atoms/klineAtom';
import { calculateMACD } from '../indicators/algorithms/macd';
import { calculateRSI } from '../indicators/algorithms/rsi';
import { CHART_OPTIONS } from '../constants/chartConfig';

export type SubchartType = 'MACD' | 'RSI' | null;

interface UseSubchartOptions {
  container: HTMLDivElement | null;
  type: SubchartType;
}

interface SubchartRefs {
  chart: IChartApi | null;
  series: {
    macdLine: ISeriesApi<'Line'> | null;
    signalLine: ISeriesApi<'Line'> | null;
    histogram: ISeriesApi<'Histogram'> | null;
    rsiLine: ISeriesApi<'Line'> | null;
  };
}

export function useSubchart({ container, type }: UseSubchartOptions) {
  const klineData = useAtomValue(klineDataAtom);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<SubchartRefs['series']>({
    macdLine: null,
    signalLine: null,
    histogram: null,
    rsiLine: null,
  });

  // 创建/销毁副图
  useEffect(() => {
    if (!container || !type) {
      // 销毁旧图表
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = {
          macdLine: null,
          signalLine: null,
          histogram: null,
          rsiLine: null,
        };
      }
      return;
    }

    // 创建新图表
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      ...CHART_OPTIONS,
      rightPriceScale: {
        ...CHART_OPTIONS.rightPriceScale,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        ...CHART_OPTIONS.timeScale,
        visible: false, // 副图隐藏时间轴
      },
    });

    chartRef.current = chart;

    if (type === 'MACD') {
      // MACD 柱状图
      const histogram = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
        priceScaleId: 'right',
      });
      seriesRef.current.histogram = histogram;

      // MACD 快线
      const macdLine = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      seriesRef.current.macdLine = macdLine;

      // Signal 慢线
      const signalLine = chart.addLineSeries({
        color: '#FF6D00',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      seriesRef.current.signalLine = signalLine;
    } else if (type === 'RSI') {
      // RSI 线
      const rsiLine = chart.addLineSeries({
        color: '#9C27B0',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      seriesRef.current.rsiLine = rsiLine;

      // 添加超买超卖参考线
      rsiLine.createPriceLine({ price: 70, color: '#F6465D', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '超买' });
      rsiLine.createPriceLine({ price: 30, color: '#0ECB81', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '超卖' });
    }

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {
        macdLine: null,
        signalLine: null,
        histogram: null,
        rsiLine: null,
      };
    };
  }, [container, type]);

  // 更新数据
  useEffect(() => {
    if (!type || klineData.length === 0) return;

    const { macdLine, signalLine, histogram, rsiLine } = seriesRef.current;

    if (type === 'MACD' && macdLine && signalLine && histogram) {
      const macdData = calculateMACD(klineData, 12, 26, 9);
      
      const macdLineData: LineData[] = macdData.map(d => ({
        time: (d.time / 1000) as Time,
        value: d.macd,
      }));
      const signalData: LineData[] = macdData.map(d => ({
        time: (d.time / 1000) as Time,
        value: d.signal,
      }));
      const histogramData = macdData.map(d => ({
        time: (d.time / 1000) as Time,
        value: d.histogram,
        color: d.histogram >= 0 ? '#0ECB81' : '#F6465D',
      }));

      macdLine.setData(macdLineData);
      signalLine.setData(signalData);
      histogram.setData(histogramData);
    } else if (type === 'RSI' && rsiLine) {
      const rsiData = calculateRSI(klineData, 14);
      
      const rsiLineData: LineData[] = rsiData.map(d => ({
        time: (d.time / 1000) as Time,
        value: d.value,
      }));
      
      rsiLine.setData(rsiLineData);
    }
  }, [klineData, type]);

  return {
    chart: chartRef.current,
  };
}
