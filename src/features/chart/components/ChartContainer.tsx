import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { useKlineData } from '../hooks/useKlineData';
import { useChartGroup, SubchartConfig } from '../hooks/useChartGroup';
import { useSubchartSlots, SubchartType } from '../hooks/useSubchartSlots';
import { useChartScroll } from '../hooks/useChartScroll';
import { useDrawingManager, useDrawingTools, DrawingDropdown } from '../drawing';
import { ChartToolbar } from './ChartToolbar';
import { SubchartPanel } from './SubchartPanel';
import { OHLCVPanel } from './OHLCVPanel';
import { ChartStatusBar } from './ChartStatusBar';


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
  const subchartConfigs: SubchartConfig[] = useMemo(() => subchartSlots.map((slot) => ({
    id: slot.id,
    type: slot.type as SubchartConfig['type'],
    container: slot.container,
  })), [subchartSlots]);

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
  const handleSubchartToggle = useCallback((type: SubchartType) => {
    addSubchart(type);
  }, [addSubchart]);

  // 工具栏 Toggle Handlers
  const handleToggleVolume = useCallback(() => setShowVolume((v) => !v), []);
  const handleToggleMA = useCallback(() => setShowMA((v) => !v), []);
  const handleToggleEMA = useCallback(() => setShowEMA((v) => !v), []);
  const handleToggleBOLL = useCallback(() => setShowBOLL((v) => !v), []);

  // 获取当前激活的副图类型（用于工具栏高亮）
  const activeSubchartType: 'MACD' | 'RSI' | null = useMemo(() => 
    activeSlots.length > 0 && (activeSlots[0].type === 'MACD' || activeSlots[0].type === 'RSI') 
      ? activeSlots[0].type 
      : null,
    [activeSlots]
  );



  return (
    <div className="flex flex-col h-full bg-bg-card">
      {/* 工具栏 */}
      <div className="border-b border-line-dark px-2 h-8 bg-bg-panel flex items-center justify-between gap-2">
        <ChartToolbar
          chartType={chartType}
          showVolume={showVolume}
          showMA={showMA}
          showEMA={showEMA}
          showBOLL={showBOLL}
          subchartType={activeSubchartType}
          onChangeChartType={setChartType}
          onToggleVolume={handleToggleVolume}
          onToggleMA={handleToggleMA}
          onToggleEMA={handleToggleEMA}
          onToggleBOLL={handleToggleBOLL}
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
      <div className="px-3 bg-bg-card border-b border-line-dark h-[28px] overflow-hidden flex items-center">
        <OHLCVPanel />
      </div>

      {/* 状态栏 */}
      <ChartStatusBar
        wsStatus={wsStatus}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        error={error}
      />

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
