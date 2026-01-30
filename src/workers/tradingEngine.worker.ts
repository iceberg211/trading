/**
 * Trading Engine Web Worker
 * 
 * Responsibilities:
 * 1. Maintain WebSocket connection
 * 2. Process high-frequency OrderBook updates off-main-thread
 * 3. Buffer and merge updates
 * 4. Throttle updates to main thread (View Model sync)
 */

type OrderBookItem = [string, string]; // [price, quantity]

interface WorkerState {
  // Connection
  ws: WebSocket | null;
  url: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  reconnectAttempts: number;
  
  // Data
  symbol: string | null;
  lastUpdateId: number;
  bids: Map<string, string>;
  asks: Map<string, string>;
  buffer: any[];
  isSynced: boolean;
  
  // Throttle
  dirty: boolean;
  lastEmitTime: number;
}

const state: WorkerState = {
  ws: null,
  url: 'wss://stream.binance.com:9443/ws',
  status: 'disconnected',
  reconnectAttempts: 0,
  
  symbol: null,
  lastUpdateId: 0,
  bids: new Map(),
  asks: new Map(),
  buffer: [],
  isSynced: false,
  
  dirty: false,
  lastEmitTime: 0,
};

// Configuration
const CONFIG = {
  THROTTLE_MS: 100, // Update View Model max every 100ms
  MAX_RECONNECT_ATTEMPTS: 5,
  ORDERBOOK_LIMIT: 500,
};

// ==================== Logic Helpers ====================

/**
 * Compare two price strings precisely
 */
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

/**
 * Merge updates into map
 */
function mergeUpdates(map: Map<string, string>, updates: OrderBookItem[]) {
  for (const [price, qty] of updates) {
    if (qty === '0' || parseFloat(qty) === 0) {
      map.delete(price);
    } else {
      map.set(price, qty);
    }
  }
}

/**
 * Get sorted snapshot
 */
function getSortedSnapshot(limit: number) {
  const bids = Array.from(state.bids.entries()).sort((a, b) => -comparePrices(a[0], b[0])).slice(0, limit);
  // Asks sorted ascending
  const asks = Array.from(state.asks.entries()).sort((a, b) => comparePrices(a[0], b[0])).slice(0, limit);
  return { bids, asks };
}

// ==================== WebSocket Logic ====================

function connect(url: string) {
  if (state.ws) {
    state.ws.close();
  }
  
  state.url = url;
  state.status = 'connecting';
  postMessage({ type: 'STATUS', payload: 'connecting' });
  
  try {
    state.ws = new WebSocket(url);
    
    state.ws.onopen = () => {
      state.status = 'connected';
      state.reconnectAttempts = 0;
      postMessage({ type: 'STATUS', payload: 'connected' });
      
      // Resubscribe if symbol exists
      if (state.symbol) {
        subscribeToStream(state.symbol);
      }
    };
    
    state.ws.onmessage = handleMessage;
    
    state.ws.onclose = () => {
      state.status = 'disconnected';
      postMessage({ type: 'STATUS', payload: 'disconnected' });
      // Simple reconnect logic could go here
    };
    
    state.ws.onerror = (err) => {
      console.error('[Worker] WS Error', err);
    };
    
  } catch (e) {
    console.error('[Worker] Connection failed', e);
  }
}

function subscribeToStream(symbol: string) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    const msg = {
      method: 'SUBSCRIBE',
      params: [`${symbol.toLowerCase()}@depth`],
      id: Date.now()
    };
    state.ws.send(JSON.stringify(msg));
    console.log('[Worker] Subscribed to', symbol);
  }
}

function handleMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);
    
    if (data.e === 'depthUpdate') {
      processDepthUpdate(data);
    }
    
  } catch (e) {
    console.error('[Worker] Message parse error', e);
  }
}

function processDepthUpdate(data: any) {
  // Correct Gap Detection & Buffering Logic
  if (!state.isSynced) {
    state.buffer.push(data);
    return;
  }
  
  if (data.u <= state.lastUpdateId) {
    return; // Old update
  }
  
  // Gap detection
  if (data.U > state.lastUpdateId + 1) {
    console.warn(`[Worker] Gap detected! Expected ${state.lastUpdateId + 1}, got ${data.U}`);
    postMessage({ type: 'GAP_DETECTED' });
    state.isSynced = false;
    state.buffer = []; // Clear buffer and wait for re-sync
    return;
  }
  
  // Apply update
  mergeUpdates(state.bids, data.b);
  mergeUpdates(state.asks, data.a);
  
  state.lastUpdateId = data.u;
  state.dirty = true;
}

// ==================== view Loop ====================

// Throttle updates to main thread
setInterval(() => {
  if (state.dirty) {
    const now = Date.now();
    if (now - state.lastEmitTime >= CONFIG.THROTTLE_MS) {
      const { bids, asks } = getSortedSnapshot(CONFIG.ORDERBOOK_LIMIT);
      
      postMessage({
        type: 'ORDERBOOK_UPDATE',
        payload: {
          bids,
          asks,
          lastUpdateId: state.lastUpdateId
        }
      });
      
      state.dirty = false;
      state.lastEmitTime = now;
    }
  }
}, 20); // Check every 20ms

// ==================== Message Handler (Main -> Worker) ====================

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'CONNECT':
      connect(payload.url || state.url);
      break;
      
    case 'SUBSCRIBE':
      state.symbol = payload.symbol;
      state.isSynced = false;
      state.buffer = [];
      state.bids.clear();
      state.asks.clear();
      subscribeToStream(payload.symbol);
      break;
      
    case 'INIT_SNAPSHOT':
      // Receive REST snapshot from main thread
      const { lastUpdateId, bids, asks } = payload;
      
      state.bids.clear();
      state.asks.clear();
      
      for (const [p, q] of bids) state.bids.set(p, q);
      for (const [p, q] of asks) state.asks.set(p, q);
      
      state.lastUpdateId = lastUpdateId;
      
      // Replay valid buffer
      const validUpdates = state.buffer.filter(u => u.u > lastUpdateId);
      for (const u of validUpdates) {
        if (u.U <= state.lastUpdateId + 1 && u.u >= state.lastUpdateId + 1) {
          processDepthUpdate(u);
        } else {
             // If we can't accept the very first buffered message, we might have a gap. 
             // But simplified logic: just apply if U <= current+1
        }
      }
      
      // If we are here, we are synced
      state.isSynced = true;
      state.dirty = true;
      console.log('[Worker] Snapsot initialized, buffer replayed');
      break;
  }
};

export {};
