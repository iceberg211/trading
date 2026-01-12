import { useEffect, useState, useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { symbolAtom } from '@/features/chart/atoms/klineAtom';
import { WebSocketManager } from '@/services/websocket/manager';
import { Card, CardHeader } from '@/components/ui';
import Decimal from 'decimal.js';
import dayjs from 'dayjs';

interface TradeItem {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export function RecentTrades() {
  const symbol = useAtomValue(symbolAtom);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const wsManagerRef = useRef<WebSocketManager | null>(null);

  const handleWsMessage = useCallback((eventData: any) => {
    const data = eventData.data || eventData;
    if (data.e !== 'trade') return;
    
    const newTrade: TradeItem = {
      id: data.t,
      price: data.p,
      qty: data.q,
      time: data.T,
      isBuyerMaker: data.m,
    };

    setTrades((prev) => [newTrade, ...prev.slice(0, 29)]);
  }, []);

  useEffect(() => {
    const streamName = `${symbol.toLowerCase()}@trade`;
    const wsUrl = `wss://data-stream.binance.vision/stream?streams=${streamName}`;

    const wsManager = new WebSocketManager({
      url: wsUrl,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
    });

    wsManagerRef.current = wsManager;
    const unsubscribe = wsManager.subscribe(handleWsMessage);
    wsManager.connect();

    return () => {
      unsubscribe();
      wsManager.disconnect();
    };
  }, [symbol, handleWsMessage]);

  return (
    <Card noPadding className="flex flex-col h-full">
      <CardHeader title="最近成交" extra={<span className="text-xs text-slate-500">实时</span>} />
      
      {/* Table Header */}
      <div className="grid grid-cols-3 gap-2 px-3 py-2 text-xs font-medium text-slate-500 border-b border-white/5">
        <span>价格(USDT)</span>
        <span className="text-right">数量(BTC)</span>
        <span className="text-right">时间</span>
      </div>

      {/* Trade List */}
      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            等待成交数据...
          </div>
        ) : (
          trades.map((trade) => (
            <div
              key={trade.id}
              className="grid grid-cols-3 gap-2 px-3 py-1 text-xs hover:bg-white/5 transition-colors"
            >
              <span className={`font-mono ${trade.isBuyerMaker ? 'text-down' : 'text-up'}`}>
                {new Decimal(trade.price).toFixed(2)}
              </span>
              <span className="text-right font-mono text-slate-300">
                {new Decimal(trade.qty).toFixed(4)}
              </span>
              <span className="text-right font-mono text-slate-500">
                {dayjs(trade.time).format('HH:mm:ss')}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
