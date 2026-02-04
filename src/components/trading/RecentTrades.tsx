import { useEffect, useState, useCallback, useRef, memo, CSSProperties } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useAtomValue } from 'jotai';
import { symbolAtom } from '@/features/chart/atoms/klineAtom';
import { marketDataHub } from '@/core/gateway';
import { runtimeConfig } from '@/core/config/runtime';
import { formatPrice, formatQuantity } from '@/utils/decimal';
import { ConnectionStatus, type ConnectionState } from '@/components/ui/ConnectionStatus';
import dayjs from 'dayjs';

interface TradeItem {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

const MAX_TRADES = 100;
const ROW_HEIGHT = 22;

// 虚拟列表行组件
const TradeRow = memo(function TradeRow({
  style,
  data,
  index,
}: {
  style: CSSProperties;
  data: { trades: TradeItem[]; pricePrecision: number; qtyPrecision: number };
  index: number;
}) {
  const { trades, pricePrecision, qtyPrecision } = data;
  const trade = trades[index];
  if (!trade) return null;

  return (
    <div
      style={style}
      className="grid grid-cols-3 gap-2 px-3 text-xs hover:bg-bg-soft/50 transition-colors items-center"
    >
      <span className={`font-mono ${trade.isBuyerMaker ? 'text-down' : 'text-up'}`}>
        {formatPrice(trade.price, pricePrecision)}
      </span>
      <span className="text-right font-mono text-text-primary">
        {formatQuantity(trade.qty, qtyPrecision)}
      </span>
      <span className="text-right font-mono text-text-tertiary">
        {dayjs(trade.time).format('HH:mm:ss')}
      </span>
    </div>
  );
});

/**
 * 最近成交记录组件
 * 使用 MarketDataHub 统一订阅层 + 首屏历史数据加载 + 虚拟列表
 */
export function RecentTrades() {
  const symbol = useAtomValue(symbolAtom);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<ConnectionState>('disconnected');
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(200);
  const initializedRef = useRef(false);

  // 加载历史成交数据
  const loadHistoricalTrades = useCallback(async (sym: string) => {
    try {
      setLoading(true);
      
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch(
        `${runtimeConfig.apiBase}/v3/trades?symbol=${sym}&limit=${MAX_TRADES}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trades: ${response.status}`);
      }

      const data: Array<{
        id: number;
        price: string;
        qty: string;
        time: number;
        isBuyerMaker: boolean;
      }> = await response.json();

      // 按时间倒序排列（最新的在前）
      const historicalTrades: TradeItem[] = data
        .map(t => ({
          id: t.id,
          price: t.price,
          qty: t.qty,
          time: t.time,
          isBuyerMaker: t.isBuyerMaker,
        }))
        .reverse();

      setTrades(historicalTrades);
      initializedRef.current = true;
      console.log(`[RecentTrades] Loaded ${historicalTrades.length} historical trades for ${sym}`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('[RecentTrades] Request timeout');
      } else {
        console.error('[RecentTrades] Failed to load historical trades:', err);
      }
      // 即使失败也结束 loading 状态
    } finally {
      setLoading(false);
    }
  }, []);

  const handleWsMessage = useCallback((data: any) => {
    if (data.e !== 'trade') return;
    
    const newTrade: TradeItem = {
      id: data.t,
      price: data.p,
      qty: data.q,
      time: data.T,
      isBuyerMaker: data.m,
    };

    setTrades((prev) => {
      // 避免重复
      if (prev.some(t => t.id === newTrade.id)) {
        return prev;
      }
      return [newTrade, ...prev.slice(0, MAX_TRADES - 1)];
    });
  }, []);

  useEffect(() => {
    // 切换交易对时重置
    setTrades([]);
    initializedRef.current = false;

    // 加载历史数据
    loadHistoricalTrades(symbol);

    // 通过 MarketDataHub 订阅实时数据
    const unsubscribe = marketDataHub.subscribe('trade', symbol);
    const unregister = marketDataHub.onMessage('trade', handleWsMessage);
    
    // 监听 WebSocket 连接状态
    const unregisterStatus = marketDataHub.onStatusChange((status) => {
      setWsStatus(status as ConnectionState);
    });

    return () => {
      unsubscribe();
      unregister();
      unregisterStatus();
    };
  }, [symbol, handleWsMessage, loadHistoricalTrades]);

  // 动态计算列表高度
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setListHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateHeight);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // 从 symbol 中提取 base/quote
  const baseAsset = symbol.replace(/USDT$|BUSD$|BTC$/, '');
  const quoteAsset = symbol.includes('USDT') ? 'USDT' : symbol.includes('BUSD') ? 'BUSD' : 'BTC';

  // 价格和数量精度
  const pricePrecision = quoteAsset === 'USDT' ? 2 : 8;
  const qtyPrecision = 4;

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-card/90 backdrop-blur">
      {/* Header */}
      <div className="px-3 py-2 border-b border-line-dark flex justify-between items-center bg-bg-soft/70">
        <span className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">Trades</span>
        <ConnectionStatus status={loading ? 'syncing' : wsStatus} variant="badge" />
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-3 py-1 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.14em] bg-bg-panel/60 border-b border-line-dark">
        <span>Price({quoteAsset})</span>
        <span className="text-right">Amount({baseAsset})</span>
        <span className="text-right">Time</span>
      </div>

      {/* Trade List - Virtual */}
      <div className="flex-1 min-h-0" ref={containerRef}>
        {loading && trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              Loading trades...
            </div>
          </div>
        ) : trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            Waiting for trades...
          </div>
        ) : (
          <List
            height={Math.max(listHeight, 1)}
            itemCount={trades.length}
            itemSize={ROW_HEIGHT}
            width="100%"
            itemData={{ trades, pricePrecision, qtyPrecision }}
            className="scrollbar-thin"
          >
            {({ index, style, data }) => (
              <TradeRow style={style} data={data} index={index} />
            )}
          </List>
        )}
      </div>
    </div>
  );
}
