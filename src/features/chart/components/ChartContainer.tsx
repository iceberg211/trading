import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useKlineData } from '../hooks/useKlineData';
import { useChartGroup, SubchartConfig } from '../hooks/useChartGroup';
import { useSubchartSlots, SubchartType, MAX_SUBCHART_SLOTS } from '../hooks/useSubchartSlots';
import { useChartScroll } from '../hooks/useChartScroll';
import { useDrawingManager, useDrawingTools, DrawingDropdown } from '../drawing';
import { ChartToolbar } from './ChartToolbar';
import { SubchartPanel } from './SubchartPanel';
import { OHLCVPanel } from './OHLCVPanel';
import { ChartStatusBar } from './ChartStatusBar';
import { TradingViewWidget } from './TradingViewWidget';
import { chartViewAtom } from '../atoms/chartViewAtom';
import { intervalAtom, symbolAtom } from '../atoms/klineAtom';

const noop = () => {};

function BasicChartView() {
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
    setSlotType,
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

  const [replacePickerOpen, setReplacePickerOpen] = useState(false);
  const [pendingSubchartType, setPendingSubchartType] = useState<Exclude<SubchartType, null> | null>(null);

  // 副图切换
  const handleSubchartToggle = useCallback((type: SubchartType) => {
    if (!type) return;
    const isActive = activeSlots.some((slot) => slot.type === type);
    if (isActive) {
      addSubchart(type);
      return;
    }
    if (activeSlots.length < MAX_SUBCHART_SLOTS) {
      addSubchart(type);
      return;
    }
    setPendingSubchartType(type);
    setReplacePickerOpen(true);
  }, [activeSlots, addSubchart]);

  const handleReplaceSubchart = useCallback((slotId: string) => {
    if (!pendingSubchartType) return;
    setSlotType(slotId, pendingSubchartType);
    setPendingSubchartType(null);
    setReplacePickerOpen(false);
  }, [pendingSubchartType, setSlotType]);

  // 工具栏 Toggle Handlers
  const handleToggleVolume = useCallback(() => setShowVolume((v) => !v), []);
  const handleToggleMA = useCallback(() => setShowMA((v) => !v), []);
  const handleToggleEMA = useCallback(() => setShowEMA((v) => !v), []);
  const handleToggleBOLL = useCallback(() => setShowBOLL((v) => !v), []);

  // 获取当前激活的副图类型（用于工具栏高亮）
  const activeSubchartTypes = useMemo(
    () =>
      activeSlots
        .map((slot) => slot.type)
        .filter((type): type is 'MACD' | 'RSI' | 'KDJ' | 'OBV' | 'WR' =>
          Boolean(type)
        ),
    [activeSlots]
  );

  return (
    <>
      {/* 工具栏 */}
      <div className="border-b border-line-dark px-2 h-8 bg-bg-panel flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-2 w-full min-w-0">
          <div className="min-w-0 flex-1">
            <ChartToolbar
              chartType={chartType}
              showVolume={showVolume}
              showMA={showMA}
              showEMA={showEMA}
              showBOLL={showBOLL}
              activeSubchartTypes={activeSubchartTypes}
              onChangeChartType={setChartType}
              onToggleVolume={handleToggleVolume}
              onToggleMA={handleToggleMA}
              onToggleEMA={handleToggleEMA}
              onToggleBOLL={handleToggleBOLL}
              onSelectSubchart={handleSubchartToggle}
              onResetScale={resetScale}
              onGoToLatest={goToLatest}
            />
          </div>

          {/* 画线工具下拉菜单 */}
          <div className="shrink-0">
            <DrawingDropdown
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              onClearAll={clearAll}
              onRemoveLast={removeLast}
              drawingsCount={drawingsCount}
              pendingPoint={pendingPoint !== null}
            />
          </div>
        </div>

        {replacePickerOpen && pendingSubchartType && (
          <div className="absolute right-2 top-full mt-1 w-44 bg-bg-card border border-line-dark rounded-panel shadow-xl z-tooltip overflow-hidden">
            <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-line-dark bg-bg-panel/70">
              已满，选择替换
            </div>
            <div className="py-1">
              {activeSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => handleReplaceSubchart(slot.id)}
                  className="w-full flex items-center justify-between px-3 h-8 text-xs text-text-secondary hover:bg-bg-soft/60 hover:text-text-primary transition-colors"
                >
                  <span>{slot.type}</span>
                  <span className="text-[10px] text-text-tertiary">替换</span>
                </button>
              ))}
            </div>
            <div className="h-px bg-line-dark" />
            <button
              onClick={() => {
                setReplacePickerOpen(false);
                setPendingSubchartType(null);
              }}
              className="w-full px-3 h-8 text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-soft/60 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* OHLCV 悬浮信息 - 固定高度避免图表抖动 */}
      <div className="px-3 bg-bg-card border-b border-line-dark h-[28px] overflow-hidden flex items-center">
        <OHLCVPanel />
      </div>

      {/* 状态栏 */}
      {loading && klineData.length === 0 ? (
        <div className="px-3 py-1 bg-bg-panel border-b border-line-dark">
          <div className="h-3 w-48 bg-bg-soft/60 rounded-sm animate-pulse" />
        </div>
      ) : (
        <ChartStatusBar
          wsStatus={wsStatus}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          error={error}
        />
      )}

      {/* 主图表 */}
      <div className={`relative min-h-[300px] ${activeSlots.length > 0 ? 'flex-[3]' : 'flex-1'}`}>
        <div ref={setContainerRef} className="absolute inset-0" />
        {loading && klineData.length === 0 && (
          <div className="absolute inset-0 bg-bg-card">
            <div className="h-full w-full animate-pulse">
              <div className="h-full w-full bg-gradient-to-br from-bg-soft/40 via-bg-soft/10 to-bg-soft/40" />
              <div className="absolute left-3 top-3 h-3 w-32 bg-bg-soft/60 rounded-sm" />
              <div className="absolute left-3 top-8 h-3 w-40 bg-bg-soft/60 rounded-sm" />
              <div className="absolute bottom-4 left-3 h-3 w-24 bg-bg-soft/60 rounded-sm" />
            </div>
          </div>
        )}
      </div>

      {/* 副图区域 (最多3个) */}
      {subchartSlots.map((slot) =>
        loading && klineData.length === 0 ? (
          <div key={slot.id} className="border-t border-line-dark">
            <div className="flex items-center justify-between px-3 py-0.5 bg-bg-soft text-[10px]">
              <span className="text-text-tertiary">加载中…</span>
            </div>
            <div className="h-[160px] bg-bg-card">
              <div className="h-full w-full animate-pulse bg-gradient-to-br from-bg-soft/30 via-bg-soft/10 to-bg-soft/30" />
            </div>
          </div>
        ) : (
          <SubchartPanel
            key={slot.id}
            slotId={slot.id}
            type={slot.type}
            onSetContainer={setSlotContainer}
            onRemove={removeSubchart}
          />
        )
      )}
    </>
  );
}

function TradingViewChartView() {
  const symbol = useAtomValue(symbolAtom);
  const interval = useAtomValue(intervalAtom);

  return (
    <>
      <div className="border-b border-line-dark px-2 h-8 bg-bg-panel flex items-center justify-between gap-2">
        <ChartToolbar
          chartType="candles"
          showVolume={false}
          showMA={false}
          showEMA={false}
          showBOLL={false}
          activeSubchartTypes={[]}
          onChangeChartType={noop}
          onToggleVolume={noop}
          onToggleMA={noop}
          onToggleEMA={noop}
          onToggleBOLL={noop}
          onSelectSubchart={noop}
          onResetScale={noop}
          onGoToLatest={noop}
        />
      </div>

      <div className="flex-1 min-h-0">
        <TradingViewWidget symbol={symbol} interval={interval} exchangePrefix="BINANCE" />
      </div>
    </>
  );
}

export function ChartContainer() {
  const chartView = useAtomValue(chartViewAtom);

  return (
    <div className="flex flex-col h-full bg-bg-card">
      {chartView === 'basic' ? <BasicChartView /> : <TradingViewChartView />}
    </div>
  );
}
