import { atom } from 'jotai';

export interface SymbolConfig {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  qtyPrecision: number;
}

// 热门交易对预设配置
export const POPULAR_SYMBOLS: SymbolConfig[] = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', pricePrecision: 2, qtyPrecision: 6 },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', pricePrecision: 2, qtyPrecision: 4 },
  { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', pricePrecision: 2, qtyPrecision: 3 },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', pricePrecision: 2, qtyPrecision: 2 },
  { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', pricePrecision: 4, qtyPrecision: 1 },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', pricePrecision: 5, qtyPrecision: 0 },
  { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', pricePrecision: 4, qtyPrecision: 1 },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', pricePrecision: 2, qtyPrecision: 2 },
];

// 当前 Symbol 配置 atom
export const symbolConfigAtom = atom<SymbolConfig>(POPULAR_SYMBOLS[0]);

// 派生的 symbol 字符串 atom (兼容现有代码)
export const symbolAtom = atom(
  (get) => get(symbolConfigAtom).symbol
);
