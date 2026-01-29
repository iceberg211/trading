/**
 * ExchangeInfo 服务
 * 负责获取、缓存和管理 Binance 交易规则
 */

import type { 
  BinanceSymbolInfo, 
  ExchangeInfoResponse, 
  SymbolConfig, 
  CachedExchangeInfo,
  SymbolFilter 
} from './types';

// 缓存配置
const CACHE_KEY = 'binance_exchange_info';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时
const CACHE_VERSION = '1.0';

// API 配置
const API_URL = 'https://api.binance.com/api/v3/exchangeInfo';

// 热门交易对列表（作为 fallback 和快速加载）
export const POPULAR_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT',
  'XLMUSDT', 'NEARUSDT', 'ALGOUSDT', 'FILUSDT', 'APTUSDT',
];

/**
 * ExchangeInfo 服务类
 * 单例模式，提供交易规则查询和缓存管理
 */
class ExchangeInfoService {
  private static instance: ExchangeInfoService;
  
  private symbols: Map<string, SymbolConfig> = new Map();
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private lastFetchTime = 0;

  private constructor() {}

  static getInstance(): ExchangeInfoService {
    if (!ExchangeInfoService.instance) {
      ExchangeInfoService.instance = new ExchangeInfoService();
    }
    return ExchangeInfoService.instance;
  }

  /**
   * 初始化服务 - 从缓存或 API 加载数据
   */
  async initialize(): Promise<void> {
    if (this.symbols.size > 0) {
      return; // 已加载
    }

    if (this.loadPromise) {
      return this.loadPromise; // 正在加载中
    }

    this.loadPromise = this.load();
    await this.loadPromise;
    this.loadPromise = null;
  }

  /**
   * 加载数据（优先缓存，过期则刷新）
   */
  private async load(): Promise<void> {
    this.isLoading = true;

    try {
      // 1. 尝试从 localStorage 加载缓存
      const cached = this.loadFromCache();
      if (cached) {
        console.log('[ExchangeInfo] Loaded from cache:', cached.length, 'symbols');
        this.populateSymbols(cached);
        
        // 检查是否需要后台刷新
        if (this.isCacheStale()) {
          console.log('[ExchangeInfo] Cache is stale, refreshing in background...');
          this.fetchAndCache().catch(console.error);
        }
        return;
      }

      // 2. 缓存无效，从 API 加载
      console.log('[ExchangeInfo] No valid cache, fetching from API...');
      await this.fetchAndCache();

    } catch (error) {
      console.error('[ExchangeInfo] Failed to load:', error);
      
      // 3. 失败时使用 fallback
      this.loadFallback();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 从 localStorage 加载缓存
   */
  private loadFromCache(): SymbolConfig[] | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;

      const cached: CachedExchangeInfo = JSON.parse(raw);
      
      // 验证版本和时间
      if (cached.metadata.version !== CACHE_VERSION) {
        console.log('[ExchangeInfo] Cache version mismatch');
        return null;
      }

      const age = Date.now() - cached.metadata.timestamp;
      if (age > CACHE_TTL_MS) {
        console.log('[ExchangeInfo] Cache expired');
        return null;
      }

      this.lastFetchTime = cached.metadata.timestamp;
      return cached.symbols;

    } catch (error) {
      console.error('[ExchangeInfo] Failed to parse cache:', error);
      return null;
    }
  }

  /**
   * 检查缓存是否过期（用于后台刷新）
   */
  private isCacheStale(): boolean {
    const age = Date.now() - this.lastFetchTime;
    return age > CACHE_TTL_MS / 2; // 超过 12 小时就后台刷新
  }

  /**
   * 从 API 获取并缓存
   */
  private async fetchAndCache(): Promise<void> {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: ExchangeInfoResponse = await response.json();
    console.log('[ExchangeInfo] Fetched from API:', data.symbols.length, 'symbols');

    // 只保留现货交易对
    const spotSymbols = data.symbols.filter(
      s => s.status === 'TRADING' && s.isSpotTradingAllowed
    );

    // 标准化数据
    const normalized = spotSymbols.map(s => this.normalizeSymbol(s));

    // 更新内存
    this.populateSymbols(normalized);

    // 保存到缓存
    this.saveToCache(normalized);

    this.lastFetchTime = Date.now();
  }

  /**
   * 标准化交易对信息
   */
  private normalizeSymbol(raw: BinanceSymbolInfo): SymbolConfig {
    const priceFilter = raw.filters.find(f => f.filterType === 'PRICE_FILTER') as SymbolFilter;
    const lotSizeFilter = raw.filters.find(f => f.filterType === 'LOT_SIZE') as SymbolFilter;
    const notionalFilter = raw.filters.find(f => f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL') as SymbolFilter;

    return {
      symbol: raw.symbol,
      baseAsset: raw.baseAsset,
      quoteAsset: raw.quoteAsset,
      pricePrecision: this.getPrecisionFromStep(priceFilter?.tickSize || '0.01'),
      quantityPrecision: this.getPrecisionFromStep(lotSizeFilter?.stepSize || '0.001'),
      tickSize: priceFilter?.tickSize || '0.01',
      stepSize: lotSizeFilter?.stepSize || '0.001',
      minNotional: notionalFilter?.minNotional || '10',
      minQty: lotSizeFilter?.minQty || '0.001',
      maxQty: lotSizeFilter?.maxQty || '9999999',
      status: raw.status,
    };
  }

  /**
   * 从步长计算精度
   */
  private getPrecisionFromStep(step: string): number {
    const decimal = step.indexOf('.');
    if (decimal === -1) return 0;
    
    // 找到第一个非零数字的位置
    const afterDecimal = step.slice(decimal + 1);
    const firstNonZero = afterDecimal.search(/[1-9]/);
    
    return firstNonZero === -1 ? afterDecimal.length : firstNonZero + 1;
  }

  /**
   * 填充内存映射
   */
  private populateSymbols(symbols: SymbolConfig[]): void {
    this.symbols.clear();
    symbols.forEach(s => this.symbols.set(s.symbol, s));
  }

  /**
   * 保存到 localStorage
   */
  private saveToCache(symbols: SymbolConfig[]): void {
    try {
      const cached: CachedExchangeInfo = {
        metadata: {
          timestamp: Date.now(),
          version: CACHE_VERSION,
        },
        symbols,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      console.log('[ExchangeInfo] Saved to cache');
    } catch (error) {
      console.error('[ExchangeInfo] Failed to save cache:', error);
    }
  }

  /**
   * 使用 fallback 数据
   */
  private loadFallback(): void {
    console.log('[ExchangeInfo] Using fallback data');
    
    const fallbackSymbols: SymbolConfig[] = POPULAR_SYMBOLS.map(symbol => ({
      symbol,
      baseAsset: symbol.replace('USDT', ''),
      quoteAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 4,
      tickSize: '0.01',
      stepSize: '0.0001',
      minNotional: '10',
      minQty: '0.0001',
      maxQty: '9999999',
      status: 'TRADING',
    }));

    this.populateSymbols(fallbackSymbols);
  }

  // ==================== 公共 API ====================

  /**
   * 获取单个交易对配置
   */
  getSymbol(symbol: string): SymbolConfig | undefined {
    return this.symbols.get(symbol);
  }

  /**
   * 获取所有交易对
   */
  getAllSymbols(): SymbolConfig[] {
    return Array.from(this.symbols.values());
  }

  /**
   * 搜索交易对
   */
  searchSymbols(query: string, limit = 20): SymbolConfig[] {
    const q = query.toUpperCase();
    const results: SymbolConfig[] = [];

    for (const symbol of this.symbols.values()) {
      if (symbol.symbol.includes(q) || 
          symbol.baseAsset.includes(q) ||
          symbol.quoteAsset.includes(q)) {
        results.push(symbol);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  /**
   * 获取指定报价资产的交易对
   */
  getSymbolsByQuote(quoteAsset: string): SymbolConfig[] {
    return Array.from(this.symbols.values())
      .filter(s => s.quoteAsset === quoteAsset);
  }

  /**
   * 获取热门交易对
   */
  getPopularSymbols(): SymbolConfig[] {
    return POPULAR_SYMBOLS
      .map(s => this.symbols.get(s))
      .filter((s): s is SymbolConfig => s !== undefined);
  }

  /**
   * 检查是否已加载
   */
  isReady(): boolean {
    return this.symbols.size > 0;
  }

  /**
   * 获取加载状态
   */
  getStatus(): { ready: boolean; count: number; loading: boolean } {
    return {
      ready: this.symbols.size > 0,
      count: this.symbols.size,
      loading: this.isLoading,
    };
  }

  /**
   * 强制刷新（用于手动刷新）
   */
  async refresh(): Promise<void> {
    await this.fetchAndCache();
  }
}

// 导出单例实例
export const exchangeInfo = ExchangeInfoService.getInstance();
