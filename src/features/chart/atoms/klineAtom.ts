import { atom } from 'jotai';
import type { Candle, KlineInterval } from '@/types/binance';

/**
 * 当前交易对 (Re-export from symbol feature)
 */
export { symbolAtom } from '@/features/symbol/atoms/symbolAtom';

/**
 * 当前时间周期
 */
export const intervalAtom = atom<KlineInterval>('15m');

/**
 * K 线数据
 */
export const klineDataAtom = atom<Candle[]>([]);

/**
 * 加载状态
 */
export const klineLoadingAtom = atom<boolean>(false);

/**
 * 错误信息
 */
export const klineErrorAtom = atom<string | null>(null);

/**
 * WebSocket 连接状态
 */
export const wsStatusAtom = atom<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
