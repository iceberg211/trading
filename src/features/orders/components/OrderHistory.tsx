import { memo } from 'react';
import { useOrders } from '../hooks/useOrders';
import dayjs from 'dayjs';

// 订单类型与原 Order 接口保持一致
interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market' | 'stop_limit';
  price: string;
  amount: string;
  filled: string;
  avgPrice?: string;
  time: number;
  status: 'pending' | 'partial' | 'filled' | 'canceled';
}

/**
 * 历史订单列表
 */
export const OrderHistory = memo(function OrderHistory() {
  // 使用 useOrders 获取真实历史订单
  const { orderHistory } = useOrders();

  if (orderHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-tertiary text-sm">
        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>暂无历史订单</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 表头 */}
      <div className="grid grid-cols-7 gap-2 px-3 h-7 items-center text-xxs text-text-tertiary border-b border-line-dark">
        <span>时间</span>
        <span>交易对</span>
        <span>方向</span>
        <span>类型</span>
        <span className="text-right">价格</span>
        <span className="text-right">成交/数量</span>
        <span className="text-right">状态</span>
      </div>

      {/* 订单列表 */}
      <div className="flex-1 overflow-auto">
        {orderHistory.map((order) => (
          <HistoryRow key={order.id} order={order as Order} />
        ))}
      </div>
    </div>
  );
});

const HistoryRow = memo(function HistoryRow({ order }: { order: Order }) {
  const isBuy = order.side === 'buy';
  const typeLabel = order.type === 'limit' ? '限价' : order.type === 'market' ? '市价' : '止损限价';
  
  const statusConfig = {
    filled: { label: '已成交', color: 'text-up' },
    canceled: { label: '已撤销', color: 'text-text-tertiary' },
    partial: { label: '部分成交', color: 'text-accent' },
    pending: { label: '挂单中', color: 'text-text-secondary' },
  };

  const status = statusConfig[order.status];

  return (
    <div className="grid grid-cols-7 gap-2 px-3 h-8 text-xs hover:bg-bg-soft/60 transition-colors items-center border-b border-line-dark/60 tabular-nums">
      <span className="text-text-tertiary font-mono">
        {dayjs(order.time).format('MM-DD HH:mm')}
      </span>
      <span className="font-medium text-text-primary">{order.symbol}</span>
      <span className={isBuy ? 'text-up' : 'text-down'}>
        {isBuy ? '买入' : '卖出'}
      </span>
      <span className="text-text-secondary">{typeLabel}</span>
      <span className="text-right font-mono text-text-primary">
        {order.avgPrice || order.price}
      </span>
      <span className="text-right font-mono">
        <span className="text-text-primary">{order.filled}</span>
        <span className="text-text-tertiary"> / {order.amount}</span>
      </span>
      <span className={`text-right ${status.color}`}>
        {status.label}
      </span>
    </div>
  );
});
