import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-bg-card rounded-lg">
          <div className="text-down text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">出错了</h3>
          <p className="text-sm text-text-secondary mb-4 text-center max-w-sm">
            {this.state.error?.message || '组件加载失败'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-bg-input text-text-primary text-sm rounded hover:bg-bg-hover transition-colors"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
