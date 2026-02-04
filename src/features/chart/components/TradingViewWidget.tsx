import { useEffect, useMemo, useRef } from 'react';
import type { KlineInterval } from '@/types/binance';
import { toTradingViewInterval, toTradingViewSymbol } from '../utils/tradingview';

const TV_SCRIPT_SRC = 'https://s3.tradingview.com/tv.js';

let tvScriptLoadingPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (window.TradingView) {
    return Promise.resolve();
  }

  if (!tvScriptLoadingPromise) {
    tvScriptLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TV_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('TradingView 脚本加载失败'));
      document.head.appendChild(script);
    });
  }

  return tvScriptLoadingPromise;
}

interface TradingViewWidgetProps {
  symbol: string;
  interval: KlineInterval;
  exchangePrefix?: string;
}

export function TradingViewWidget({
  symbol,
  interval,
  exchangePrefix = 'BINANCE',
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerId = useMemo(
    () => `tv-widget-${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function mountWidget() {
      try {
        await loadTradingViewScript();
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = '';

        // eslint-disable-next-line no-new
        new window.TradingView.widget({
          autosize: true,
          container_id: containerId,
          symbol: toTradingViewSymbol(symbol, exchangePrefix),
          interval: toTradingViewInterval(interval),
          theme: 'dark',
          locale: 'zh',
          timezone: 'Asia/Shanghai',
          hide_top_toolbar: true,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          save_image: false,
          details: false,
          studies: [],
          withdateranges: false,
        });
      } catch (error) {
        console.error('[TradingViewWidget] 初始化失败:', error);
      }
    }

    mountWidget();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [containerId, exchangePrefix, interval, symbol]);

  return (
    <div className="relative h-full w-full">
      <div id={containerId} ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
