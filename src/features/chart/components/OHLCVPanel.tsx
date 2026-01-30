import { useAtomValue } from 'jotai';
import { crosshairDataAtom } from '../atoms/crosshairAtom';
import { symbolConfigAtom } from '@/features/symbol/atoms/symbolAtom';
import { formatPrice as formatPriceUtil, formatQuantity } from '@/utils/decimal';

/**
 * OHLCV 悬浮信息面板
 * 显示十字线位置的 K 线详情
 */
export function OHLCVPanel() {
  const data = useAtomValue(crosshairDataAtom);
  const symbolConfig = useAtomValue(symbolConfigAtom);
  const pricePrecision = symbolConfig?.pricePrecision;
  const qtyPrecision = symbolConfig?.quantityPrecision ?? 4;

  // 格式化数字
  const formatPrice = (value: number) => {
    if (pricePrecision !== undefined) {
      return formatPriceUtil(value, pricePrecision);
    }
    if (value >= 1000) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (value >= 1) return value.toFixed(4);
    return value.toFixed(8);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatVolume = (value: number) => {
    if (symbolConfig) {
      return formatQuantity(value, Math.min(qtyPrecision, 6));
    }
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  if (!data) {
    return null;
  }

  const isUp = data.close >= data.open;
  const colorClass = isUp ? 'text-up' : 'text-down';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {/* 时间 */}
      <div className="flex items-center gap-1">
        <span className="text-text-tertiary">时间</span>
        <span className="text-text-secondary font-mono">{formatTime(data.time)}</span>
      </div>

      {/* 开盘价 */}
      <div className="flex items-center gap-1">
        <span className="text-text-tertiary">开</span>
        <span className={`font-mono ${colorClass}`}>{formatPrice(data.open)}</span>
      </div>

      {/* 最高价 */}
      <div className="flex items-center gap-1">
        <span className="text-text-tertiary">高</span>
        <span className="font-mono text-up">{formatPrice(data.high)}</span>
      </div>

      {/* 最低价 */}
      <div className="flex items-center gap-1">
        <span className="text-text-tertiary">低</span>
        <span className="font-mono text-down">{formatPrice(data.low)}</span>
      </div>

      {/* 收盘价 */}
      <div className="flex items-center gap-1">
        <span className="text-text-tertiary">收</span>
        <span className={`font-mono font-medium ${colorClass}`}>{formatPrice(data.close)}</span>
      </div>

      {/* 涨跌幅 */}
      {data.changePercent !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-text-tertiary">涨跌</span>
          <span className={`font-mono font-medium ${data.changePercent >= 0 ? 'text-up' : 'text-down'}`}>
            {formatPercent(data.changePercent)}
          </span>
        </div>
      )}

      {/* 成交量 */}
      {data.volume !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-text-tertiary">量</span>
          <span className="font-mono text-text-secondary">
            {formatVolume(data.volume)}
          </span>
        </div>
      )}
    </div>
  );
}
