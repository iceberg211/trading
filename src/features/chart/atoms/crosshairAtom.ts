import { atom } from 'jotai';

/**
 * 十字线悬浮时的 OHLCV 数据
 */
export interface CrosshairData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  changePercent?: number;
  ma?: number;
  ema?: number;
  /** 十字线 Y 轴位置对应的真实价格 */
  cursorPrice?: number;
}

export const crosshairDataAtom = atom<CrosshairData | null>(null);
