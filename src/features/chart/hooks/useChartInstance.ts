import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { createChart, IChartApi, ISeriesApi, type LogicalRange } from 'lightweight-charts';
import { klineDataAtom } from '../atoms/klineAtom';
import type { Candle } from '@/types/binance';

interface UseChartInstanceOptions {
  container: HTMLDivElement | null;
}

/**
 * Lightweight Charts 实例管理 Hook
 */
export function useChartInstance({ container }: UseChartInstanceOptions) {
  const klineData = useAtomValue(klineDataAtom);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  /**
   * 初始化图表
   */
  useEffect(() => {
    if (!container) return;

    // 创建图表实例
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: '#161A1E' }, // bg-bg
        textColor: '#848E9C', // text-secondary
      },
      grid: {
        vertLines: { color: '#2B3139' }, // border-line
        horzLines: { color: '#2B3139' }, // border-line
      },
      timeScale: {
        borderColor: '#2B3139',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2B3139',
      },
      crosshair: {
        vertLine: {
          color: '#5E6673',
          labelBackgroundColor: '#474D57',
        },
        horzLine: {
          color: '#5E6673',
          labelBackgroundColor: '#474D57',
        },
      },
    });

    chartRef.current = chart;

    // 创建蜡烛图系列
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderUpColor: '#0ECB81',
      borderDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
    });

    candleSeriesRef.current = candleSeries;

    // 响应式调整
    const handleResize = () => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };
  }, [container]);

  /**
   * 更新图表数据
   */
  useEffect(() => {
    if (!candleSeriesRef.current || klineData.length === 0) return;

    // 转换数据格式
    const chartData = klineData.map((candle: Candle) => ({
      time: candle.time as any, // Lightweight Charts 接受 Unix 时间戳（秒）
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    }));

    // 设置数据
    candleSeriesRef.current.setData(chartData);

    // 自动调整视图
    chartRef.current?.timeScale().fitContent();
  }, [klineData]);

  return {
    chart: chartRef.current,
    candleSeries: candleSeriesRef.current,
  };
}
