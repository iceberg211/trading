import { atom } from 'jotai';
import { exchangeInfo } from '@/core/config';
import type { SymbolConfig } from '@/core/config';

// 重新导出类型供其他模块使用
export type { SymbolConfig };

// 热门交易对预设配置（作为 fallback）
export const POPULAR_SYMBOLS: SymbolConfig[] = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 6, tickSize: '0.01', stepSize: '0.00001', minNotional: '10', minQty: '0.00001', maxQty: '9000', status: 'TRADING' },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 4, tickSize: '0.01', stepSize: '0.0001', minNotional: '10', minQty: '0.0001', maxQty: '9000', status: 'TRADING' },
  { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 3, tickSize: '0.01', stepSize: '0.001', minNotional: '10', minQty: '0.001', maxQty: '9000', status: 'TRADING' },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 2, tickSize: '0.01', stepSize: '0.01', minNotional: '10', minQty: '0.01', maxQty: '9000', status: 'TRADING' },
  { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', pricePrecision: 4, quantityPrecision: 1, tickSize: '0.0001', stepSize: '0.1', minNotional: '10', minQty: '0.1', maxQty: '9000000', status: 'TRADING' },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', pricePrecision: 5, quantityPrecision: 0, tickSize: '0.00001', stepSize: '1', minNotional: '10', minQty: '1', maxQty: '9000000', status: 'TRADING' },
  { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', pricePrecision: 4, quantityPrecision: 1, tickSize: '0.0001', stepSize: '0.1', minNotional: '10', minQty: '0.1', maxQty: '9000000', status: 'TRADING' },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 2, tickSize: '0.01', stepSize: '0.01', minNotional: '10', minQty: '0.01', maxQty: '9000', status: 'TRADING' },
];

// 当前 Symbol 配置 atom
export const symbolConfigAtom = atom<SymbolConfig>(POPULAR_SYMBOLS[0]);

// 派生的 symbol 字符串 atom (兼容现有代码)
export const symbolAtom = atom(
  (get) => get(symbolConfigAtom).symbol
);

// 可写 atom：用于切换交易对
export const setSymbolAtom = atom(
  null,
  (get, set, symbolString: string) => {
    // 优先从 ExchangeInfo 获取完整配置
    const config = exchangeInfo.getSymbol(symbolString);
    
    if (config) {
      set(symbolConfigAtom, config);
    } else {
      // Fallback: 从预设列表查找
      const preset = POPULAR_SYMBOLS.find(s => s.symbol === symbolString);
      if (preset) {
        set(symbolConfigAtom, preset);
      } else {
        // 最后：创建基础配置
        set(symbolConfigAtom, {
          symbol: symbolString,
          baseAsset: symbolString.replace(/USDT$|BUSD$|BTC$/, ''),
          quoteAsset: symbolString.endsWith('USDT') ? 'USDT' : 
                      symbolString.endsWith('BUSD') ? 'BUSD' : 'BTC',
          pricePrecision: 2,
          quantityPrecision: 4,
          tickSize: '0.01',
          stepSize: '0.0001',
          minNotional: '10',
          minQty: '0.0001',
          maxQty: '9999999',
          status: 'TRADING',
        });
      }
    }
  }
);
