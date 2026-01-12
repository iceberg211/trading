import { ReactNode } from 'react';

interface TradingLayoutProps {
  ticker: ReactNode;
  chart: ReactNode;
  orderBook: ReactNode;
  trades: ReactNode;
  tradeForm: ReactNode;
}

/**
 * 交易页面布局
 * 
 * 桌面端布局 (lg+):
 * ┌──────────────────────────────────────────────────────┐
 * │                    Ticker Bar                        │
 * ├──────────────────────┬───────────────┬───────────────┤
 * │                      │               │               │
 * │      K线图 (7)       │  订单簿 (3)   │  交易表单 (2) │
 * │                      │               │               │
 * │                      ├───────────────┤               │
 * │                      │  最近成交 (3) │               │
 * │                      │               │               │
 * └──────────────────────┴───────────────┴───────────────┘
 * 
 * 移动端布局 (< lg):
 * 垂直堆叠
 */
export function TradingLayout({
  ticker,
  chart,
  orderBook,
  trades,
  tradeForm,
}: TradingLayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg">
      {/* Top: Ticker Bar (Fixed) */}
      <div className="shrink-0 border-b border-line">
        {ticker}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        
        {/* Left Column: Chart (Liquid width) */}
        <div className="flex-1 min-h-[50vh] lg:min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-line">
          {chart}
        </div>

        {/* Middle Column: OrderBook & Trades (Fixed width) */}
        <div className="lg:w-[320px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-line min-h-[500px] lg:min-h-0">
          {/* OrderBook (Flex grow) */}
          <div className="flex-[3] min-h-0 border-b border-line">
            {orderBook}
          </div>
          {/* Trades (Flex grow) */}
          <div className="flex-[2] min-h-0">
            {trades}
          </div>
        </div>

        {/* Right Column: Trade Form (Fixed width) */}
        <div className="lg:w-[300px] shrink-0 min-h-[400px] lg:min-h-0">
          {tradeForm}
        </div>

      </div>
    </div>
  );
}
