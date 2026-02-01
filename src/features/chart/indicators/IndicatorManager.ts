/**
 * 指标管理器
 * 管理图表上的技术指标线系列
 * 支持：MA, EMA, BOLL
 */

import type { IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts';
import type { Candle } from '@/types/binance';
import { calculateMA, calculateEMA, calculateBOLL } from './algorithms';
import type { IndicatorConfig, IndicatorResult, BollResult } from './types';
import type { LineWidth } from 'lightweight-charts';

type LineSeries = ISeriesApi<'Line'>;

interface SeriesGroup {
  main?: LineSeries;
  upper?: LineSeries;
  middle?: LineSeries;
  lower?: LineSeries;
}

export class IndicatorManager {
  private chart: IChartApi | null = null;
  private seriesGroups: Map<string, SeriesGroup> = new Map();
  private configs: IndicatorConfig[] = [];

  /**
   * 绑定图表实例
   */
  attach(chart: IChartApi) {
    this.chart = chart;
  }

  /**
   * 解绑图表
   */
  detach() {
    this.removeAll();
    this.chart = null;
  }

  /**
   * 添加指标
   */
  addIndicator(config: IndicatorConfig, candles: Candle[]) {
    if (!this.chart) return;
    
    // 如果已存在则先移除
    if (this.seriesGroups.has(config.id)) {
      this.removeIndicator(config.id);
    }
    
    const group: SeriesGroup = {};
    
    if (config.type === 'BOLL') {
      // BOLL 需要三条线
      const colors = config.colors.length >= 3 
        ? config.colors 
        : ['#F6465D', '#F0B90B', '#0ECB81'];
      
      group.upper = this.createLineSeries(colors[0]);
      group.middle = this.createLineSeries(colors[1]);
      group.lower = this.createLineSeries(colors[2]);
      
      const bollData = calculateBOLL(candles, config.params.period || 20, config.params.stdDev || 2);
      if (bollData.length > 0) {
        group.upper.setData(this.toBollLineData(bollData, 'upper'));
        group.middle.setData(this.toBollLineData(bollData, 'middle'));
        group.lower.setData(this.toBollLineData(bollData, 'lower'));
      }
    } else {
      // MA/EMA 单条线
      const color = config.colors[0] || '#F5BC00';
      group.main = this.createLineSeries(color);
      
      const data = this.calculateSimpleIndicator(config, candles);
      if (data.length > 0) {
        group.main.setData(data);
      }
    }
    
    this.seriesGroups.set(config.id, group);
    this.configs.push(config);
  }

  /**
   * 创建线系列
   */
  private createLineSeries(color: string, lineWidth: LineWidth = 1): LineSeries {
    return this.chart!.addLineSeries({
      color,
      lineWidth,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
  }

  /**
   * 移除指标
   */
  removeIndicator(id: string) {
    const group = this.seriesGroups.get(id);
    if (group && this.chart) {
      if (group.main) this.chart.removeSeries(group.main);
      if (group.upper) this.chart.removeSeries(group.upper);
      if (group.middle) this.chart.removeSeries(group.middle);
      if (group.lower) this.chart.removeSeries(group.lower);
      this.seriesGroups.delete(id);
      this.configs = this.configs.filter(c => c.id !== id);
    }
  }

  /**
   * 移除所有指标
   */
  removeAll() {
    for (const [id] of this.seriesGroups) {
      this.removeIndicator(id);
    }
  }

  /**
   * 更新指标数据（K线更新时调用）
   */
  updateIndicators(candles: Candle[]) {
    for (const config of this.configs) {
      const group = this.seriesGroups.get(config.id);
      if (!group) continue;
      
      if (config.type === 'BOLL') {
        const bollData = calculateBOLL(candles, config.params.period || 20, config.params.stdDev || 2);
        if (bollData.length > 0) {
          group.upper?.setData(this.toBollLineData(bollData, 'upper'));
          group.middle?.setData(this.toBollLineData(bollData, 'middle'));
          group.lower?.setData(this.toBollLineData(bollData, 'lower'));
        }
      } else {
        const data = this.calculateSimpleIndicator(config, candles);
        if (data.length > 0) {
          group.main?.setData(data);
        }
      }
    }
  }

  /**
   * 增量更新
   */
  updateLast(candles: Candle[]) {
    if (candles.length === 0) return;
    
    for (const config of this.configs) {
      const group = this.seriesGroups.get(config.id);
      if (!group) continue;
      
      if (config.type === 'BOLL') {
        const bollData = calculateBOLL(candles, config.params.period || 20, config.params.stdDev || 2);
        if (bollData.length > 0) {
          const last = bollData[bollData.length - 1];
          group.upper?.update({ time: last.time as Time, value: last.upper });
          group.middle?.update({ time: last.time as Time, value: last.middle });
          group.lower?.update({ time: last.time as Time, value: last.lower });
        }
      } else {
        const data = this.calculateSimpleIndicator(config, candles);
        if (data.length > 0) {
          group.main?.update(data[data.length - 1]);
        }
      }
    }
  }

  /**
   * 计算简单指标 (MA/EMA)
   */
  private calculateSimpleIndicator(config: IndicatorConfig, candles: Candle[]): LineData[] {
    let results: IndicatorResult[] = [];
    
    switch (config.type) {
      case 'MA':
        results = calculateMA(candles, config.params.period || 7);
        break;
      case 'EMA':
        results = calculateEMA(candles, config.params.period || 7);
        break;
      default:
        return [];
    }
    
    return results
      .filter((r): r is { time: number; value: number } => r.value !== null)
      .map(r => ({
        time: r.time as Time,
        value: r.value,
      }));
  }

  /**
   * 转换 BOLL 数据为 LineData
   */
  private toBollLineData(data: BollResult[], band: 'upper' | 'middle' | 'lower'): LineData[] {
    return data.map(d => ({
      time: d.time as Time,
      value: d[band],
    }));
  }

  /**
   * 获取当前配置
   */
  getConfigs(): IndicatorConfig[] {
    return [...this.configs];
  }

  /**
   * 切换指标可见性
   */
  toggleVisibility(id: string) {
    const group = this.seriesGroups.get(id);
    if (!group) return;
    
    const config = this.configs.find(c => c.id === id);
    if (!config) return;
    
    config.visible = !config.visible;
    const options = { visible: config.visible };
    
    if (group.main) group.main.applyOptions(options);
    if (group.upper) group.upper.applyOptions(options);
    if (group.middle) group.middle.applyOptions(options);
    if (group.lower) group.lower.applyOptions(options);
  }
}

// 导出单例
export const indicatorManager = new IndicatorManager();

