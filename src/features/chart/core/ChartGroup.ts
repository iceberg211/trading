/**
 * 图表组管理器
 * 
 * 统一管理主图和多个副图的生命周期
 */

import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { TimeScaleSync } from './TimeScaleSync';

export type SubchartType = 'MACD' | 'RSI' | 'VOL' | null;

export interface SubchartSlot {
  id: string;
  type: SubchartType;
  chart: IChartApi | null;
  series: Record<string, ISeriesApi<any>>;
}

export interface ChartGroupState {
  mainChart: IChartApi | null;
  mainSeries: {
    candleSeries: ISeriesApi<'Candlestick'> | null;
    lineSeries: ISeriesApi<'Line'> | null;
    volumeSeries: ISeriesApi<'Histogram'> | null;
    maSeries: ISeriesApi<'Line'>[];
    emaSeries: ISeriesApi<'Line'>[];
    bollSeries: ISeriesApi<'Line'>[];
  };
  subcharts: SubchartSlot[];
  timeScaleSync: TimeScaleSync;
}

export const MAX_SUBCHARTS = 3;

export class ChartGroup {
  private state: ChartGroupState = {
    mainChart: null,
    mainSeries: {
      candleSeries: null,
      lineSeries: null,
      volumeSeries: null,
      maSeries: [],
      emaSeries: [],
      bollSeries: [],
    },
    subcharts: [],
    timeScaleSync: new TimeScaleSync(),
  };

  /**
   * 设置主图
   */
  setMainChart(chart: IChartApi) {
    this.state.mainChart = chart;
    this.state.timeScaleSync.setMainChart(chart);
  }

  /**
   * 获取主图
   */
  getMainChart(): IChartApi | null {
    return this.state.mainChart;
  }

  /**
   * 设置主图系列
   */
  setMainSeries(series: Partial<ChartGroupState['mainSeries']>) {
    Object.assign(this.state.mainSeries, series);
  }

  /**
   * 获取主图系列
   */
  getMainSeries() {
    return this.state.mainSeries;
  }

  /**
   * 添加副图
   */
  addSubchart(id: string, type: SubchartType, chart: IChartApi): SubchartSlot | null {
    if (this.state.subcharts.length >= MAX_SUBCHARTS) {
      console.warn(`Maximum ${MAX_SUBCHARTS} subcharts allowed`);
      return null;
    }

    const slot: SubchartSlot = {
      id,
      type,
      chart,
      series: {},
    };

    this.state.subcharts.push(slot);
    this.state.timeScaleSync.addSubchart(chart);

    return slot;
  }

  /**
   * 移除副图
   */
  removeSubchart(id: string) {
    const index = this.state.subcharts.findIndex((s) => s.id === id);
    if (index === -1) return;

    const slot = this.state.subcharts[index];
    if (slot.chart) {
      this.state.timeScaleSync.removeSubchart(slot.chart);
      slot.chart.remove();
    }

    this.state.subcharts.splice(index, 1);
  }

  /**
   * 获取副图
   */
  getSubchart(id: string): SubchartSlot | undefined {
    return this.state.subcharts.find((s) => s.id === id);
  }

  /**
   * 获取所有副图
   */
  getSubcharts(): SubchartSlot[] {
    return this.state.subcharts;
  }

  /**
   * 获取时间轴同步器
   */
  getTimeScaleSync(): TimeScaleSync {
    return this.state.timeScaleSync;
  }

  /**
   * 同步时间轴
   */
  syncTimeScale() {
    this.state.timeScaleSync.syncToMainChart();
  }

  /**
   * 清理所有资源
   */
  dispose() {
    // 清理副图
    for (const slot of this.state.subcharts) {
      if (slot.chart) {
        slot.chart.remove();
      }
    }
    this.state.subcharts = [];

    // 清理主图
    if (this.state.mainChart) {
      this.state.mainChart.remove();
      this.state.mainChart = null;
    }

    // 清理时间轴同步
    this.state.timeScaleSync.dispose();

    // 重置系列
    this.state.mainSeries = {
      candleSeries: null,
      lineSeries: null,
      volumeSeries: null,
      maSeries: [],
      emaSeries: [],
      bollSeries: [],
    };
  }
}

// 导出单例
export const chartGroup = new ChartGroup();
