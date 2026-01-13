import { atom } from 'jotai';
import type { Ticker24hr } from '@/types/binance';

/**
 * 24h Ticker 数据
 */
export const tickerAtom = atom<Ticker24hr | null>(null);

/**
 * Ticker 加载状态
 */
export const tickerLoadingAtom = atom<boolean>(false);

/**
 * Ticker 错误信息
 */
export const tickerErrorAtom = atom<string | null>(null);
