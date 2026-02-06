export type HubWsStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type EngineSyncStatus =
  | 'uninitialized'
  | 'buffering'
  | 'syncing'
  | 'synchronized'
  | 'gap_detected';

export type OrderBookItem = [string, string]; // [price, quantity]

export type OrderBookSnapshot = {
  symbol: string;
  lastUpdateId: number;
  bids: OrderBookItem[];
  asks: OrderBookItem[];
};

// Binance depthUpdate event fields:
// - U: First update ID in event
// - u: Final update ID in event
// - b: Bids to be updated
// - a: Asks to be updated
export type DepthDelta = {
  symbol: string;
  U: number;
  u: number;
  b: OrderBookItem[];
  a: OrderBookItem[];
  eventTime?: number;
};

export type MainToWorkerMessage =
  | { type: 'RESET' }
  | { type: 'SET_SYMBOL'; payload: { symbol: string } }
  | { type: 'INIT_SNAPSHOT'; payload: OrderBookSnapshot }
  | { type: 'DEPTH_DELTA'; payload: DepthDelta }
  | { type: 'WS_STATUS'; payload: { status: HubWsStatus } };

export type WorkerToMainMessage =
  | {
      type: 'ORDERBOOK_UPDATE';
      payload: {
        symbol: string;
        lastUpdateId: number;
        bids: OrderBookItem[];
        asks: OrderBookItem[];
        syncStatus: EngineSyncStatus;
        bufferSize: number;
      };
    }
  | {
      type: 'GAP_DETECTED';
      payload: {
        symbol: string;
        expected: number;
        got: number;
        lastUpdateId: number;
      };
    }
  | {
      type: 'STATUS';
      payload: {
        symbol: string;
        syncStatus: EngineSyncStatus;
        bufferSize: number;
        lastUpdateId: number;
      };
    };

