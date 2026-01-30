/**
 * useChartScroll - 图表滚动与翻页逻辑
 * 
 * 职责：
 * - 监听可视范围变化
 * - 管理自动滚动状态
 * - 触发加载更多历史数据
 */

import { useEffect, useRef, MutableRefObject } from 'react';
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
  const loadMoreRef = useRef(onLoadMore);
  const isSubscribedRef = useRef(false);

  // 保持 onLoadMore 引用最新
  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const chartInstance = chart.current;
    if (!chartInstance) return;
    if (isSubscribedRef.current) return;

    const handleVisibleRangeChange = (range: LogicalRange | null) => {
      if (!range) return;
      if (dataLength.current === 0) return;

      const lastIndex = dataLength.current - 1;
      const isBeyondRightEdge = range.to > lastIndex + 0.5;
      const isAtRightEdge = range.to >= lastIndex - CHART_THRESHOLDS.autoScrollThreshold;
      autoScrollRef.current = !isBeyondRightEdge && isAtRightEdge;

      // 左边界检测
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
    isSubscribedRef.current = true;

    return () => {
      chartInstance.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      isSubscribedRef.current = false;
    };
  }, [chart, dataLength]);

  return {
    autoScroll: autoScrollRef,
    isLoadingMore: isLoadingMoreRef,
  };
}
