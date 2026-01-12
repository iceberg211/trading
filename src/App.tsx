import { Provider } from 'jotai';
import { TradingLayout } from './components/layout/TradingLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <Provider>
      <ErrorBoundary>
        <div className="min-h-screen bg-bg text-text-primary font-body">
          <TradingLayout />
        </div>
      </ErrorBoundary>
    </Provider>
  );
}

export default App;
