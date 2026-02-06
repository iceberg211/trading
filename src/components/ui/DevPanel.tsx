import { useEffect, useState, memo } from 'react';
import { useAtomValue } from 'jotai';
import { symbolAtom } from '@/features/chart/atoms/klineAtom';
import {
  orderBookAtom,
  orderBookBufferSizeAtom,
  orderBookGapCountAtom,
  orderBookLastGapAtom,
  orderBookSyncStatusAtom,
} from '@/features/orderbook/atoms/orderBookAtom';
import { marketDataHub } from '@/core/gateway';

type HubStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export const DevPanel = memo(function DevPanel() {
  const isDev = import.meta.env.DEV;

  const symbol = useAtomValue(symbolAtom);
  const orderBook = useAtomValue(orderBookAtom);
  const syncStatus = useAtomValue(orderBookSyncStatusAtom);
  const gapCount = useAtomValue(orderBookGapCountAtom);
  const bufferSize = useAtomValue(orderBookBufferSizeAtom);
  const lastGap = useAtomValue(orderBookLastGapAtom);

  const [hubStatus, setHubStatus] = useState<HubStatus>('disconnected');

  useEffect(() => {
    if (!isDev) return;
    return marketDataHub.onStatusChange((status) => {
      setHubStatus(status as HubStatus);
    });
  }, [isDev]);

  if (!isDev) return null;

  return (
    <div className="shrink-0 border-b border-line-dark bg-bg-panel/70 px-3 py-1 text-[11px] font-mono text-text-tertiary">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          hub: <span className="text-text-secondary">{hubStatus}</span>
        </span>
        <span>
          symbol: <span className="text-text-secondary">{symbol}</span>
        </span>
        <span>
          ob: <span className="text-text-secondary">{syncStatus}</span>
        </span>
        <span>
          lastUpdateId: <span className="text-text-secondary">{orderBook.lastUpdateId}</span>
        </span>
        <span>
          buffer: <span className="text-text-secondary">{bufferSize}</span>
        </span>
        <span>
          gaps: <span className="text-text-secondary">{gapCount}</span>
        </span>
        {lastGap && (
          <span>
            lastGap: <span className="text-down">exp {lastGap.expected} got {lastGap.got}</span>
          </span>
        )}
      </div>
    </div>
  );
});
