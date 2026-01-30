import { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { createChart, IChartApi, ISeriesApi, type LogicalRange, type MouseEventParams } from 'lightweight-charts';
import { klineDataAtom } from '../atoms/klineAtom';
import { crosshairDataAtom } from '../atoms/crosshairAtom';
import { symbolConfigAtom } from '@/features/symbol/atoms/symbolAtom';
import type { Candle } from '@/types/binance';

interface UseChartInstanceOptions {
  container: HTMLDivElement | null;
  onLoadMore?: () => Promise<number>;
  chartType?: 'candles' | 'line';
  showVolume?: boolean;
  showMA?: boolean;
  showEMA?: boolean;
}

/**
 * Lightweight Charts 实例管理 Hook
 */
const MA_PERIOD = 7;
const EMA_PERIOD = 25;

export function useChartInstance({
  container,
  onLoadMore,
  chartType = 'candles',
  showVolume = true,
  showMA = true,
  showEMA = false,
}: UseChartInstanceOptions) {
  const klineData = useAtomValue(klineDataAtom);
  const setCrosshairData = useSetAtom(crosshairDataAtom);
  const symbolConfig = useAtomValue(symbolConfigAtom);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lastDataLengthRef = useRef(0);
  const lastDataStartTimeRef = useRef<number | null>(null);
  const autoScrollRef = useRef(true);
  // 缓存指标数据（用于十字线查询）
  const klineVolumeMapRef = useRef<Map<number, number>>(new Map());
  const maMapRef = useRef<Map<number, number>>(new Map());
  const emaMapRef = useRef<Map<number, number>>(new Map());
  // 左侧翻页状态
  const isLoadingMoreRef = useRef(false);
  const lastLoadMoreTimeRef = useRef(0);
  const loadMoreRef = useRef<UseChartInstanceOptions['onLoadMore']>();

  // 保持 onLoadMore 引用最新，避免闭包过期
  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

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
        mode: 1, // CrosshairMode.Normal - 显示十字线
        vertLine: {
          color: '#5E6673',
          width: 1,
          style: 2, // LineStyle.Dashed
          labelBackgroundColor: '#474D57',
          labelVisible: true,
        },
        horzLine: {
          color: '#5E6673',
          width: 1,
          style: 2,
          labelBackgroundColor: '#474D57',
          labelVisible: true, // 关键：显示价格轴上的标签
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
    
    // 折线图系列
    const lineSeries = chart.addLineSeries({
      color: '#FCD535',
      lineWidth: 2,
    });
    lineSeriesRef.current = lineSeries;
    
    // 成交量柱状图
    const volumeSeries = chart.addHistogramSeries({
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      color: '#0ECB81',
    });
    
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
      borderVisible: false,
    });

    volumeSeriesRef.current = volumeSeries;
    
    // MA / EMA 系列
    const maSeries = chart.addLineSeries({
      color: '#4BD4FF',
      lineWidth: 1,
      lineStyle: 0,
    });
    maSeriesRef.current = maSeries;
    
    const emaSeries = chart.addLineSeries({
      color: '#FFB86B',
      lineWidth: 1,
      lineStyle: 0,
    });
    emaSeriesRef.current = emaSeries;

    const handleVisibleRangeChange = (range: LogicalRange | null) => {
      if (!range) return;
      
      // 当数据还没加载时，不做判断
      if (lastDataLengthRef.current === 0) return;

      const lastIndex = lastDataLengthRef.current - 1;
      // 用户拖动后，如果可视范围的右边界不在最新数据附近，则关闭自动滚动
      // 阈值设为 5，给用户更大的容错空间
      const isAtRightEdge = range.to >= lastIndex - 5;

      autoScrollRef.current = isAtRightEdge;

      // 左边界检测：当用户滚动到左边界附近时加载更多历史数据
      const loadMore = loadMoreRef.current;
      if (loadMore && !isLoadingMoreRef.current) {
        const isAtLeftEdge = range.from <= 10; // 当左边界在前10条数据内时触发
        const now = Date.now();
        const timeSinceLastLoad = now - lastLoadMoreTimeRef.current;
        
        // 防抖：至少间隔 2 秒才能再次加载
        if (isAtLeftEdge && timeSinceLastLoad > 2000) {
          console.log('[useChartInstance] User scrolled to left edge, loading more data...');
          isLoadingMoreRef.current = true;
          lastLoadMoreTimeRef.current = now;

          loadMore().finally(() => {
            isLoadingMoreRef.current = false;
          });
        }
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    // 十字线事件处理
    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time || !param.seriesData) {
        setCrosshairData(null);
        return;
      }

      const candleData = param.seriesData.get(candleSeries);
      if (!candleData || !('open' in candleData)) {
        setCrosshairData(null);
        return;
      }

      const ohlc = candleData as { time: number; open: number; high: number; low: number; close: number };
      const changePercent = ((ohlc.close - ohlc.open) / ohlc.open) * 100;

      // 查找对应的成交量
      const time = typeof param.time === 'number' ? param.time : 0;
      const volume = klineVolumeMapRef.current.get(time);
      const ma = maMapRef.current.get(time);
      const ema = emaMapRef.current.get(time);

      // 使用 coordinateToPrice 获取十字线 Y 轴位置的真实价格
      let cursorPrice: number | undefined;
      if (param.point && typeof param.point.y === 'number') {
        const price = candleSeries.coordinateToPrice(param.point.y);
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
        volume: volume !== undefined ? volume : undefined,
        ma: ma !== undefined ? ma : undefined,
        ema: ema !== undefined ? ema : undefined,
        changePercent,
        cursorPrice,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    // 响应式调整（优先使用 ResizeObserver）
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
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      setCrosshairData(null);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      volumeSeriesRef.current = null;
      maSeriesRef.current = null;
      emaSeriesRef.current = null;
    };

  }, [container, setCrosshairData]);

  const toChartCandle = (candle: Candle) => ({
    time: candle.time as any, // Lightweight Charts 接受 Unix 时间戳（秒）
    open: parseFloat(candle.open),
    high: parseFloat(candle.high),
    low: parseFloat(candle.low),
    close: parseFloat(candle.close),
  });
  
  const toVolumeData = (candle: Candle) => ({
    time: candle.time as any,
    value: parseFloat(candle.volume),
    color: parseFloat(candle.close) >= parseFloat(candle.open) ? '#0ECB81' : '#F6465D',
  });

  const toLinePoint = (candle: Candle) => ({
    time: candle.time as any,
    value: parseFloat(candle.close),
  });

  const calculateMA = (data: Candle[], period: number) => {
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
  };

  const calculateEMA = (data: Candle[], period: number) => {
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
  };

  /**
   * 更新图表数据
   */
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const lineSeries = lineSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const maSeries = maSeriesRef.current;
    const emaSeries = emaSeriesRef.current;

    if (!chart || !candleSeries || !lineSeries || !volumeSeries || !maSeries || !emaSeries) return;

    if (klineData.length === 0) {
      lastDataLengthRef.current = 0;
      lastDataStartTimeRef.current = null;
      klineVolumeMapRef.current = new Map();
      maMapRef.current = new Map();
      emaMapRef.current = new Map();
      return;
    }

    const currentStartTime = klineData[0].time;
    const shouldReset =
      lastDataStartTimeRef.current === null ||
      klineData.length < lastDataLengthRef.current ||
      currentStartTime !== lastDataStartTimeRef.current;
    
    const hasPrependedData = 
      lastDataStartTimeRef.current !== null &&
      currentStartTime !== lastDataStartTimeRef.current &&
      klineData.length > lastDataLengthRef.current;

    if (shouldReset) {
      const prevRange = chart.timeScale().getVisibleLogicalRange();
      candleSeries.setData(klineData.map(toChartCandle));
      lineSeries.setData(klineData.map(toLinePoint));
      volumeSeries.setData(klineData.map(toVolumeData));
      
      // 只在首次加载时自动适配内容范围
      // 后续更新不强制改变用户的滚动位置
      if (lastDataStartTimeRef.current === null) {
        chart.timeScale().fitContent();
        autoScrollRef.current = true;
      } else if (hasPrependedData && prevRange) {
        // 左侧加载更多：保持当前视图范围
        const addedBars = klineData.length - lastDataLengthRef.current;
        chart.timeScale().setVisibleLogicalRange({
          from: prevRange.from + addedBars,
          to: prevRange.to + addedBars,
        });
      } else {
        // 切换交易对时：适配新数据范围，但保留自动滚动状态
        chart.timeScale().fitContent();
        // 让用户决定是否跟随最新数据
      }
    } else {
      // 增量更新：只更新最后一根 K 线
      const lastCandle = klineData[klineData.length - 1];
      candleSeries.update(toChartCandle(lastCandle));
      lineSeries.update(toLinePoint(lastCandle));
      volumeSeries.update(toVolumeData(lastCandle));

      // 只有当用户在最右侧时才自动滚动跟随
      if (autoScrollRef.current) {
        chart.timeScale().scrollToRealTime();
      }
    }

    // 统一计算 MA/EMA，避免重复计算
    const maData = calculateMA(klineData, MA_PERIOD);
    const emaData = calculateEMA(klineData, EMA_PERIOD);
    
    // 更新指标系列
    maSeries.setData(maData);
    emaSeries.setData(emaData);

    lastDataLengthRef.current = klineData.length;
    lastDataStartTimeRef.current = currentStartTime;
    
    // 同步数据供十字线查询（复用已计算的指标数据）
    const volumeMap = new Map<number, number>();
    for (const candle of klineData) {
      volumeMap.set(candle.time, parseFloat(candle.volume));
    }
    klineVolumeMapRef.current = volumeMap;
    
    const maMap = new Map<number, number>();
    for (const item of maData) {
      maMap.set(item.time, item.value);
    }
    maMapRef.current = maMap;
    
    const emaMap = new Map<number, number>();
    for (const item of emaData) {
      emaMap.set(item.time, item.value);
    }
    emaMapRef.current = emaMap;
  }, [klineData]);

  // 视图切换与指标显示
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const lineSeries = lineSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const maSeries = maSeriesRef.current;
    const emaSeries = emaSeriesRef.current;
    if (!candleSeries || !lineSeries || !volumeSeries || !maSeries || !emaSeries) return;
    
    candleSeries.applyOptions({ visible: chartType === 'candles' });
    lineSeries.applyOptions({ visible: chartType === 'line' });
    volumeSeries.applyOptions({ visible: showVolume });
    maSeries.applyOptions({ visible: showMA });
    emaSeries.applyOptions({ visible: showEMA });
  }, [chartType, showVolume, showMA, showEMA]);
  
  // 根据交易对精度配置价格轴
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;
    
    const precision = symbolConfig?.pricePrecision ?? 2;
    const tickSize = symbolConfig?.tickSize ?? '0.01';
    const minMove = Number(tickSize);
    const safeMinMove = Number.isFinite(minMove) && minMove > 0
      ? minMove
      : Math.pow(10, -precision);

    candleSeries.applyOptions({
      priceFormat: {
        type: 'price',
        precision,
        minMove: safeMinMove,
      },
    });
  }, [symbolConfig?.pricePrecision, symbolConfig?.tickSize]);


  const resetScale = () => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().fitContent();
  };

  const goToLatest = () => {
    const chart = chartRef.current;
    if (!chart) return;
    autoScrollRef.current = true;
    chart.timeScale().scrollToRealTime();
  };

  return {
    chart: chartRef.current,
    candleSeries: candleSeriesRef.current,
    resetScale,
    goToLatest,
  };
}
