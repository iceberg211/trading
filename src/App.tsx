import { Provider } from 'jotai';
import { ChartContainer } from './features/chart/components/ChartContainer';
import { OrderBook } from './features/orderbook/components/OrderBook';

function App() {
  return (
    <Provider>
      <div className="min-h-screen text-slate-100 flex flex-col font-body selection:bg-accent/20 selection:text-accent">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-bg-primary/80 backdrop-blur-md supports-[backdrop-filter]:bg-bg-primary/60">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="font-heading text-2xl font-bold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
                    Terminal Pro
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent shadow-[0_0_10px_-4px_rgba(245,158,11,0.5)]">
                    Live
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-up shadow-[0_0_8px_rgba(20,184,166,0.6)] animate-pulse"></div>
                  Binance Vision Stream
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                  Latency: &lt; 50ms
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[600px]">
            {/* Left Column: Chart (8/12) */}
            <div className="lg:col-span-8 flex flex-col gap-4 animate-fade-in">
              {/* Info Bar */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-heading text-2xl font-bold text-slate-100">BTC/USDT</h2>
                  <span className="text-sm font-medium text-up">+2.45%</span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-bg-secondary border border-white/10 text-slate-400">Vol: 1.2B</span>
                  <span className="px-2 py-1 rounded bg-bg-secondary border border-white/10 text-slate-400">High: 48,200</span>
                </div>
              </div>

              {/* Chart */}
              <div className="flex-1 min-h-0 animate-rise-in" style={{ animationDelay: '0.1s' }}>
                <ChartContainer />
              </div>
            </div>

            {/* Right Column: OrderBook (4/12) */}
            <div className="lg:col-span-4 flex flex-col gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between px-1 h-[36px]">
                <div className="text-sm font-medium text-slate-400">Market Depth</div>
              </div>
              
              <div className="flex-1 min-h-0 animate-rise-in" style={{ animationDelay: '0.3s' }}>
                <OrderBook />
              </div>
            </div>
          </div>
        </main>
      </div>
    </Provider>
  );
}

export default App;
