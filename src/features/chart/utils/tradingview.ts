import type { KlineInterval } from '@/types/binance';

export function toTradingViewInterval(interval: KlineInterval): string {
  switch (interval) {
    case '1m':
      return '1';
    case '5m':
      return '5';
    case '15m':
      return '15';
    case '1h':
      return '60';
    case '4h':
      return '240';
    case '1d':
      return 'D';
    default:
      return '15';
  }
}

export function toTradingViewSymbol(symbol: string, prefix: string) {
  if (!prefix) return symbol;
  const normalized = prefix.endsWith(':') ? prefix : `${prefix}:`;
  return `${normalized}${symbol}`;
}
