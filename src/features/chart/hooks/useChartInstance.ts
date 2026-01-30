/**
 * useChartInstance - Lightweight Charts 实例管理 Hook
 * 
 * 重构后的主入口，组合多个子 hooks：
 * - useChartCore: 图表实例创建与销毁
 * - useChartData: 数据同步与指标计算
 * - useChartScroll: 滚动与翻页逻辑
 * - useCrosshair: 十字线事件处理
 */

import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { symbolConfigAtom } from '@/features/symbol/atoms/symbolAtom';
import { useChartCore } from './useChartCore';
import { useChartData } from './useChartData';
import { useChartScroll } from './useChartScroll';
import { useCrosshair } from './useCrosshair';

interface UseChartInstanceOptions {
  container: HTMLDivElement | null;
  onLoadMore?: () => Promise<number>;
  chartType?: 'candles' | 'line';
  showVolume?: boolean;
  showMA?: boolean;
  showEMA?: boolean;
}

export function useChartInstance({
  container,
  onLoadMore,
  chartType = 'candles',
  showVolume = true,
  showMA = true,
  showEMA = false,
}: UseChartInstanceOptions) {
  const symbolConfig = useAtomValue(symbolConfigAtom);
  const autoScrollRef = useRef(true);

  // 1. 图表核心：创建实例和系列
  const { chart, series } = useChartCore({ container });

  // 2. 数据同步：K 线数据 → 图表系列
  const { dataLength, volumeMap, maMap, emaMap } = useChartData({
    chart,
    series,
    autoScroll: autoScrollRef,
  });

  // 3. 滚动翻页：边界检测、加载更多
  const { autoScroll } = useChartScroll({
    chart,
    dataLength,
    onLoadMore,
    autoScroll: autoScrollRef,
  });

  // 4. 十字线：事件处理、价格显示
  useCrosshair({
    chart,
    candleSeries: series.current.candleSeries ? { current: series.current.candleSeries } as any : { current: null },
    volumeMap,
    maMap,
    emaMap,
  });

  // 5. 视图切换与指标显示
  useEffect(() => {
    const { candleSeries, lineSeries, volumeSeries, maSeries, emaSeries } = series.current;
    if (!candleSeries || !lineSeries || !volumeSeries || !maSeries || !emaSeries) return;

    candleSeries.applyOptions({ visible: chartType === 'candles' });
    lineSeries.applyOptions({ visible: chartType === 'line' });
    volumeSeries.applyOptions({ visible: showVolume });
    maSeries.applyOptions({ visible: showMA });
    emaSeries.applyOptions({ visible: showEMA });
  }, [chartType, showVolume, showMA, showEMA, series]);

  // 6. 根据交易对配置价格轴精度
  useEffect(() => {
    const { candleSeries } = series.current;
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
  }, [symbolConfig?.pricePrecision, symbolConfig?.tickSize, series]);

  // 控制方法
  const resetScale = () => {
    const chartInstance = chart.current;
    if (!chartInstance) return;
    chartInstance.timeScale().fitContent();
  };

  const goToLatest = () => {
    const chartInstance = chart.current;
    if (!chartInstance) return;
    autoScroll.current = true;
    chartInstance.timeScale().scrollToRealTime();
  };

  return {
    chart: chart.current,
    candleSeries: series.current.candleSeries,
    resetScale,
    goToLatest,
  };
}
