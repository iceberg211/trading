import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
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
        background: { color: '#0f172a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      timeScale: {
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#475569',
      },
    });

    chartRef.current = chart;

    // 创建蜡烛图系列
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#14b8a6',
      downColor: '#ef4444',
      borderUpColor: '#14b8a6',
      borderDownColor: '#ef4444',
      wickUpColor: '#14b8a6',
      wickDownColor: '#ef4444',
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
