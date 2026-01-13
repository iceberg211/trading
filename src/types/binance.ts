/**
 * Binance API 相关类型定义
 */

// K 线时间周期
export type KlineInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

// K 线数据结构（内部标准格式）
export interface Candle {
  time: number;      // Unix 时间戳（秒）
  open: string;      // 开盘价
  high: string;      // 最高价
  low: string;       // 最低价
  close: string;     // 收盘价
  volume: string;    // 成交量
}

// Binance REST API K 线响应格式
export type BinanceKlineResponse = [
  number,  // 开盘时间
  string,  // 开盘价
  string,  // 最高价
  string,  // 最低价
  string,  // 收盘价
  string,  // 成交量
  number,  // 收盘时间
  string,  // 成交额
  number,  // 成交笔数
  string,  // 主动买入成交量
  string,  // 主动买入成交额
  string   // 忽略
];

// Binance WebSocket K 线消息
export interface BinanceKlineWsMessage {
  e: string;  // 事件类型
  E: number;  // 事件时间
  s: string;  // 交易对
  k: {
    t: number;   // K线开始时间
    T: number;   // K线结束时间
    s: string;   // 交易对
    i: string;   // 时间周期
    f: number;   // 第一笔交易ID
    L: number;   // 最后一笔交易ID
    o: string;   // 开盘价
    c: string;   // 收盘价
    h: string;   // 最高价
    l: string;   // 最低价
    v: string;   // 成交量
    n: number;   // 成交笔数
    x: boolean;  // 这根K线是否完结
    q: string;   // 成交额
    V: string;   // 主动买入成交量
    Q: string;   // 主动买入成交额
    B: string;   // 忽略
  };
}

// Binance Combined Stream 消息包装
export interface BinanceCombinedStreamMessage {
  stream: string;
  data: BinanceKlineWsMessage;
}

// 订单簿数据结构
export interface OrderBook {
  lastUpdateId: number;
  bids: [string, string][];  // [价格, 数量]
  asks: [string, string][];
}

// 成交记录
export interface Trade {
  id: number;
  price: string;
  quantity: string;
  time: number;
  isBuyerMaker: boolean;
}

// 24h Ticker 数据
export interface Ticker24hr {
  symbol: string;
  priceChange: string;        // 价格变动
  priceChangePercent: string; // 价格变动百分比
  weightedAvgPrice: string;   // 加权平均价
  prevClosePrice: string;     // 前收盘价
  lastPrice: string;          // 最新价
  lastQty: string;            // 最新成交量
  bidPrice: string;           // 买一价
  bidQty: string;             // 买一量
  askPrice: string;           // 卖一价
  askQty: string;             // 卖一量
  openPrice: string;          // 开盘价
  highPrice: string;          // 最高价
  lowPrice: string;           // 最低价
  volume: string;             // 24h 成交量
  quoteVolume: string;        // 24h 成交额
  openTime: number;           // 统计开始时间
  closeTime: number;          // 统计结束时间
  firstId: number;            // 首笔成交 ID
  lastId: number;             // 末笔成交 ID
  count: number;              // 成交笔数
}
