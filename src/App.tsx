import { Provider } from 'jotai';
import { ChartContainer } from './features/chart/components/ChartContainer';

function App() {
  return (
    <Provider>
      <div className="min-h-screen text-slate-100 flex flex-col">
        {/* Header */}
        <header className="border-b border-white/10 bg-bg-primary/70 backdrop-blur">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.32em] text-amber-200/90">
                  Realtime Desk
                </span>
                <div>
                  <h1 className="font-heading text-3xl sm:text-4xl">
                    加密资产行情终端
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-slate-300">
                    基于 React 18 + Jotai + Lightweight Charts 的轻量行情体验
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Binance WebSocket
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  多周期切换
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  轻量渲染
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 sm:px-6 sm:py-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.9)] animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-lg text-slate-100">
                  BTC/USDT 实时K线
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  稳定连接 + 流畅更新，适合快速观察盘面变化。
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 bg-bg-secondary/70 px-3 py-1">
                  深色 OLED 风格
                </span>
                <span className="rounded-full border border-white/10 bg-bg-secondary/70 px-3 py-1">
                  可视化优先
                </span>
              </div>
            </div>
          </section>

          <div className="h-[560px] sm:h-[620px] lg:h-[680px] animate-rise-in">
            <ChartContainer />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-bg-primary/60 backdrop-blur py-4 text-center text-sm text-slate-400">
          <p>数据来源: Binance Public API | 仅供学习展示使用</p>
        </footer>
      </div>
    </Provider>
  );
}

export default App;
