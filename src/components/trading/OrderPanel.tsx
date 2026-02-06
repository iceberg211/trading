import { useState, memo } from 'react';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OpenOrders } from '@/features/orders/components/OpenOrders';
import { OrderHistory } from '@/features/orders/components/OrderHistory';
import { TradeHistory } from '@/features/orders/components/TradeHistory';
import { PanelTabs, PanelTab } from '@/components/ui';

type TabType = 'open' | 'history' | 'trades';

/**
 * 订单管理面板
 * 包含当前委托、历史订单、成交记录三个 Tab
 */
export const OrderPanel = memo(function OrderPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('open');
  // 使用 useOrders 获取真实订单数据
  const { openOrders } = useOrders();
  const openOrdersCount = openOrders.length;

  const tabs: PanelTab[] = [
    { key: 'open', label: '当前委托', badge: openOrdersCount > 0 ? openOrdersCount : undefined },
    { key: 'history', label: '历史订单' },
    { key: 'trades', label: '成交记录' },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-card">
      <PanelTabs tabs={tabs} activeKey={activeTab} onChange={(k) => setActiveTab(k as TabType)} aria-label="订单面板" />

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'open' && <OpenOrders />}
        {activeTab === 'history' && <OrderHistory />}
        {activeTab === 'trades' && <TradeHistory />}
      </div>
    </div>
  );
});
