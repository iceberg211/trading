import { atom } from 'jotai';

/**
 * 图表视图模式
 */
export const chartViewAtom = atom<'basic' | 'tradingview'>('basic');
