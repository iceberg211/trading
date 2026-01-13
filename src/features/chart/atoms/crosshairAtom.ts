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
}

export const crosshairDataAtom = atom<CrosshairData | null>(null);
