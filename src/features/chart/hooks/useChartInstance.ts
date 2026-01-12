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
  const lastDataLengthRef = useRef(0);
  const lastDataStartTimeRef = useRef<number | null>(null);
  const autoScrollRef = useRef(true);


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

    const handleVisibleRangeChange = (range: LogicalRange | null) => {
      if (!range || lastDataLengthRef.current === 0) return;

      const lastIndex = lastDataLengthRef.current - 1;
      const isAtRightEdge = range.to >= lastIndex - 2;

      autoScrollRef.current = isAtRightEdge;
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

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
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
    };

  }, [container]);

  const toChartCandle = (candle: Candle) => ({
    time: candle.time as any, // Lightweight Charts 接受 Unix 时间戳（秒）
    open: parseFloat(candle.open),
    high: parseFloat(candle.high),
    low: parseFloat(candle.low),
    close: parseFloat(candle.close),
  });

  /**
   * 更新图表数据
   */
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chart || !candleSeries) return;

    if (klineData.length === 0) {
      lastDataLengthRef.current = 0;
      lastDataStartTimeRef.current = null;
      return;
    }

    const currentStartTime = klineData[0].time;
    const shouldReset =
      lastDataStartTimeRef.current === null ||
      klineData.length < lastDataLengthRef.current ||
      currentStartTime !== lastDataStartTimeRef.current;

    if (shouldReset) {
      candleSeries.setData(klineData.map(toChartCandle));
      
      // 只在首次加载时自动适配内容范围
      // 后续更新不强制改变用户的滚动位置
      if (lastDataStartTimeRef.current === null) {
        chart.timeScale().fitContent();
        autoScrollRef.current = true;
      } else {
        // 切换交易对时：适配新数据范围，但保留自动滚动状态
        chart.timeScale().fitContent();
        // 让用户决定是否跟随最新数据
      }
      
      // 显式触发价格轴的自动缩放
      candleSeries.applyOptions({
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
    } else {
      // 增量更新：只更新最后一根 K 线
      const lastCandle = klineData[klineData.length - 1];
      candleSeries.update(toChartCandle(lastCandle));

      // 只有当用户在最右侧时才自动滚动跟随
      if (autoScrollRef.current) {
        chart.timeScale().scrollToRealTime();
      }
    }

    lastDataLengthRef.current = klineData.length;
    lastDataStartTimeRef.current = currentStartTime;
  }, [klineData]);


  return {
    chart: chartRef.current,
    candleSeries: candleSeriesRef.current,
  };
}
