/**
 * useChartScroll - 图表滚动与翻页逻辑
 * 
 * 职责：
 * - 监听可视范围变化
 * - 管理自动滚动状态
 * - 触发加载更多历史数据
 */

import { useEffect, useRef, useState, MutableRefObject } from 'react';
import { IChartApi, LogicalRange } from 'lightweight-charts';
import { CHART_THRESHOLDS } from '../constants/chartConfig';

interface UseChartScrollOptions {
  chart: MutableRefObject<IChartApi | null>;
  dataLength: MutableRefObject<number>;
  onLoadMore?: () => Promise<number>;
  autoScroll?: MutableRefObject<boolean>;
}

export function useChartScroll({
  chart,
  dataLength,
  onLoadMore,
  autoScroll,
}: UseChartScrollOptions) {
  const internalAutoScrollRef = useRef(true);
  const autoScrollRef = autoScroll ?? internalAutoScrollRef;
  const isLoadingMoreRef = useRef(false);
  const lastLoadMoreTimeRef = useRef(0);
  
  // 用于强制重新订阅的版本号
  const [subscribeVersion, setSubscribeVersion] = useState(0);

  // 使用 ref 保持 onLoadMore 最新引用
  const loadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // 轮询检测 chart 实例是否可用（仅在未订阅时）
  useEffect(() => {
    if (chart.current) {
      // chart 已可用，触发订阅
      setSubscribeVersion(v => v + 1);
      return;
    }

    // 等待 chart 实例创建
    const checkInterval = setInterval(() => {
      if (chart.current) {
        setSubscribeVersion(v => v + 1);
        clearInterval(checkInterval);
      }
    }, 50);

    return () => clearInterval(checkInterval);
  }, [chart]);

  // 订阅可视范围变化
  useEffect(() => {
    const chartInstance = chart.current;
    if (!chartInstance) return;

    const handleVisibleRangeChange = (range: LogicalRange | null) => {
      if (!range) return;
      if (dataLength.current === 0) return;

      const lastIndex = dataLength.current - 1;
      const isBeyondRightEdge = range.to > lastIndex + 0.5;
      const isAtRightEdge = range.to >= lastIndex - CHART_THRESHOLDS.autoScrollThreshold;
      autoScrollRef.current = !isBeyondRightEdge && isAtRightEdge;

      // 左边界检测 - 触发加载更多
      const loadMore = loadMoreRef.current;
      if (loadMore && !isLoadingMoreRef.current) {
        const isAtLeftEdge = range.from <= CHART_THRESHOLDS.loadMoreTrigger;
        const now = Date.now();
        const timeSinceLastLoad = now - lastLoadMoreTimeRef.current;

        if (isAtLeftEdge && timeSinceLastLoad > CHART_THRESHOLDS.loadMoreDebounce) {
          console.log('[useChartScroll] Loading more data...');
          isLoadingMoreRef.current = true;
          lastLoadMoreTimeRef.current = now;

          loadMore().finally(() => {
            isLoadingMoreRef.current = false;
          });
        }
      }
    };

    chartInstance.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    console.log('[useChartScroll] Subscribed to visible range changes');

    return () => {
      chartInstance.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      console.log('[useChartScroll] Unsubscribed from visible range changes');
    };
  }, [chart, dataLength, autoScrollRef, subscribeVersion]);

  return {
    autoScroll: autoScrollRef,
    isLoadingMore: isLoadingMoreRef,
  };
}
