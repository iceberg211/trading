import { useCallback, useState, useRef, useEffect } from 'react';
import { useKlineData } from '../hooks/useKlineData';
import { useChartGroup, SubchartConfig } from '../hooks/useChartGroup';
import { useSubchartSlots, SubchartType } from '../hooks/useSubchartSlots';
import { useChartScroll } from '../hooks/useChartScroll';
import { useDrawingManager, useDrawingTools, DrawingDropdown } from '../drawing';
import { ChartToolbar } from './ChartToolbar';
import { SubchartPanel } from './SubchartPanel';
import { OHLCVPanel } from './OHLCVPanel';


export function ChartContainer() {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const { klineData, loading, error, wsStatus, loadMore, loadingMore, hasMore } = useKlineData();
  const dataLengthRef = useRef(0);
  const candleSeriesRef = useRef<any>(null);
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  const [showVolume, setShowVolume] = useState(true);
  const [showMA, setShowMA] = useState(true);
  const [showEMA, setShowEMA] = useState(false);
  const [showBOLL, setShowBOLL] = useState(false);
  
  // 多副图管理
  const {
    slots: subchartSlots,
    activeSlots,
    setSlotContainer,
    addSubchart,
    removeSubchart,
  } = useSubchartSlots();
  
  // 转换为 ChartGroup 需要的配置格式
  const subchartConfigs: SubchartConfig[] = subchartSlots.map((slot) => ({
    id: slot.id,
    type: slot.type as SubchartConfig['type'],
    container: slot.container,
  }));

  const { resetScale, goToLatest, mainChartRef, mainSeries, autoScrollRef } = useChartGroup({
    mainContainer: containerEl,
    subchartConfigs,
    chartType,
    showVolume,
    showMA,
    showEMA,
    showBOLL,
  });

  // 同步数据长度用于滚动检测
  useEffect(() => {
    dataLengthRef.current = klineData.length;
  }, [klineData.length]);

  // 同步 candleSeries 引用用于画线
  useEffect(() => {
    candleSeriesRef.current = mainSeries.candleSeries;
  }, [mainSeries.candleSeries]);

  // 滚动加载更多
  useChartScroll({
    chart: mainChartRef,
    dataLength: dataLengthRef,
    onLoadMore: loadMore,
    autoScroll: autoScrollRef,
  });

  // 画线管理器（新模块化系统）
  const { manager, drawingsCount, clearAll, removeLast } = useDrawingManager({
    chartRef: mainChartRef,
    seriesRef: candleSeriesRef,
  });

  // 画线工具交互
  const { activeTool, setActiveTool, pendingPoint } = useDrawingTools({
    chartRef: mainChartRef,
    seriesRef: candleSeriesRef,
    manager,
  });
  
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerEl(node);
  }, []);

  // 副图切换
  const handleSubchartToggle = (type: SubchartType) => {
    addSubchart(type);
  };

  // 获取当前激活的副图类型（用于工具栏高亮）
  const activeSubchartType: 'MACD' | 'RSI' | null = 
    activeSlots.length > 0 && (activeSlots[0].type === 'MACD' || activeSlots[0].type === 'RSI') 
      ? activeSlots[0].type 
      : null;

  return (
    <div className="flex flex-col h-full bg-bg-card/90 backdrop-blur">
      {/* 工具栏 */}
      <div className="border-b border-line-dark px-2 bg-bg-soft/70 flex items-center justify-between">
        <ChartToolbar
          chartType={chartType}
          showVolume={showVolume}
          showMA={showMA}
          showEMA={showEMA}
          showBOLL={showBOLL}
          subchartType={activeSubchartType}
          onChangeChartType={setChartType}
          onToggleVolume={() => setShowVolume((v) => !v)}
          onToggleMA={() => setShowMA((v) => !v)}
          onToggleEMA={() => setShowEMA((v) => !v)}
          onToggleBOLL={() => setShowBOLL((v) => !v)}
          onSelectSubchart={handleSubchartToggle}
          onResetScale={resetScale}
          onGoToLatest={goToLatest}
        />
        
        {/* 画线工具下拉菜单 */}
        <DrawingDropdown
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onClearAll={clearAll}
          onRemoveLast={removeLast}
          drawingsCount={drawingsCount}
          pendingPoint={pendingPoint !== null}
        />
      </div>


      {/* OHLCV 悬浮信息 - 固定高度避免图表抖动 */}
      <div className="px-3 py-1.5 bg-bg-panel border-b border-line-dark h-[28px] overflow-hidden">
        <OHLCVPanel />
      </div>

      {/* 状态栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1 bg-bg-panel border-b border-line-dark text-[10px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary">WS:</span>
            <span
              className={`
                px-1.5 py-0.5 rounded font-medium
                ${
                  wsStatus === 'connected'
                    ? 'bg-up-bg text-up'
                    : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-down-bg text-down'
                }
              `}
            >
              {{
                connected: 'Live',
                connecting: '...',
                reconnecting: 'Retry',
                disconnected: 'Off',
              }[wsStatus]}
            </span>
          </div>
          
          {loading && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 border border-up border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary">Loading...</span>
            </div>
          )}
          
          {loadingMore && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 border border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-secondary">Loading more...</span>
            </div>
          )}
          
          {!hasMore && !loading && !loadingMore && (
            <span className="text-text-tertiary">No more data</span>
          )}
        </div>

        {error && <div className="text-down">{error}</div>}
      </div>

      {/* 主图表 */}
      <div ref={setContainerRef} className={`min-h-0 ${activeSlots.length > 0 ? 'flex-[3]' : 'flex-1'}`} />
      
      {/* 副图区域 (最多3个) */}
      {subchartSlots.map((slot) => (
        <SubchartPanel
          key={slot.id}
          slotId={slot.id}
          type={slot.type}
          onSetContainer={setSlotContainer}
          onRemove={removeSubchart}
        />
      ))}
    </div>
  );
}
