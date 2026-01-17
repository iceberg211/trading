import { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { TickerBar } from '../trading/TickerBar';
import { RecentTrades } from '../trading/RecentTrades';
import { AssetPanel } from '../trading/AssetPanel';
import { ChartContainer } from '../../features/chart/components/ChartContainer';
import { OrderBook } from '../../features/orderbook/components/OrderBook';
import { TradeForm } from '../../features/trade/components/TradeForm';

/**
 * 安全组件包裹器：包含错误边界和加载状态
 */
const SafeSection = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <ErrorBoundary fallback={fallback}>
    <Suspense fallback={<div className="flex items-center justify-center h-full text-text-tertiary">Loading...</div>}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

/**
 * 交易页面主布局
 * 直接集成各个业务模块
 */
export function TradingLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg">
      {/* Top: Ticker Bar (Fixed) */}
      <div className="shrink-0 border-b border-line">
        <SafeSection fallback={<div className="h-14 bg-bg-card animate-pulse" />}>
          <TickerBar />
        </SafeSection>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        
        {/* Left Column: Chart (Liquid width) */}
        <div className="flex-1 min-h-[50vh] lg:min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-line">
          <SafeSection>
            <ChartContainer />
          </SafeSection>
        </div>

        {/* Middle Column: OrderBook & Trades (Fixed width) */}
        <div className="lg:w-[320px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-line min-h-[500px] lg:min-h-0">
          {/* OrderBook (Flex grow) */}
          <div className="flex-[3] min-h-0 border-b border-line">
            <SafeSection>
              <OrderBook />
            </SafeSection>
          </div>
          {/* Trades (Flex grow) */}
          <div className="flex-[2] min-h-0">
            <SafeSection>
              <RecentTrades />
            </SafeSection>
          </div>
        </div>

        {/* Right Column: Trade Form + Assets (Fixed width) */}
        <div className="lg:w-[300px] shrink-0 flex flex-col min-h-[400px] lg:min-h-0">
          {/* Trade Form */}
          <div className="flex-1 min-h-0">
            <SafeSection>
              <TradeForm />
            </SafeSection>
          </div>
          {/* Asset Panel */}
          <SafeSection>
            <AssetPanel />
          </SafeSection>
        </div>

      </div>
    </div>
  );
}
