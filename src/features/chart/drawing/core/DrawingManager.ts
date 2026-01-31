/**
 * DrawingManager - 画线管理器
 * 
 * 实例化类，管理画线对象的生命周期
 */

import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { Drawing, DrawingPoint, DrawingStyle } from './types';
import { DEFAULT_STYLES } from './types';
import { DrawingRenderer } from './DrawingRenderer';

export class DrawingManager {
  private renderer: DrawingRenderer;
  private drawings: Map<string, Drawing> = new Map();
  private idCounter = 0;

  // 事件回调
  onDrawingAdded?: (drawing: Drawing) => void;
  onDrawingRemoved?: (id: string) => void;
  onDrawingsChanged?: (drawings: Drawing[]) => void;

  constructor(chart: IChartApi, series: ISeriesApi<'Candlestick'>) {
    this.renderer = new DrawingRenderer(chart, series);
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `drawing_${++this.idCounter}_${Date.now()}`;
  }

  /**
   * 触发变更事件
   */
  private notifyChange(): void {
    this.onDrawingsChanged?.(this.getAllDrawings());
  }

  /**
   * 添加水平线
   */
  addHorizontalLine(price: number, style?: Partial<DrawingStyle>): string {
    const id = this.generateId();
    const mergedStyle = { ...DEFAULT_STYLES.horizontal, ...style };

    const drawing: Drawing = {
      id,
      type: 'horizontal',
      points: [{ time: 0, price }],
      style: mergedStyle,
      visible: true,
    };

    this.renderer.renderHorizontalLine(id, price, mergedStyle);
    this.drawings.set(id, drawing);
    
    this.onDrawingAdded?.(drawing);
    this.notifyChange();
    
    console.log('[DrawingManager] Added horizontal line:', id, 'at price:', price);
    return id;
  }

  /**
   * 添加趋势线
   */
  addTrendLine(p1: DrawingPoint, p2: DrawingPoint, style?: Partial<DrawingStyle>): string {
    const id = this.generateId();
    const mergedStyle = { ...DEFAULT_STYLES.trendline, ...style };

    const drawing: Drawing = {
      id,
      type: 'trendline',
      points: [p1, p2],
      style: mergedStyle,
      visible: true,
    };

    this.renderer.renderTrendLine(id, p1, p2, mergedStyle);
    this.drawings.set(id, drawing);
    
    this.onDrawingAdded?.(drawing);
    this.notifyChange();
    
    console.log('[DrawingManager] Added trend line:', id);
    return id;
  }

  /**
   * 添加斐波那契回撤
   */
  addFibonacci(p1: DrawingPoint, p2: DrawingPoint, style?: Partial<DrawingStyle>): string {
    const id = this.generateId();
    const mergedStyle = { ...DEFAULT_STYLES.fibonacci, ...style };

    const drawing: Drawing = {
      id,
      type: 'fibonacci',
      points: [p1, p2],
      style: mergedStyle,
      visible: true,
    };

    this.renderer.renderFibonacci(id, p1, p2, mergedStyle);
    this.drawings.set(id, drawing);
    
    this.onDrawingAdded?.(drawing);
    this.notifyChange();
    
    console.log('[DrawingManager] Added fibonacci:', id);
    return id;
  }

  /**
   * 移除画线
   */
  removeDrawing(id: string): boolean {
    const drawing = this.drawings.get(id);
    if (!drawing) return false;

    // 斐波那契需要移除多个元素
    if (drawing.type === 'fibonacci') {
      for (let i = 0; i < 7; i++) {
        this.renderer.remove(`${id}_${i}`);
      }
    } else {
      this.renderer.remove(id);
    }

    this.drawings.delete(id);
    this.onDrawingRemoved?.(id);
    this.notifyChange();
    
    console.log('[DrawingManager] Removed drawing:', id);
    return true;
  }

  /**
   * 移除最后一条画线
   */
  removeLast(): boolean {
    const ids = Array.from(this.drawings.keys());
    if (ids.length === 0) return false;
    return this.removeDrawing(ids[ids.length - 1]);
  }

  /**
   * 移除所有画线
   */
  removeAll(): void {
    const ids = Array.from(this.drawings.keys());
    for (const id of ids) {
      this.removeDrawing(id);
    }
    console.log('[DrawingManager] Removed all drawings');
  }

  /**
   * 获取单个画线
   */
  getDrawing(id: string): Drawing | undefined {
    return this.drawings.get(id);
  }

  /**
   * 获取所有画线
   */
  getAllDrawings(): Drawing[] {
    return Array.from(this.drawings.values());
  }

  /**
   * 获取画线数量
   */
  getCount(): number {
    return this.drawings.size;
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.renderer.destroy();
    this.drawings.clear();
    console.log('[DrawingManager] Destroyed');
  }
}
