/**
 * 时间轴同步器
 * 
 * 确保主图和所有副图的时间轴联动
 */

import type { IChartApi, ITimeScaleApi, LogicalRange, Time } from 'lightweight-charts';

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

    // 使用 LogicalRange 监听，确保主图拖动时副图同步
    timeScale.subscribeVisibleLogicalRangeChange(this.handleRangeChange);
  }
  
  /**
   * 处理主图范围变化
   */
  private handleRangeChange = (range: LogicalRange | null) => {
    if (this.isSyncing || !range) return;
    
    this.isSyncing = true;
    
    for (const subchart of this.subcharts) {
      try {
        subchart.timeScale().setVisibleLogicalRange(range);
      } catch {
        // 忽略同步错误
      }
    }
    
    this.isSyncing = false;
  };

  /**
   * 同步所有副图到主图当前范围
   */
  syncToMainChart() {
    if (!this.mainChart) return;
    
    const range = this.mainChart.timeScale().getVisibleLogicalRange();
    if (range) {
      this.handleRangeChange(range);
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
      this.mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(this.handleRangeChange);
    }
    this.mainChart = null;
    this.subcharts = [];
  }
}

// 导出单例
export const timeScaleSync = new TimeScaleSync();
