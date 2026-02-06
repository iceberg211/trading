# WebSocket 连接诊断与订单簿更新问题排查

## 1. WebSocket 连接数量

### 当前架构：**单一 WebSocket**

你的项目使用了**单一 WebSocket 连接**架构，所有数据流共享同一个 WebSocket：

```
┌─────────────────────────────────────────┐
│   Binance WebSocket (wss://...)        │
│   - ticker (币价)                       │
│   - trade (最近交易)                    │
│   - depth (订单簿)                      │
│   - kline (K线)                         │
└─────────────────────────────────────────┘
           ↓
    MarketDataHub (单例)
           ↓
    ┌──────┴──────┬──────┬──────┐
    ↓             ↓      ↓      ↓
 useTicker  RecentTrades  useOrderBook  useKlineData
```

**证据**：
- `MarketDataHub.ts` 第 35 行：创建唯一的 `WebSocketManager` 实例
- `useOrderBook.ts` 第 138 行：通过 `marketDataHub.subscribe('depth', symbol)` 订阅深度数据
- `RecentTrades.tsx` 第 148 行：通过 `marketDataHub.subscribe('trade', symbol)` 订阅交易数据
- `useTicker.ts` 第 108 行：通过 `marketDataHub.subscribe('ticker', symbol)` 订阅ticker数据

### 额外的 Web Worker

除了主 WebSocket，还有 **1 个 Web Worker** 用于订单簿计算：
- `orderbook.worker.ts`：负责深度数据的协议处理（快照对齐、增量合并、gap 检测）
- **注意**：Worker 本身**不创建 WebSocket**，它只是接收主线程转发的深度消息

---

## 2. 问题分析：为什么订单簿不更新？

### 症状
- ✅ 币价更新正常（ticker）
- ✅ 最近交易更新正常（trade）
- ❌ 订单簿不更新（depth）

### 可能原因

#### 原因 1：depth 订阅失败（最可能）

**检查方法**：打开浏览器 Console，刷新页面，观察日志：

```bash
# 应该看到以下日志（按时间顺序）：
[MarketDataHub] Subscribed: btcusdt@depth@100ms
[OrderBook] Fetching snapshot for BTCUSDT
[OrderBook] Snapshot sent to worker, lastUpdateId: 12345678
```

**如果没有看到 "Subscribed: xxx@depth@100ms"**：
- 说明订阅命令未能成功发送到 Binance
- 可能是 StrictMode 双重执行导致订阅被意外取消

**如果看到 "Unsubscribed: xxx@depth@100ms" 紧跟 "Subscribed"**：
- 说明订阅被立即取消了
- 这通常是 React 18 StrictMode 的副作用

---

#### 原因 2：快照请求失败

**检查方法**：查看 Network 标签页 -> Filter "depth"：

```bash
# 应该看到：
GET /api/v3/depth?symbol=BTCUSDT&limit=1000
Status: 200 OK
```

**如果看到 429 Too Many Requests**：
- Binance API 限流了（你的 IP 请求过于频繁）
- 解决方案：等待 1 分钟后重试

**如果看到 timeout 或 ERR_NETWORK**：
- API 无法访问（可能被墙）
- 我刚刚已经将 `vite.config.ts` 的 proxy target 从 `data-api.binance.vision` 改为 `api.binance.com`
- **需要重启开发服务器**才能生效

---

#### 原因 3：Worker 卡在 "syncing" 状态

**Worker 状态流转**：
```
uninitialized → buffering → syncing → synchronized
                    ↑            ↓
                    └─ gap_detected
```

**卡在 syncing 的原因**：
1. 快照获取成功，但 `lastUpdateId` 与 WebSocket 增量事件的 `U`/`u` 无法对齐
2. WebSocket 消息格式错误，worker 无法解析
3. 消息 symbol 不匹配（大小写问题）

**检查方法**：在 `orderbook.worker.ts` 第 256 行添加日志：

```typescript
function handleDelta(delta: DepthDelta) {
  console.log('[Worker] Received delta:', delta.symbol, 'U:', delta.U, 'u:', delta.u);
  // ...
}
```

---

#### 原因 4：消息路由失败

`MarketDataHub` 通过 `extractChannelType` 提取 channel 类型：

```typescript
// 输入: 'btcusdt@depth@100ms'
// 输出: 'depth'
```

如果这个正则匹配失败，消息将无法路由到 `useOrderBook` 的 `onMessage('depth', ...)` 回调。

**检查方法**：在 `MarketDataHub.ts` 第 289 行添加日志：

```typescript
const channelType = this.extractChannelType(stream);
console.log('[Hub] Routing message:', stream, '->', channelType);
```

---

## 3. 快速诊断步骤

### Step 1: 检查 WebSocket 是否连接

打开 Console，输入：

```javascript
window.__marketDataHub = marketDataHub; // 在 MarketDataHub.ts 末尾添加这行
```

然后在 Console 输入：

```javascript
window.__marketDataHub.getStatus()
// 应该返回: 'connected'
```

---

### Step 2: 检查订阅列表

在 Console 输入：

```javascript
window.__marketDataHub.subscriptionManager.getStats()
// 应该看到：
// {
//   totalStreams: 3,
//   streams: [
//     { name: 'btcusdt@ticker', count: 1 },
//     { name: 'btcusdt@trade', count: 1 },
//     { name: 'btcusdt@depth@100ms', count: 1 }
//   ]
// }
```

**如果没有 `@depth@100ms`**：
- 订阅失败，需要检查 `useOrderBook` 的 useEffect 是否正常执行

---

### Step 3: 监听原始 WebSocket 消息

在 `MarketDataHub.ts` 第 59 行添加日志：

```typescript
this.ws.subscribe((data: any) => {
  console.log('[WS RAW]', data.e, data.s); // 打印事件类型和symbol
  this.handleMessage(data);
});
```

刷新页面，应该看到：

```
[WS RAW] trade BTCUSDT
[WS RAW] depthUpdate BTCUSDT
[WS RAW] 24hrTicker BTCUSDT
```

**如果只看到 `trade` 和 `24hrTicker`，没有 `depthUpdate`**：
- Binance 没有推送 depth 数据
- 说明订阅命令未成功发送（检查 Network -> WS tab 的 "Frames"）

---

## 4. 立即尝试的解决方案

### 方案 1：重启开发服务器

我刚刚修改了 `vite.config.ts`，**必须重启**才能生效：

```bash
# 停止当前服务器（Ctrl+C）
npm run dev
```

### 方案 2：临时禁用 React StrictMode

在 `main.tsx` 中：

```typescript
// 注释掉 StrictMode
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
```

### 方案 3：清除缓存并硬刷新

浏览器中按 `Cmd+Shift+R` (Mac) 或 `Ctrl+Shift+R` (Windows)

---

## 5. 临时调试代码

在 `useOrderBook.ts` 第 139 行之后添加：

```typescript
const unsubscribe = marketDataHub.subscribe('depth', symbol);
console.log('[DEBUG] Subscribed to depth for', symbol); // 添加这行

const unregister = marketDataHub.onMessage('depth', (msg: any) => {
  console.log('[DEBUG] Received depth message:', msg.e, msg.s); // 添加这行
  // ...
});
```

这样就能看到消息是否真的到达了 `useOrderBook`。
