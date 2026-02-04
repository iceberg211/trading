import { memo } from 'react';
import { useOrders } from '../hooks/useOrders';
import dayjs from 'dayjs';

interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market' | 'stop_limit';
  price: string;
  amount: string;
  filled: string;
  time: number;
}

/**
 * 当前委托列表
 */
export const OpenOrders = memo(function OpenOrders() {
  const { openOrders, cancelOrder, cancelAllOrders, loading } = useOrders();

  const handleCancelAll = async () => {
    if (openOrders.length === 0) return;
    if (confirm(`确定撤销全部 ${openOrders.length} 个挂单？`)) {
      await cancelAllOrders();
    }
  };

  if (openOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-tertiary text-sm">
        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span>暂无挂单</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 批量操作 */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-line-dark bg-bg-panel">
        <span className="text-xxs text-text-tertiary">
          共 {openOrders.length} 个挂单
        </span>
        <button
          onClick={handleCancelAll}
          disabled={loading}
          className="text-xxs text-down hover:text-down/80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        >
          全部撤销
        </button>
      </div>

      {/* 表头 */}
      <div className="grid grid-cols-7 gap-2 px-3 h-7 items-center text-xxs text-text-tertiary border-b border-line-dark">
        <span>时间</span>
        <span>交易对</span>
        <span>方向</span>
        <span>类型</span>
        <span className="text-right">价格</span>
        <span className="text-right">数量/已成交</span>
        <span className="text-right">操作</span>
      </div>

      {/* 订单列表 */}
      <div className="flex-1 overflow-auto">
        {openOrders.map((order) => (
          <OrderRow key={order.id} order={order} onCancel={cancelOrder} loading={loading} />
        ))}
      </div>
    </div>
  );
});

const OrderRow = memo(function OrderRow({
  order,
  onCancel,
  loading,
}: {
  order: Order;
  onCancel: (id: string) => Promise<boolean>;
  loading: boolean;
}) {
  const isBuy = order.side === 'buy';
  const typeLabel = order.type === 'limit' ? '限价' : order.type === 'market' ? '市价' : '止损限价';

  return (
    <div className="grid grid-cols-7 gap-2 px-3 h-8 text-xs hover:bg-bg-soft/60 transition-colors items-center border-b border-line-dark/60 tabular-nums">
      <span className="text-text-tertiary font-mono">
        {dayjs(order.time).format('HH:mm:ss')}
      </span>
      <span className="font-medium text-text-primary">{order.symbol}</span>
      <span className={isBuy ? 'text-up' : 'text-down'}>
        {isBuy ? '买入' : '卖出'}
      </span>
      <span className="text-text-secondary">{typeLabel}</span>
      <span className="text-right font-mono text-text-primary">{order.price}</span>
      <span className="text-right font-mono">
        <span className="text-text-primary">{order.filled}</span>
        <span className="text-text-tertiary"> / {order.amount}</span>
      </span>
      <div className="text-right">
        <button
          onClick={() => onCancel(order.id)}
          disabled={loading}
          className="text-down hover:text-down/80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        >
          撤销
        </button>
      </div>
    </div>
  );
});
