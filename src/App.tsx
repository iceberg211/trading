import { Provider } from 'jotai';

function App() {
  return (
    <Provider>
      <div className="min-h-screen bg-bg-primary text-white">
        <header className="border-b border-border-primary p-4">
          <h1 className="text-2xl font-bold">加密货币交易页面</h1>
          <p className="text-sm text-gray-400 mt-1">基于 React 18 + Jotai + Lightweight Charts</p>
        </header>
        
        <main className="container mx-auto p-4">
          <div className="bg-bg-secondary rounded-lg p-6 text-center">
            <h2 className="text-xl mb-2">项目初始化成功 ✅</h2>
            <p className="text-gray-400">
              K 线图模块正在开发中...
            </p>
          </div>
        </main>
      </div>
    </Provider>
  );
}

export default App;
