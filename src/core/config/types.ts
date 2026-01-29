/**
 * ExchangeInfo 类型定义
 * 来自 Binance /api/v3/exchangeInfo API
 */

/**
 * 交易规则过滤器
 */
export interface SymbolFilter {
  filterType: string;
  minPrice?: string;
  maxPrice?: string;
  tickSize?: string;
  minQty?: string;
  maxQty?: string;
  stepSize?: string;
  minNotional?: string;
  applyToMarket?: boolean;
  avgPriceMins?: number;
}

/**
 * 交易对完整信息（来自 API）
 */
export interface BinanceSymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  baseAssetPrecision: number;
  quoteAsset: string;
  quotePrecision: number;
  quoteAssetPrecision: number;
  orderTypes: string[];
  icebergAllowed: boolean;
  ocoAllowed: boolean;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  filters: SymbolFilter[];
  permissions: string[];
}

/**
 * 交易所信息 API 响应
 */
export interface ExchangeInfoResponse {
  timezone: string;
  serverTime: number;
  rateLimits: any[];
  symbols: BinanceSymbolInfo[];
}

/**
 * 标准化的交易对配置（用于应用内部）
 */
export interface SymbolConfig {
  symbol: string;           // BTCUSDT
  baseAsset: string;        // BTC
  quoteAsset: string;       // USDT
  pricePrecision: number;   // 价格小数位
  quantityPrecision: number;// 数量小数位
  tickSize: string;         // 最小价格变动
  stepSize: string;         // 最小数量变动
  minNotional: string;      // 最小交易金额
  minQty: string;           // 最小交易数量
  maxQty: string;           // 最大交易数量
  status: string;           // TRADING, BREAK 等
}

/**
 * 缓存元数据
 */
export interface CacheMetadata {
  timestamp: number;
  version: string;
}

/**
 * 缓存数据结构
 */
export interface CachedExchangeInfo {
  metadata: CacheMetadata;
  symbols: SymbolConfig[];
}
