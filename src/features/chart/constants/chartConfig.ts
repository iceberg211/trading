/**
 * 图表配置常量
 * 集中管理颜色、周期等配置，便于主题化和维护
 */

// 图表主题颜色
export const CHART_COLORS = {
  // 背景与边框
  background: '#161A1E',
  textColor: '#848E9C',
  gridLine: '#2B3139',
  borderColor: '#2B3139',
  
  // K 线颜色
  upColor: '#0ECB81',
  downColor: '#F6465D',
  
  // 十字线
  crosshairLine: '#5E6673',
  crosshairLabel: '#474D57',
  
  // 指标线
  lineChart: '#FCD535',
  maLine: '#4BD4FF',
  emaLine: '#FFB86B',
} as const;

// 指标周期
export const INDICATOR_PERIODS = {
  MA: 7,
  EMA: 25,
} as const;

// 翻页与防抖
export const CHART_THRESHOLDS = {
  /** 左边界触发加载更多的阈值（条数） */
  loadMoreTrigger: 10,
  /** 加载更多防抖间隔（毫秒） */
  loadMoreDebounce: 2000,
  /** 右边界自动滚动阈值 */
  autoScrollThreshold: 5,
} as const;

// 图表选项预设
export const CHART_OPTIONS = {
  layout: {
    background: { color: CHART_COLORS.background },
    textColor: CHART_COLORS.textColor,
  },
  grid: {
    vertLines: { color: CHART_COLORS.gridLine },
    horzLines: { color: CHART_COLORS.gridLine },
  },
  timeScale: {
    borderColor: CHART_COLORS.borderColor,
    timeVisible: true,
    secondsVisible: false,
  },
  rightPriceScale: {
    borderColor: CHART_COLORS.borderColor,
  },
  crosshair: {
    mode: 0, // CrosshairMode.Normal
    vertLine: {
      color: CHART_COLORS.crosshairLine,
      width: 1,
      style: 2, // LineStyle.Dashed
      labelBackgroundColor: CHART_COLORS.crosshairLabel,
      labelVisible: true,
    },
    horzLine: {
      color: CHART_COLORS.crosshairLine,
      width: 1,
      style: 2,
      labelBackgroundColor: CHART_COLORS.crosshairLabel,
      labelVisible: true,
    },
  },
} as const;

// 系列选项预设
export const SERIES_OPTIONS = {
  candlestick: {
    upColor: CHART_COLORS.upColor,
    downColor: CHART_COLORS.downColor,
    borderUpColor: CHART_COLORS.upColor,
    borderDownColor: CHART_COLORS.downColor,
    wickUpColor: CHART_COLORS.upColor,
    wickDownColor: CHART_COLORS.downColor,
  },
  line: {
    color: CHART_COLORS.lineChart,
    lineWidth: 2 as const,
  },
  volume: {
    priceScaleId: 'volume',
    priceFormat: { type: 'volume' as const },
    color: CHART_COLORS.upColor,
  },
  ma: {
    color: CHART_COLORS.maLine,
    lineWidth: 1 as const,
    lineStyle: 0,
  },
  ema: {
    color: CHART_COLORS.emaLine,
    lineWidth: 1 as const,
    lineStyle: 0,
  },
} as const;
