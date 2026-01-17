import { useEffect, useState, useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { symbolAtom } from '@/features/chart/atoms/klineAtom';
import { WebSocketManager } from '@/services/websocket/manager';
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

    setTrades((prev) => [newTrade, ...prev.slice(0, 19)]);
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
    <div className="flex flex-col h-full bg-bg-card/90 backdrop-blur">
      {/* Header */}
      <div className="px-3 py-2 border-b border-line-dark flex justify-between items-center bg-bg-soft/70">
        <span className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">Trades</span>
        <div className="w-1.5 h-1.5 rounded-full bg-up animate-pulse" />
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 px-3 py-1 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.14em] bg-bg-panel/60 border-b border-line-dark">
        <span>Price(USDT)</span>
        <span className="text-right">Amount(BTC)</span>
        <span className="text-right">Time</span>
      </div>


      {/* Trade List */}
      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            Waiting for trades...
          </div>
        ) : (
          trades.map((trade) => (
            <div
              key={trade.id}
              className="grid grid-cols-3 gap-2 px-3 py-[2px] text-xs hover:bg-bg-soft/50 transition-colors"
            >

              <span className={`font-mono ${trade.isBuyerMaker ? 'text-down' : 'text-up'}`}>
                {new Decimal(trade.price).toFixed(2)}
              </span>
              <span className="text-right font-mono text-text-primary">
                {new Decimal(trade.qty).toFixed(4)}
              </span>
              <span className="text-right font-mono text-text-tertiary">
                {dayjs(trade.time).format('HH:mm:ss')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
