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
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Ticker Bar */}
      <div className="shrink-0">
        {ticker}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 p-2 lg:p-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 h-full">
          
          {/* Left: Chart */}
          <div className="lg:col-span-7 min-h-[400px] lg:min-h-0">
            {chart}
          </div>

          {/* Middle: OrderBook + Trades */}
          <div className="lg:col-span-3 flex flex-col gap-2 lg:gap-3 min-h-[500px] lg:min-h-0">
            {/* OrderBook - 占 60% */}
            <div className="flex-[6] min-h-0">
              {orderBook}
            </div>
            {/* Trades - 占 40% */}
            <div className="flex-[4] min-h-0">
              {trades}
            </div>
          </div>

          {/* Right: Trade Form */}
          <div className="lg:col-span-2 min-h-[400px] lg:min-h-0">
            {tradeForm}
          </div>

        </div>
      </div>
    </div>
  );
}
