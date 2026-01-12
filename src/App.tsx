import { Provider } from 'jotai';
import { TradingLayout } from './components/layout/TradingLayout';
import { TickerBar } from './components/trading/TickerBar';
import { RecentTrades } from './components/trading/RecentTrades';
import { ChartContainer } from './features/chart/components/ChartContainer';
import { OrderBook } from './features/orderbook/components/OrderBook';
import { TradeForm } from './features/trade/components/TradeForm';

function App() {
  return (
    <Provider>
      <div className="min-h-screen bg-bg-primary text-slate-100 font-body">
        <TradingLayout
          ticker={<TickerBar />}
          chart={<ChartContainer />}
          orderBook={<OrderBook />}
          trades={<RecentTrades />}
          tradeForm={<TradeForm />}
        />
      </div>
    </Provider>
  );
}

export default App;
