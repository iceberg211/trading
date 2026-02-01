/**
 * 时间轴同步器
 * 
 * 确保主图和所有副图的时间轴联动
 * 使用 TimeRange（实际时间）而非 LogicalRange（数组索引）同步
 * 解决副图数据起始位置不同导致的错位问题
 */

import type { IChartApi, ITimeScaleApi, Time, Range } from 'lightweight-charts';

export class TimeScaleSync {
  private mainChart: IChartApi | null = null;
  private subcharts: IChartApi[] = [];
  private isSyncing = false;

  /**
   * 设置主图
   */
  setMainChart(chart: IChartApi) {
    this.mainChart = chart;
    this.setupMainChartListeners();
  }

  /**
   * 添加副图
   */
  addSubchart(chart: IChartApi) {
    if (this.subcharts.includes(chart)) return;
    
    // 隐藏副图自身的时间轴
    chart.timeScale().applyOptions({ visible: false });
    
    this.subcharts.push(chart);
    
    // 立即同步到当前主图范围
    this.syncToMainChart();
  }

  /**
   * 移除副图
   */
  removeSubchart(chart: IChartApi) {
    const index = this.subcharts.indexOf(chart);
    if (index > -1) {
      this.subcharts.splice(index, 1);
    }
  }

  /**
   * 设置主图事件监听
   */
  private setupMainChartListeners() {
    if (!this.mainChart) return;

    const timeScale = this.mainChart.timeScale();

    // 使用 TimeRange 监听，基于实际时间同步
    timeScale.subscribeVisibleTimeRangeChange(this.handleTimeRangeChange);
  }

  /**
   * 处理主图时间范围变化（使用实际时间）
   */
  private handleTimeRangeChange = (timeRange: Range<Time> | null) => {
    if (this.isSyncing || !timeRange) return;
    
    this.isSyncing = true;
    
    for (const subchart of this.subcharts) {
      try {
        // 使用 setVisibleRange 基于时间同步，确保不同长度的数据也能对齐
        subchart.timeScale().setVisibleRange(timeRange);
      } catch {
        // 忽略同步错误（可能是副图还没有数据）
      }
    }
    
    this.isSyncing = false;
  };

  /**
   * 同步所有副图到主图当前范围（使用时间范围）
   */
  syncToMainChart() {
    if (!this.mainChart) return;
    
    const timeRange = this.mainChart.timeScale().getVisibleRange();
    if (timeRange) {
      this.handleTimeRangeChange(timeRange);
    }
  }

  /**
   * 获取主图时间轴
   */
  getMainTimeScale(): ITimeScaleApi<Time> | null {
    return this.mainChart?.timeScale() ?? null;
  }

  /**
   * 清理
   */
  dispose() {
    if (this.mainChart) {
      this.mainChart.timeScale().unsubscribeVisibleTimeRangeChange(this.handleTimeRangeChange);
    }
    this.mainChart = null;
    this.subcharts = [];
  }
}

// 导出单例
export const timeScaleSync = new TimeScaleSync();
