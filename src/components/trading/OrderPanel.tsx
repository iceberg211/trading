import { useState, memo } from 'react';
import { useAtomValue } from 'jotai';
import { openOrdersCountAtom } from '@/features/orders/atoms/orderAtom';
import { OpenOrders } from '@/features/orders/components/OpenOrders';
import { OrderHistory } from '@/features/orders/components/OrderHistory';
import { TradeHistory } from '@/features/orders/components/TradeHistory';

type TabType = 'open' | 'history' | 'trades';

/**
 * 订单管理面板
 * 包含当前委托、历史订单、成交记录三个 Tab
 */
export const OrderPanel = memo(function OrderPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const openOrdersCount = useAtomValue(openOrdersCountAtom);

  const tabs: { key: TabType; label: string; badge?: number }[] = [
    { key: 'open', label: '当前委托', badge: openOrdersCount > 0 ? openOrdersCount : undefined },
    { key: 'history', label: '历史订单' },
    { key: 'trades', label: '成交记录' },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-card">
      {/* Tab Header */}
      <div className="flex items-center border-b border-line px-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-text-primary'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.badge && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-[10px] text-white flex items-center justify-center font-medium">
                  {tab.badge}
                </span>
              )}
            </span>
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'open' && <OpenOrders />}
        {activeTab === 'history' && <OrderHistory />}
        {activeTab === 'trades' && <TradeHistory />}
      </div>
    </div>
  );
});
