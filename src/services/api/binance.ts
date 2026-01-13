import { apiClient } from './client';
import type {
  BinanceKlineResponse,
  Candle,
  KlineInterval,
  OrderBook,
  Trade,
  Ticker24hr,
} from '@/types/binance';

/**
 * Binance API 客户端
 */
class BinanceApi {
  /**
   * 获取 K 线历史数据
   * @param symbol 交易对，如 'BTCUSDT'
   * @param interval 时间周期
   * @param limit 数据条数，默认 500
   */
  async getKlines(
    symbol: string,
    interval: KlineInterval,
    limit: number = 500
  ): Promise<Candle[]> {
    try {
      const response = await apiClient.get<BinanceKlineResponse[]>('/v3/klines', {
        symbol: symbol.toUpperCase(),
        interval,
        limit,
      });

      return this.normalizeKlines(response.data);
    } catch (error) {
      console.error('获取 K 线数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取订单簿快照
   * @param symbol 交易对
   * @param limit 深度，默认 100
   */
  async getOrderBook(symbol: string, limit: number = 100): Promise<OrderBook> {
    try {
      const response = await apiClient.get<OrderBook>('/v3/depth', {
        symbol: symbol.toUpperCase(),
        limit,
      });

      return response.data;
    } catch (error) {
      console.error('获取订单簿失败:', error);
      throw error;
    }
  }

  /**
   * 获取最近成交
   * @param symbol 交易对
   * @param limit 数量，默认 100
   */
  async getRecentTrades(symbol: string, limit: number = 100): Promise<Trade[]> {
    try {
      const response = await apiClient.get<any[]>('/v3/trades', {
        symbol: symbol.toUpperCase(),
        limit,
      });

      return response.data.map((trade: any) => ({
        id: trade.id,
        price: trade.price,
        quantity: trade.qty,
        time: trade.time,
        isBuyerMaker: trade.isBuyerMaker,
      }));
    } catch (error) {
      console.error('获取成交记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取 24h Ticker 数据
   * @param symbol 交易对
   */
  async getTicker24hr(symbol: string): Promise<Ticker24hr> {
    try {
      const response = await apiClient.get<Ticker24hr>('/v3/ticker/24hr', {
        symbol: symbol.toUpperCase(),
      });
      return response.data;
    } catch (error) {
      console.error('获取 24h Ticker 失败:', error);
      throw error;
    }
  }

  /**
   * 标准化 Binance K 线数据格式
   */
  private normalizeKlines(rawData: BinanceKlineResponse[]): Candle[] {
    return rawData.map((item) => ({
      time: Math.floor(item[0] / 1000), // 转换为秒
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: item[5],
    }));
  }
}

export const binanceApi = new BinanceApi();
