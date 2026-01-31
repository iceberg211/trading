/**
 * DrawingRenderer - 画线渲染器
 * 
 * 负责创建和管理 lightweight-charts 渲染元素
 */

import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { DrawingElement, DrawingPoint, DrawingStyle } from './types';
import { LINE_STYLE_MAP, FIBONACCI_LEVELS } from './types';

export class DrawingRenderer {
  private chart: IChartApi;
  private series: ISeriesApi<'Candlestick'>;
  private elements: Map<string, DrawingElement> = new Map();

  constructor(chart: IChartApi, series: ISeriesApi<'Candlestick'>) {
    this.chart = chart;
    this.series = series;
  }

  /**
   * 渲染水平线
   */
  renderHorizontalLine(id: string, price: number, style: DrawingStyle): DrawingElement {
    const priceLine = this.series.createPriceLine({
      price,
      color: style.color,
      lineWidth: style.lineWidth,
      lineStyle: LINE_STYLE_MAP[style.lineStyle],
      axisLabelVisible: true,
      title: '',
    });

    const element: DrawingElement = { id, type: 'horizontal', priceLine };
    this.elements.set(id, element);
    return element;
  }

  /**
   * 渲染趋势线
   */
  renderTrendLine(id: string, p1: DrawingPoint, p2: DrawingPoint, style: DrawingStyle): DrawingElement {
    const lineSeries = this.chart.addLineSeries({
      color: style.color,
      lineWidth: style.lineWidth,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    lineSeries.setData([
      { time: p1.time as Time, value: p1.price },
      { time: p2.time as Time, value: p2.price },
    ]);

    const element: DrawingElement = { id, type: 'trendline', lineSeries };
    this.elements.set(id, element);
    return element;
  }

  /**
   * 渲染斐波那契回撤
   */
  renderFibonacci(id: string, p1: DrawingPoint, p2: DrawingPoint, style: DrawingStyle): DrawingElement[] {
    const priceRange = p2.price - p1.price;
    const elements: DrawingElement[] = [];

    for (let i = 0; i < FIBONACCI_LEVELS.length; i++) {
      const level = FIBONACCI_LEVELS[i];
      const price = p1.price + priceRange * level;
      const levelId = `${id}_${i}`;

      const priceLine = this.series.createPriceLine({
        price,
        color: style.color,
        lineWidth: style.lineWidth,
        lineStyle: LINE_STYLE_MAP[style.lineStyle],
        axisLabelVisible: true,
        title: `${(level * 100).toFixed(1)}%`,
      });

      const element: DrawingElement = { id: levelId, type: 'fibonacci', priceLine };
      this.elements.set(levelId, element);
      elements.push(element);
    }

    return elements;
  }

  /**
   * 移除画线元素
   */
  remove(id: string): boolean {
    const element = this.elements.get(id);
    if (!element) return false;

    if (element.priceLine) {
      this.series.removePriceLine(element.priceLine);
    }
    if (element.lineSeries) {
      this.chart.removeSeries(element.lineSeries);
    }

    this.elements.delete(id);
    return true;
  }

  /**
   * 移除所有元素
   */
  removeAll(): void {
    for (const [id] of this.elements) {
      this.remove(id);
    }
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.removeAll();
  }
}
