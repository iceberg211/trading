/**
 * 画线管理器
 * 管理图表上的画线对象
 */

import type { IChartApi, ISeriesApi, Time, IPriceLine } from 'lightweight-charts';
import type { Drawing, DrawingPoint, DrawingStyle } from './types';
import { DEFAULT_DRAWING_STYLES, FIBONACCI_LEVELS } from './types';

type LineSeries = ISeriesApi<'Line'>;

interface DrawingElements {
  lines: LineSeries[];
  priceLines: IPriceLine[];
}

export class DrawingManager {
  private chart: IChartApi | null = null;
  private candleSeries: ISeriesApi<'Candlestick'> | null = null;
  private drawings: Map<string, Drawing> = new Map();
  private elements: Map<string, DrawingElements> = new Map();
  private idCounter = 0;

  /**
   * 绑定图表实例
   */
  attach(chart: IChartApi, candleSeries: ISeriesApi<'Candlestick'>) {
    this.chart = chart;
    this.candleSeries = candleSeries;
  }

  /**
   * 解绑图表
   */
  detach() {
    this.removeAll();
    this.chart = null;
    this.candleSeries = null;
  }

  /**
   * 添加水平线
   */
  addHorizontalLine(price: number, style?: Partial<DrawingStyle>): string {
    const id = this.generateId();
    const mergedStyle = { ...DEFAULT_DRAWING_STYLES.horizontal, ...style };
    
    const drawing: Drawing = {
      id,
      type: 'horizontal',
      points: [{ time: 0, price }],
      style: mergedStyle,
      locked: false,
      visible: true,
    };
    
    this.createHorizontalLine(drawing);
    this.drawings.set(id, drawing);
    return id;
  }

  /**
   * 添加趋势线
   */
  addTrendLine(point1: DrawingPoint, point2: DrawingPoint, style?: Partial<DrawingStyle>): string {
    const id = this.generateId();
    const mergedStyle = { ...DEFAULT_DRAWING_STYLES.trendline, ...style };
    
    const drawing: Drawing = {
      id,
      type: 'trendline',
      points: [point1, point2],
      style: mergedStyle,
      locked: false,
      visible: true,
    };
    
    this.createTrendLine(drawing);
    this.drawings.set(id, drawing);
    return id;
  }

  /**
   * 添加斐波那契回撤
   */
  addFibonacci(point1: DrawingPoint, point2: DrawingPoint, style?: Partial<DrawingStyle>): string {
    const id = this.generateId();
    const mergedStyle = { ...DEFAULT_DRAWING_STYLES.fibonacci, ...style };
    
    const drawing: Drawing = {
      id,
      type: 'fibonacci',
      points: [point1, point2],
      style: mergedStyle,
      locked: false,
      visible: true,
    };
    
    this.createFibonacci(drawing);
    this.drawings.set(id, drawing);
    return id;
  }

  /**
   * 创建水平线（使用 PriceLine）
   */
  private createHorizontalLine(drawing: Drawing) {
    if (!this.candleSeries) return;
    
    const price = drawing.points[0].price;
    const priceLine = this.candleSeries.createPriceLine({
      price,
      color: drawing.style.color,
      lineWidth: drawing.style.lineWidth as 1 | 2 | 3 | 4,
      lineStyle: this.toLineStyle(drawing.style.lineStyle),
      axisLabelVisible: true,
      title: '',
    });
    
    this.elements.set(drawing.id, { lines: [], priceLines: [priceLine] });
  }

  /**
   * 创建趋势线（使用 LineSeries）
   */
  private createTrendLine(drawing: Drawing) {
    if (!this.chart) return;
    
    const [p1, p2] = drawing.points;
    
    const lineSeries = this.chart.addLineSeries({
      color: drawing.style.color,
      lineWidth: drawing.style.lineWidth as 1 | 2 | 3 | 4,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    
    lineSeries.setData([
      { time: (p1.time / 1000) as Time, value: p1.price },
      { time: (p2.time / 1000) as Time, value: p2.price },
    ]);
    
    this.elements.set(drawing.id, { lines: [lineSeries], priceLines: [] });
  }

  /**
   * 创建斐波那契回撤
   */
  private createFibonacci(drawing: Drawing) {
    if (!this.candleSeries) return;
    
    const [p1, p2] = drawing.points;
    const priceRange = p2.price - p1.price;
    const priceLines: IPriceLine[] = [];
    
    for (const level of FIBONACCI_LEVELS) {
      const price = p1.price + priceRange * level;
      const priceLine = this.candleSeries.createPriceLine({
        price,
        color: drawing.style.color,
        lineWidth: 1,
        lineStyle: level === 0 || level === 1 ? 0 : 2, // 0 = solid, 2 = dashed
        axisLabelVisible: true,
        title: `${(level * 100).toFixed(1)}%`,
      });
      priceLines.push(priceLine);
    }
    
    this.elements.set(drawing.id, { lines: [], priceLines });
  }

  /**
   * 移除画线
   */
  removeDrawing(id: string) {
    const elements = this.elements.get(id);
    if (elements && this.chart && this.candleSeries) {
      // 移除 LineSeries
      for (const line of elements.lines) {
        this.chart.removeSeries(line);
      }
      // 移除 PriceLines
      for (const priceLine of elements.priceLines) {
        this.candleSeries.removePriceLine(priceLine);
      }
      this.elements.delete(id);
    }
    this.drawings.delete(id);
  }

  /**
   * 移除所有画线
   */
  removeAll() {
    for (const [id] of this.drawings) {
      this.removeDrawing(id);
    }
  }

  /**
   * 获取所有画线
   */
  getDrawings(): Drawing[] {
    return Array.from(this.drawings.values());
  }

  /**
   * 切换可见性
   */
  toggleVisibility(id: string) {
    const drawing = this.drawings.get(id);
    const elements = this.elements.get(id);
    if (!drawing || !elements) return;
    
    drawing.visible = !drawing.visible;
    
    for (const line of elements.lines) {
      line.applyOptions({ visible: drawing.visible });
    }
    // PriceLine 没有 visible 选项，需要重建
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `drawing_${++this.idCounter}_${Date.now()}`;
  }

  /**
   * 转换线条样式
   */
  private toLineStyle(style: 'solid' | 'dashed' | 'dotted'): number {
    switch (style) {
      case 'solid': return 0;
      case 'dashed': return 2;
      case 'dotted': return 1;
      default: return 0;
    }
  }
}

// 导出单例
export const drawingManager = new DrawingManager();
