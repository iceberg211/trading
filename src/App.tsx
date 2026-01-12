import { Provider } from 'jotai';
import { ChartContainer } from './features/chart/components/ChartContainer';

function App() {
  return (
    <Provider>
      <div className="min-h-screen bg-bg-primary text-white flex flex-col">
        {/* Header */}
        <header className="border-b border-border-primary p-4">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold">加密货币交易页面</h1>
            <p className="text-sm text-gray-400 mt-1">
              基于 React 18 + Jotai + Lightweight Charts
            </p>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 container mx-auto p-4">
          <div className="h-[600px]">
            <ChartContainer />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border-primary p-4 text-center text-sm text-gray-500">
          <p>数据来源: Binance Public API | 仅供学习展示使用</p>
        </footer>
      </div>
    </Provider>
  );
}

export default App;
