interface TradingViewWidgetOptions {
  [key: string]: unknown;
}

interface TradingViewWidgetConstructor {
  new (options: TradingViewWidgetOptions): unknown;
}

interface TradingViewGlobal {
  widget: TradingViewWidgetConstructor;
}

interface Window {
  TradingView?: TradingViewGlobal;
}
