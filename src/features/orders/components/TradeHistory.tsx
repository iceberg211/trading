import { memo } from 'react';
import { useAtomValue } from 'jotai';
import { tradeHistoryAtom, Trade } from '../atoms/orderAtom';
import dayjs from 'dayjs';

/**
 * 成交记录列表
 */
export const TradeHistory = memo(function TradeHistory() {
  const tradeHistory = useAtomValue(tradeHistoryAtom);

  if (tradeHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-tertiary text-sm">
        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <span>暂无成交记录</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 表头 */}
      <div className="grid grid-cols-7 gap-2 px-4 py-2 text-[10px] text-text-tertiary uppercase tracking-wide border-b border-line">
        <span>时间</span>
        <span>交易对</span>
        <span>方向</span>
        <span className="text-right">价格</span>
        <span className="text-right">数量</span>
        <span className="text-right">金额</span>
        <span className="text-right">手续费</span>
      </div>

      {/* 成交列表 */}
      <div className="flex-1 overflow-auto">
        {tradeHistory.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}
      </div>
    </div>
  );
});

const TradeRow = memo(function TradeRow({ trade }: { trade: Trade }) {
  const isBuy = trade.side === 'buy';

  return (
    <div className="grid grid-cols-7 gap-2 px-4 py-2 text-xs hover:bg-bg-hover transition-colors items-center border-b border-line/50">
      <span className="text-text-tertiary font-mono">
        {dayjs(trade.time).format('MM-DD HH:mm:ss')}
      </span>
      <span className="font-medium text-text-primary">{trade.symbol}</span>
      <span className={isBuy ? 'text-up' : 'text-down'}>
        {isBuy ? '买入' : '卖出'}
      </span>
      <span className="text-right font-mono text-text-primary">{trade.price}</span>
      <span className="text-right font-mono text-text-primary">{trade.amount}</span>
      <span className="text-right font-mono text-text-secondary">{trade.total}</span>
      <span className="text-right font-mono text-text-tertiary">
        {trade.fee} {trade.feeAsset}
      </span>
    </div>
  );
});
