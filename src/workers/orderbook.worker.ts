/**
 * OrderBook Engine Worker
 *
 * - No networking in worker. Main thread feeds: snapshot + depth deltas.
 * - Implements Binance diff-depth sync protocol (snapshot + buffered deltas + strict continuity).
 * - Emits throttled, sorted view model (bids desc, asks asc).
 */

import type {
  DepthDelta,
  EngineSyncStatus,
  MainToWorkerMessage,
  OrderBookItem,
  OrderBookSnapshot,
  WorkerToMainMessage,
} from './orderbookEngine.types';

type SideMap = Map<string, string>; // price -> quantity

const CONFIG = {
  EMIT_THROTTLE_MS: 80,
  OUTPUT_LIMIT: 500,
  // Keep buffer bounded to avoid unbounded growth on flaky networks.
  MAX_BUFFER_SIZE: 5000,
};

type WorkerState = {
  symbol: string | null;
  syncStatus: EngineSyncStatus;
  lastUpdateId: number;
  bids: SideMap;
  asks: SideMap;
  buffer: DepthDelta[];
  dirty: boolean;
  lastEmitTime: number;
};

const state: WorkerState = {
  symbol: null,
  syncStatus: 'uninitialized',
  lastUpdateId: 0,
  bids: new Map(),
  asks: new Map(),
  buffer: [],
  dirty: false,
  lastEmitTime: 0,
};

function post(msg: WorkerToMainMessage) {
  postMessage(msg);
}

function emitStatus() {
  if (!state.symbol) return;
  post({
    type: 'STATUS',
    payload: {
      symbol: state.symbol,
      syncStatus: state.syncStatus,
      bufferSize: state.buffer.length,
      lastUpdateId: state.lastUpdateId,
    },
  });
}

function setSyncStatus(next: EngineSyncStatus) {
  if (state.syncStatus === next) return;
  state.syncStatus = next;
  emitStatus();
}

function normalizeSymbol(sym: string) {
  return sym.toUpperCase();
}

function comparePrices(a: string, b: string): number {
  const [aInt, aDec = ''] = a.split('.');
  const [bInt, bDec = ''] = b.split('.');

  const aIntNum = parseInt(aInt, 10);
  const bIntNum = parseInt(bInt, 10);
  if (aIntNum !== bIntNum) return aIntNum - bIntNum;

  const maxDecLen = Math.max(aDec.length, bDec.length);
  const aDecPadded = aDec.padEnd(maxDecLen, '0');
  const bDecPadded = bDec.padEnd(maxDecLen, '0');

  return (parseInt(aDecPadded, 10) || 0) - (parseInt(bDecPadded, 10) || 0);
}

function mergeUpdates(map: SideMap, updates: OrderBookItem[]) {
  for (const [price, qty] of updates) {
    // qty = 0 means remove level
    if (qty === '0' || qty === '0.00000000' || parseFloat(qty) === 0) {
      map.delete(price);
    } else {
      map.set(price, qty);
    }
  }
}

function getSortedSnapshot(limit: number) {
  const bids = Array.from(state.bids.entries())
    .sort((a, b) => -comparePrices(a[0], b[0]))
    .slice(0, limit);
  const asks = Array.from(state.asks.entries())
    .sort((a, b) => comparePrices(a[0], b[0]))
    .slice(0, limit);
  return { bids, asks };
}

function emitUpdate(force = false) {
  if (!state.symbol) return;

  const now = Date.now();
  if (!force && now - state.lastEmitTime < CONFIG.EMIT_THROTTLE_MS) return;

  const { bids, asks } = getSortedSnapshot(CONFIG.OUTPUT_LIMIT);

  post({
    type: 'ORDERBOOK_UPDATE',
    payload: {
      symbol: state.symbol,
      lastUpdateId: state.lastUpdateId,
      bids,
      asks,
      syncStatus: state.syncStatus,
      bufferSize: state.buffer.length,
    },
  });

  state.dirty = false;
  state.lastEmitTime = now;
}

function resetState(keepSymbol: boolean) {
  state.lastUpdateId = 0;
  state.bids.clear();
  state.asks.clear();
  state.buffer = [];
  state.dirty = false;
  state.lastEmitTime = 0;
  if (!keepSymbol) {
    state.symbol = null;
    state.syncStatus = 'uninitialized';
  } else {
    state.syncStatus = 'buffering';
  }
  emitStatus();
}

function gapDetected(expected: number, got: number) {
  if (!state.symbol) return;

  post({
    type: 'GAP_DETECTED',
    payload: {
      symbol: state.symbol,
      expected,
      got,
      lastUpdateId: state.lastUpdateId,
    },
  });

  // Keep displaying the last known book, but stop applying deltas until re-synced.
  // Continue buffering new deltas for the next snapshot.
  setSyncStatus('gap_detected');
}

function bufferDelta(delta: DepthDelta) {
  state.buffer.push(delta);
  if (state.buffer.length > CONFIG.MAX_BUFFER_SIZE) {
    state.buffer.splice(0, state.buffer.length - CONFIG.MAX_BUFFER_SIZE);
  }
}

function tryAlignFromBuffer() {
  if (!state.symbol) return;
  if (state.lastUpdateId <= 0) return;

  // Drop outdated buffered events
  state.buffer = state.buffer.filter((evt) => evt.u > state.lastUpdateId);

  const expectedStart = state.lastUpdateId + 1;
  const firstIdx = state.buffer.findIndex(
    (evt) => evt.U <= expectedStart && evt.u >= expectedStart
  );

  if (firstIdx === -1) {
    // Still waiting for the first matching event.
    return;
  }

  const toProcess = state.buffer.slice(firstIdx);
  state.buffer = [];

  // Apply the first matching event + subsequent strictly continuous events.
  let currentLast = state.lastUpdateId;
  for (let i = 0; i < toProcess.length; i++) {
    const evt = toProcess[i];
    if (evt.u <= currentLast) continue;

    if (evt.U > currentLast + 1) {
      // Gap encountered while syncing; keep remaining events buffered for next snapshot.
      gapDetected(currentLast + 1, evt.U);
      state.buffer = toProcess.slice(i);
      return;
    }

    mergeUpdates(state.bids, evt.b);
    mergeUpdates(state.asks, evt.a);
    currentLast = evt.u;
  }

  state.lastUpdateId = currentLast;
  setSyncStatus('synchronized');
  state.dirty = true;
  emitUpdate(true);
}

function applyDeltaStrict(delta: DepthDelta) {
  if (delta.u <= state.lastUpdateId) return; // old event

  const expected = state.lastUpdateId + 1;
  if (delta.U !== expected) {
    gapDetected(expected, delta.U);
    bufferDelta(delta);
    return;
  }

  mergeUpdates(state.bids, delta.b);
  mergeUpdates(state.asks, delta.a);
  state.lastUpdateId = delta.u;
  state.dirty = true;
}

function handleSnapshot(snapshot: OrderBookSnapshot) {
  if (!state.symbol) return;
  if (normalizeSymbol(snapshot.symbol) !== state.symbol) return;

  // Replace orderbook with snapshot (fast first paint).
  state.bids.clear();
  state.asks.clear();
  for (const [p, q] of snapshot.bids) state.bids.set(p, q);
  for (const [p, q] of snapshot.asks) state.asks.set(p, q);
  state.lastUpdateId = snapshot.lastUpdateId;

  setSyncStatus('syncing');
  state.dirty = true;
  emitUpdate(true);

  // Attempt to align buffered deltas.
  tryAlignFromBuffer();
}

function handleDelta(delta: DepthDelta) {
  if (!state.symbol) return;
  if (normalizeSymbol(delta.symbol) !== state.symbol) return;

  // If we are in gap_detected, we buffer until a fresh snapshot arrives.
  if (state.syncStatus === 'gap_detected' || state.syncStatus === 'buffering') {
    bufferDelta(delta);
    return;
  }

  if (state.syncStatus === 'uninitialized') {
    setSyncStatus('buffering');
    bufferDelta(delta);
    return;
  }

  if (state.syncStatus === 'syncing') {
    bufferDelta(delta);
    tryAlignFromBuffer();
    return;
  }

  if (state.syncStatus === 'synchronized') {
    applyDeltaStrict(delta);
    return;
  }
}

// Throttled emit loop
setInterval(() => {
  if (!state.dirty) return;
  emitUpdate(false);
}, 20);

self.onmessage = (e: MessageEvent<MainToWorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'RESET': {
      resetState(true);
      return;
    }
    case 'SET_SYMBOL': {
      const sym = normalizeSymbol(msg.payload.symbol);
      state.symbol = sym;
      resetState(true);
      setSyncStatus('buffering');
      return;
    }
    case 'INIT_SNAPSHOT': {
      handleSnapshot(msg.payload);
      return;
    }
    case 'DEPTH_DELTA': {
      handleDelta(msg.payload);
      return;
    }
    case 'WS_STATUS': {
      // When reconnected after a disconnect, we should re-sync from a fresh snapshot.
      // Main thread controls snapshot fetching; worker just switches to buffering mode.
      if (!state.symbol) return;
      if (msg.payload.status === 'disconnected' || msg.payload.status === 'reconnecting') {
        setSyncStatus('gap_detected');
        return;
      }
      if (msg.payload.status === 'connected' && state.syncStatus === 'gap_detected') {
        setSyncStatus('buffering');
      }
      return;
    }
  }
};

export {};
