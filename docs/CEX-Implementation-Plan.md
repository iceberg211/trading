# CEX 现货交易页完善计划

> **目标**: 将当前"行情展示 + 模拟交易"的前端原型升级为**高拟真的中心化交易所现货交易页面**
> 
> **范围**: 纯前端实现，使用本地模拟撮合引擎，不依赖真实后端
>
> **本文档最后校准**: 2026-02-03（已按当前仓库实际代码做过对齐，并标记缺口）
>
> **状态图例**:
> - ✅ 已实现（现有代码已具备，可做小修/增强）
> - 🟡 部分实现（有雏形/可用，但与“高拟真 CEX”仍有关键差距）
> - 🔴 未实现（文档提出但仓库尚未落地）
> - ⚪️ 文档过期（计划中说缺，但代码里其实已经实现；需要更新计划表述）

---

## 一、项目现状分析

### 1.1 已完成功能

| 模块 | 关键文件/入口 | 状态 | 备注 |
|------|--------------|------|------|
| 交易页整体布局 | `src/components/layout/TradingLayout.tsx` | ✅ | 图表 / 盘口 / 成交 / 下单 / 资产 / 订单面板组合完成 |
| 统一行情订阅层（Public WS） | `src/core/gateway/MarketDataHub.ts` | 🟡 | 图表/成交/ticker 已走 Hub；订单簿仍有独立链路（见下文缺口） |
| WS 连接管理 | `src/services/websocket/manager.ts` | 🟡 | 基础可用；需补“手动断开不重连”等边界、退避策略等 |
| 交易规则（ExchangeInfo） | `src/core/config/ExchangeInfo.ts` | ✅ | 已做 localStorage 缓存 + fallback + 后台刷新 |
| K 线图表（LWC） | `src/features/chart/*` | ✅ | 历史加载 + 左拉加载 + WS 增量 + 断线补齐 |
| 订单簿（UI + 聚合/虚拟列表） | `src/features/orderbook/components/OrderBook.tsx` | ✅ | 已用 `react-window`；聚合与 tooltip 已实现 |
| 订单簿（高频处理） | `src/features/orderbook/hooks/useOrderBook.ts` + `src/workers/tradingEngine.worker.ts` | 🟡 | 已用 Worker，但 WS 链路不统一、同步协议仍偏简化 |
| 最近成交（历史 + WS + 虚拟列表） | `src/components/trading/RecentTrades.tsx` | ✅ | 首屏 REST 历史 + WS 增量 + 虚拟列表 |
| 24h Ticker | `src/features/ticker/hooks/useTicker.ts` + `src/components/trading/TickerBar.tsx` | ✅ | WS 实时 + 价格闪烁效果 |
| 模拟账户（余额/冻结/成交入账） | `src/domain/account/balanceAtom.ts` | ✅ | free/locked、冻结/解冻、成交变更 |
| 订单状态机 | `src/domain/trading/engine/OrderStateMachine.ts` | ✅ | 基础状态转换已实现 |
| 本地撮合引擎 | `src/domain/trading/engine/MatchingEngine.ts` | 🟡 | 已支持市价/限价/止损单（部分逻辑可增强：精度/手续费/滑点等） |
| 交易服务（撮合 + 余额 + 订单联动） | `src/domain/trading/hooks/useTradingService.ts` | 🟡 | 已可用；仍缺“CEX 私有流事件模型/回放”等能力 |
| 精度工具封装 | `src/utils/decimal.ts` | ✅ | 可继续统一替换代码中散落的 parseFloat/toFixed |
| 订单面板 | `src/components/trading/OrderPanel.tsx` + `src/features/orders/*` | ✅ | 已有当前委托/历史/成交 3 tab（数据为本地模拟） |

### 1.2 存在的问题

> 注：本节已按当前代码“对齐”更新。原文中部分问题（如 K 线左拉、RecentTrades 首屏历史、ExchangeInfo、状态机/撮合）已实现，属于 ⚪️ 文档过期项。

1. 🟡 **订单簿链路使用独立 Worker WS**
   - 当前图表/成交/ticker 用 `MarketDataHub`；订单簿用 `tradingEngine.worker.ts` 自建 WS。
   - 架构现状：存在两个 Worker 文件：
     - `src/workers/tradingEngine.worker.ts`：**当前主路径**，管理 WS 连接 + 订单簿合并/节流
     - `src/workers/orderbook.worker.ts`：纯合并/排序逻辑，**未被主路径使用**（建议清理或明确用途）
   - 风险：两套连接/重连/状态、订阅残留更难治理，后续加"全局健康度/延迟监控"会更复杂。

2. 🔴 **缺少“市场列表/搜索/自选/最近”的终端级能力**
   - 现在 `SymbolSelector` 主要基于 `POPULAR_SYMBOLS`，未消费 `ExchangeInfo.getAllSymbols()/searchSymbols()`。

3. 🟡 **订单簿同步协议仍偏简化**
   - `tradingEngine.worker.ts` 内部有 buffer/gap 检测，实现了基本的对齐逻辑。
   - 但连续性校验（`next.U == prev.u + 1`）在 gap 后的恢复策略仍可增强。

4. 🔴 **缺少“私有数据平面（Private Data plane）”的抽象**
   - 即使是纯前端模拟，也建议把“余额变更/订单状态/成交回报”抽象成一个事件流（模拟 CEX 的用户数据流），以支持：乐观 UI、回滚、断线重放。

5. 🟡 **工程化基线不稳**
   - `pnpm lint`/`pnpm build` 需要保证可稳定通过（建议作为 P0 守门项）。
   - 建议增加最小验证（哪怕先是 domain 层的单元测试/脚本）。

6. 🟡 **图表与交易的深度融合不足**
   - 缺少订单线/止损线/成交标记等 “Chart Overlay / Chart Trading” 能力（终端拟真度会明显提升）。

### 1.3 与业界成熟 CEX（整页交易终端）的差距清单（本项目范围内）

> 下面是“高拟真交易终端”常见能力，本项目当前的落地情况（仅做标记，便于你后续评估是否实现）。

#### 1.3.1 市场与导航（Market）
- 🔴 全量市场列表（2000+ symbols）、搜索、筛选（按 quote/base、24h 涨跌、成交额）
- 🔴 自选/最近交易对（本地持久化）
- 🔴 多报价资产分组（USDT/BTC/FDUSD...）与快速切换

#### 1.3.2 图表与交易融合（Chart Trading）
- 🔴 图表叠加：挂单线/止损线/成交标记/均价线
- 🔴 图表交互：点击盘口价反填、拖拽改单/撤单（可选高级）
- 🔴 指标/绘图工具体系（若继续走 Lightweight Charts，需要自研补齐；或接入 TradingView）

#### 1.3.3 订单体系（Orders）
- 🟡 高拟真订单状态（含 PENDING / ACK / PARTIAL / FILLED / CANCELING 等更细状态）
- 🔴 更完整的订单类型：OCO、止盈止损、Post-only、Reduce-only（现货可选）
- 🔴 明确的手续费模型（maker/taker、扣费币种、显示预估费用）

#### 1.3.4 数据一致性与健康度（Reliability）
- 🔴 server time offset / 延迟监控（RTT、消息延迟、丢包/重连次数）
- 🟡 断线补齐策略统一化（K 线已做；订单簿/成交/ticker 需统一策略）
- 🔴 订阅健康度/错误可观测性（统一日志与 UI 提示面板）

#### 1.3.5 性能与工程化（Quality）
- 🟡 Worker 策略统一（目前有多个 Worker/路径，需收敛为清晰架构）
- 🔴 基础测试体系（Vitest）+ 关键域逻辑回归（撮合/状态机/精度）
- 🔴 Lint/Build 守门（CI 或至少本地可稳定通过）

---

## 二、CEX 交易页核心技术难点

### 2.1 订单簿一致性（🟡 已有基础，但仍需对齐“严格协议”）
- 快照 + 增量的序列校验
- Gap 恢复机制
- 乱序处理
- 限频与回补

### 2.2 订单状态一致性（🟡 已有状态机/撮合，但终端级仍需强化）
- 下单后的 **乐观 UI vs 服务端权威状态** 冲突
- 撤单/成交并发更新
- 完整状态机：`NEW → PARTIAL_FILLED → FILLED | CANCELED | EXPIRED | REJECTED`

### 2.3 高频实时与性能
- 订单簿/成交/行情多源高频刷新
- 渲染节流、虚拟列表、Worker 合并
- requestAnimationFrame 批量更新

### 2.4 多源数据一致性
- ticker、trade、orderbook、kline 的时间戳与价格对齐
- 避免 UI "跳价"

### 2.5 交易规则与精度
- tick size / step size / min notional
- 手续费计算
- 精度截断（使用 decimal.js）

### 2.6 Public/Private 双平面（🔴 目前缺少 Private 数据平面抽象）
- Public（行情）与 Private（用户）数据的连接、重连、补齐策略不同
- CEX 里订单/成交/余额通常由“私有用户数据流”驱动，才能保证一致性与可观测

### 2.7 市场导航与信息密度（🔴 目前缺少终端级市场列表能力）
- 市场全量列表、搜索、筛选、排序、自选/最近
- 这是“整页交易终端”的核心入口之一（仅靠热门列表不够拟真）

---

## 三、目标架构设计

### 3.1 五层架构

```
┌─────────────────────────────────────────────────────────────┐
│                       UI Layer                               │
│  (ChartContainer, OrderBook, TradeForm, OrderPanel, etc.)   │
│  只消费领域状态，不直接碰网络与复杂业务逻辑                      │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                    Domain State Layer                        │
│  marketData: kline, orderbook, trades, ticker               │
│  trading: orders, fills                                     │
│  account: balance, positions (模拟)                         │
│  (Jotai Atoms + 派生选择器)                                  │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                 Computation & Performance Layer              │
│  - OrderBook Worker (增量合并)                               │
│  - Batch Renderer (RAF 节流)                                │
│  - History Loader (分页回补)                                │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                    Normalization Layer                       │
│  - 数据格式标准化                                            │
│  - 时间戳同步                                                │
│  - 精度规则应用 (decimal.js)                                 │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                    Data Gateway Layer                        │
│  MarketDataHub: 统一 WS 订阅管理                             │
│  REST Client: 快照/历史数据获取                              │
│  (重连、节流、缓存)                                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构调整

> 说明：本仓库目前已经落地了 `core/gateway`、`core/config`、`domain/account`、`domain/trading`、`workers` 等关键目录；
> 下面的结构更多作为“完善方向”参考，其中 `core/normalizer/*`、`SymbolRegistry` 等仍未完全落地。

```
src/
├── core/                          # [新增] 核心基础设施
│   ├── gateway/
│   │   ├── MarketDataHub.ts       # 统一行情订阅层
│   │   ├── SubscriptionManager.ts # 订阅管理
│   │   └── types.ts
│   ├── normalizer/
│   │   ├── TradeNormalizer.ts
│   │   ├── OrderBookNormalizer.ts
│   │   └── KlineNormalizer.ts
│   └── config/
│       ├── ExchangeInfo.ts        # 交易对元数据
│       └── SymbolRegistry.ts      # 符号注册表
│
├── domain/                        # [新增] 领域状态
│   ├── market/
│   │   ├── atoms/
│   │   │   ├── orderBookAtom.ts
│   │   │   ├── tradesAtom.ts
│   │   │   ├── klineAtom.ts
│   │   │   └── tickerAtom.ts
│   │   └── selectors/
│   ├── trading/
│   │   ├── atoms/
│   │   │   ├── ordersAtom.ts
│   │   │   └── fillsAtom.ts
│   │   ├── engine/
│   │   │   ├── MatchingEngine.ts  # 本地撮合引擎
│   │   │   ├── OrderStateMachine.ts
│   │   │   └── types.ts
│   │   └── hooks/
│   └── account/
│       ├── atoms/
│       │   ├── balanceAtom.ts
│       │   └── positionsAtom.ts
│       └── hooks/
│
├── workers/                       # [强化] Worker 层
│   ├── orderbook.worker.ts        # 已有，需接入
│   └── matching.worker.ts         # [新增] 撮合引擎 Worker
│
├── features/                      # 现有功能模块（保留，逐步迁移）
├── components/                    # UI 组件
└── services/                      # 现有服务层（逐步迁移到 core/）
```

---

## 四、实现计划

### Phase 1: 基础设施层 (预计 3-4 天)

#### 1.1 MarketDataHub 统一订阅层（🟡 已落地，待“单 WS”收敛）

**目标**: 合并所有 WS 连接，统一管理订阅

**当前落地情况（按现有代码）**:
- ✅ 已实现 `src/core/gateway/MarketDataHub.ts`（单连接 + SUBSCRIBE/UNSUBSCRIBE + 引用计数）
- 🟡 图表/成交/ticker 已接入；订单簿目前走 `src/workers/tradingEngine.worker.ts` 自建 WS（因此整页仍是多 WS）

**WS 策略选择**: 
- ✅ **方案 A: 单连接 + 动态订阅** (`wss://stream.binance.com:9443/ws` + `SUBSCRIBE/UNSUBSCRIBE`)
- ❌ ~~方案 B: 组合流~~ (切换交易对需重连，不符合目标)

**后续建议变更（尚未完成）**:
- 🔴 订单簿深度流也统一接入 Hub（Hub 收消息 → Worker 做合并/聚合/节流 → 主线程只渲染）
- 🟡 `src/services/websocket/manager.ts` 增强连接生命周期（手动断开不重连、退避、错误分类）

**核心功能**:
```typescript
interface MarketDataHub {
  // 订阅管理（动态订阅）
  subscribe(channel: 'kline' | 'depth' | 'trade' | 'ticker', symbol: string, interval?: string): () => void;
  
  // 数据分发
  onMessage(channel: string, handler: (data: any) => void): void;
  
  // 连接状态
  getStatus(): 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
}

// 动态订阅示例
class MarketDataHub {
  private requestId = 1;
  
  subscribe(channel: string, symbol: string, interval?: string) {
    const stream = this.buildStreamName(channel, symbol, interval);
    
    // 发送 SUBSCRIBE 消息
    this.ws.send(JSON.stringify({
      method: 'SUBSCRIBE',
      params: [stream],
      id: this.requestId++
    }));
    
    // 返回取消订阅函数
    return () => {
      this.ws.send(JSON.stringify({
        method: 'UNSUBSCRIBE',
        params: [stream],
        id: this.requestId++
      }));
    };
  }
}
```

**验证**:
- 🔴 目标：浏览器 DevTools Network 面板只有 **1 个 WS 连接**
- 🟡 现状：通常会看到 **2 个 WS**（Hub 1 个 + orderbook worker 1 个）
- 切换交易对时，**无需重连**，只发送 SUBSCRIBE/UNSUBSCRIBE 消息
- 控制台打印订阅/取消订阅日志，确认流名称正确

---

#### 1.2 ExchangeInfo 交易规则集成（✅ 已落地，🔴 SymbolRegistry 未实现）

**目标**: 从 Binance `/api/v3/exchangeInfo` 获取交易对元数据

**当前落地情况（按现有代码）**:
- ✅ `src/core/config/ExchangeInfo.ts` 已实现（缓存/后台刷新/fallback/搜索），使用 `apiClient` 走 `/api` 代理
- ✅ `POPULAR_SYMBOLS` 定义在 `ExchangeInfo.ts`（`string[]` 类型），并通过 `core/config/index.ts` 导出
- ⚠️ `src/features/symbol/atoms/symbolAtom.ts` 仍有独立的 `POPULAR_SYMBOLS`（`SymbolConfig[]` 类型）作为 UI fallback
- 🟡 存在两处 `POPULAR_SYMBOLS` 定义，类型不同，建议后续统一
- 🔴 `SymbolRegistry` 未实现（目前可不做，但要在文档里标记为"未落地"）

**核心数据结构**:
```typescript
interface SymbolConfig {
  symbol: string;           // BTCUSDT
  baseAsset: string;        // BTC
  quoteAsset: string;       // USDT
  pricePrecision: number;   // 价格小数位
  quantityPrecision: number;// 数量小数位
  tickSize: string;         // 最小价格变动
  stepSize: string;         // 最小数量变动
  minNotional: string;      // 最小交易金额
  minQty: string;           // 最小交易数量
}
```

**缓存策略**:
```typescript
class ExchangeInfoManager {
  private static CACHE_KEY = 'binance_exchange_info';
  private static CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时
  
  async loadExchangeInfo() {
    // 1. 尝试从 localStorage 读取
    const cached = this.loadFromCache();
    if (cached && !this.isCacheExpired(cached)) {
      return cached.data;
    }
    
    // 2. 请求 REST API（通过 apiClient 走代理）
    const response = await apiClient.get('/api/v3/exchangeInfo');
    const data = response.data;
    
    // 3. 保存到缓存（内存 + localStorage）
    this.saveToCache(data);
    
    return data;
  }
  
  // 支持搜索和分页
  searchSymbols(query: string, page = 0, pageSize = 50) {
    const filtered = this.symbols.filter(s => 
      s.symbol.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.slice(page * pageSize, (page + 1) * pageSize);
  }
}
```

**热门列表 Fallback**:
- 保留 `POPULAR_SYMBOLS` 常量作为加载失败时的备选
- 首屏优先显示热门交易对，避免空白

**验证**:
- 控制台打印加载的交易对数量（预期 2000+）
- 第二次刷新页面时，从缓存加载（无网络请求）
- 搜索 "BTC" 可以快速过滤相关交易对
- 下单表单根据规则自动校验（如最小金额）

---

#### 1.3 接入 OrderBook Worker（✅ 已有 Worker，架构已明确）

**目标**: 将订单簿增量合并移到 Worker，避免阻塞主线程

**当前落地情况（按现有代码）**:
- ✅ **主路径**：`src/features/orderbook/hooks/useOrderBook.ts` → `src/hooks/useTradingEngine.ts` → `src/workers/tradingEngine.worker.ts`
- ⚠️ 存在未使用的 `src/workers/orderbook.worker.ts` + `src/hooks/useOrderBookWorker.ts`（纯合并逻辑，不管理 WS）

**Worker 架构说明**:
- `tradingEngine.worker.ts`：管理 WS 连接 + 订单簿合并/节流 + gap 检测
- `orderbook.worker.ts`：仅提供 merge/sort/calculate_stats 功能，**当前未被调用**

**后续建议（尚未完成）**:
- 🟡 考虑删除 `orderbook.worker.ts` 或明确其用途，避免维护两套 Worker
- 🔴 严格对齐 Binance diff-depth 同步协议（首包对齐 + 连续性校验 + gap 恢复策略增强）

**精度一致性要求**:
```typescript
// ❌ 错误：主线程用 decimal.js，Worker 用 parseFloat
// 主线程
const sorted = bids.sort((a, b) => new Decimal(b[0]).cmp(a[0]));

// Worker
const sorted = bids.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
// 可能导致排序结果不一致！

// ✅ 正确：统一使用 decimal.js
// 方案 1: Worker 也引入 decimal.js
import Decimal from 'decimal.js';
const sorted = bids.sort((a, b) => new Decimal(b[0]).cmp(a[0]));

// 方案 2: 或者主线程和 Worker 都用字符串比较（需要保证格式一致）
const sorted = bids.sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }));
```

**验证**:
- Chrome Performance 面板无长帧
- 高频更新时 FPS 保持 60
- 订单簿排序与主线程一致（对比前 10 档价格）

---

### Phase 2: 交易核心层 (预计 4-5 天)

#### 2.1 订单状态机（✅ 已落地）

**目标**: 实现完整的订单生命周期管理

**当前落地情况（按现有代码）**:
- ✅ `src/domain/trading/engine/OrderStateMachine.ts` 已实现
- ✅ `src/domain/trading/types/*` 已存在，UI 侧通过 `src/features/orders/hooks/useOrders.ts` 做了转换
- 🟡 仍可增强：更细的中间态（如 PENDING_NEW / CANCELING）、更完整的 rejectReason、以及与“私有流事件模型”的衔接

**状态定义**:
```typescript
type OrderStatus = 
  | 'NEW'           // 已提交
  | 'PARTIAL_FILLED'// 部分成交
  | 'FILLED'        // 完全成交
  | 'CANCELED'      // 已撤销
  | 'EXPIRED'       // 已过期
  | 'REJECTED';     // 被拒绝

// 拒绝原因枚举
type RejectReason =
  | 'INSUFFICIENT_BALANCE'  // 余额不足
  | 'INVALID_PRICE'         // 价格不符合 tick size
  | 'INVALID_QUANTITY'      // 数量不符合 step size
  | 'MIN_NOTIONAL'          // 低于最小交易金额
  | 'PRICE_OUT_OF_RANGE'    // 价格偏离市场价过大
  | 'SYMBOL_NOT_FOUND';     // 交易对不存在

interface Order {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price: string;          // 原始价格
  origQty: string;        // 原始数量
  executedQty: string;    // 已成交数量
  status: OrderStatus;
  rejectReason?: RejectReason;  // [新增] 拒绝原因
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  createTime: number;
  updateTime: number;
}
```

**状态转换规则**:
```
NEW ──────→ PARTIAL_FILLED ──→ FILLED
 │                │
 ├─→ CANCELED     ├─→ CANCELED
 │                │
 └─→ REJECTED     └─→ EXPIRED
    (带原因)
```

**规则校验**:
```typescript
class OrderValidator {
  validate(order: NewOrderRequest, symbolConfig: SymbolConfig, balance: Balance): ValidationResult {
    // 1. 价格精度校验
    if (!this.isValidTickSize(order.price, symbolConfig.tickSize)) {
      return { valid: false, reason: 'INVALID_PRICE' };
    }
    
    // 2. 数量精度校验
    if (!this.isValidStepSize(order.quantity, symbolConfig.stepSize)) {
      return { valid: false, reason: 'INVALID_QUANTITY' };
    }
    
    // 3. 最小金额校验
    const notional = Decimal.mul(order.price, order.quantity);
    if (notional.lt(symbolConfig.minNotional)) {
      return { valid: false, reason: 'MIN_NOTIONAL' };
    }
    
    // 4. 余额校验
    if (order.side === 'BUY') {
      const required = notional;
      if (balance.quote.lt(required)) {
        return { valid: false, reason: 'INSUFFICIENT_BALANCE' };
      }
    } else {
      if (balance.base.lt(order.quantity)) {
        return { valid: false, reason: 'INSUFFICIENT_BALANCE' };
      }
    }
    
    return { valid: true };
  }
}
```

---

#### 2.2 本地撮合引擎（🟡 已落地，可继续拟真）

**目标**: 根据订单簿模拟订单成交

**当前落地情况（按现有代码）**:
- ✅ `src/domain/trading/engine/MatchingEngine.ts` 已存在，并支持市价/限价/止损单的基础撮合
- 🔴 `matching.worker.ts` 未实现（目前也不是必须，除非要做更复杂的逐档吃单/大量挂单/回测）

**建议增强点（尚未完成）**:
- 🔴 精度与格式化全面依赖 `ExchangeInfo`（pricePrecision/quantityPrecision/tickSize/stepSize），避免硬编码 `toFixed(8)`
- 🔴 手续费与扣费币种规则更贴近 CEX（maker/taker、扣费资产、显示预估费用）
- 🔴 撮合与 UI 的事件化：输出“订单回报/成交回报”事件（模拟 Private Data plane）

**撮合策略**:

**MVP 版本（快速验证）**:
- 市价买单：以卖一价全部成交
- 市价卖单：以买一价全部成交
- 限价买单：价格 >= 卖一 立即成交，否则挂单
- 限价卖单：价格 <= 买一 立即成交，否则挂单

**增强版本（高拟真，可选）**:
```typescript
class MatchingEngine {
  // 逐档吃单 + 部分成交 + 滑点
  matchMarketOrder(order: Order, orderBook: OrderBook): MatchResult {
    const side = order.side === 'BUY' ? orderBook.asks : orderBook.bids;
    let remainingQty = new Decimal(order.origQty);
    const fills: Fill[] = [];
    
    // 逐档吃单
    for (const [price, qty] of side) {
      if (remainingQty.lte(0)) break;
      
      const fillQty = Decimal.min(remainingQty, new Decimal(qty));
      fills.push({
        price,
        quantity: fillQty.toString(),
        time: Date.now()
      });
      
      remainingQty = remainingQty.sub(fillQty);
    }
    
    // 计算加权平均价
    const totalValue = fills.reduce((sum, fill) => 
      sum.add(Decimal.mul(fill.price, fill.quantity)), new Decimal(0)
    );
    const totalQty = fills.reduce((sum, fill) => 
      sum.add(fill.quantity), new Decimal(0)
    );
    const avgPrice = totalValue.div(totalQty);
    
    return {
      fills,
      avgPrice: avgPrice.toString(),
      executedQty: totalQty.toString(),
      status: remainingQty.gt(0) ? 'PARTIAL_FILLED' : 'FILLED'
    };
  }
  
  // 用户挂单叠加到盘口
  addPendingOrder(order: Order, orderBook: OrderBook) {
    const side = order.side === 'BUY' ? orderBook.bids : orderBook.asks;
    // 插入到对应价格档位，保持价格排序
    this.insertOrder(side, order);
  }
}
```

**验证**:
- **MVP**: 市价单立即成交，限价单挂单后价格触及时成交
- **增强版**: 大单部分成交，显示加权平均价和滑点

---

#### 2.3 模拟账户系统（✅ 已落地）

**目标**: 实现余额管理和资产变动

**当前落地情况（按现有代码）**:
- ✅ `src/domain/account/balanceAtom.ts` 已实现 free/locked、冻结/解冻、成交入账、重置/充值等
- 🟡 `src/components/trading/AssetPanel.tsx` 已展示模拟资产（后续可增强：展示冻结、收益、折算等）

**核心功能**:
- 初始化模拟资产（如 10000 USDT, 1 BTC）
- 下单时冻结资产
- 成交后扣减/增加资产
- 撤单后解冻资产

---

### Phase 3: 数据增强层 (预计 2-3 天)

#### 3.1 历史数据加载（✅ 已落地）

**目标**: 完善首屏数据和分页加载

**文件变更**:
- [MODIFY] `src/components/trading/RecentTrades.tsx` - 首屏拉取 REST 历史
- [MODIFY] `src/features/chart/hooks/useKlineData.ts` - 支持左侧翻页

**验证**:
- RecentTrades 首屏显示历史成交
- 图表向左拖动时自动加载更多 K 线

---

#### 3.2 精度处理封装（✅ 已落地，🟡 仍需“全局替换”）

**目标**: 使用 decimal.js 处理所有金额计算

**当前落地情况（按现有代码）**:
- ✅ 已有 `src/utils/decimal.ts`
- 🟡 仍存在一些散落的 `parseFloat/toFixed`（建议逐步替换为 `Decimal` 或 `utils/decimal`）

**验证**:
- `0.1 + 0.2` 不再出现精度问题

---

### Phase 4: 性能优化层 (预计 2 天)

#### 4.1 虚拟列表（✅ 已落地）

**目标**: 订单簿和成交列表使用虚拟滚动

**文件变更**:
- [MODIFY] `src/features/orderbook/components/OrderBook.tsx`
- [MODIFY] `src/components/trading/RecentTrades.tsx`

**技术选型**: `react-window`

---

#### 4.2 渲染节流（🟡 已有基础，仍可统一）

**当前落地情况（按现有代码）**:
- 🟡 K 线：`useKlineData` 已用 `requestAnimationFrame` 合并更新
- 🟡 订单簿：`tradingEngine.worker.ts` 有节流（`THROTTLE_MS`）

**建议补齐（尚未完成）**:
- 🔴 抽象统一的“更新调度器”（raf/batch），对 ticker/trades/orderbook 等都采用一致的节流策略

---

## 五、验证计划

### 自动化验证
> ⚠️ 当前项目未配置测试框架，建议后续补充 Vitest

### 手动验证 Checklist

#### Phase 1 验证
- [ ] 目标：浏览器 Network 面板只有 1 个 WS 连接（现状通常为 2 个）
- [ ] 切换交易对后，订阅正确更新（无残留订阅；尤其是 orderbook 链路）
- [x] ExchangeInfo 可加载并缓存（刷新后多数情况下走缓存）
- [ ] 交易对全量搜索可用（基于 ExchangeInfo，而不是仅热门列表）
- [ ] WS Manager 支持“手动断开不重连”等边界，状态/日志清晰

#### Phase 2 验证
- [x] 市价买单可立即成交（逐档吃单/滑点拟真可选增强）
- [x] 限价单可挂单/触发成交（细节拟真度可增强）
- [x] 撤单后订单状态更新，资产解冻/解锁
- [x] 成交后余额正确变动（free/locked + 扣费）
- [ ] 订单/成交/余额改为事件化（模拟 Private Data plane），支持断线重放/回滚（拟真关键）

#### Phase 3 验证
- [x] RecentTrades 首屏有历史数据
- [x] K线图向左拖动可加载更多数据
- [x] 金额计算避免浮点精度问题（已引入 `src/utils/decimal.ts`）
- [ ] 全局替换散落的 `parseFloat/toFixed`，统一精度/格式化策略

#### Phase 4 验证
- [x] 订单簿/成交列表使用虚拟滚动，长列表滚动流畅
- [ ] 高频更新时 FPS >= 55（需要统一节流/Worker 策略与性能基准测试）

---

## 六、优先级排序

| 优先级 | 任务 | 预计时间 | 依赖 |
|-------|------|---------|------|
| P0 🔴 | 单 WS 收敛：订单簿也统一到 MarketDataHub/统一 Worker | 2 天 | MarketDataHub |
| P0 🔴 | 订单簿严格同步协议（diff-depth 首包对齐 + 连续性校验 + gap 恢复） | 1-2 天 | 单 WS 收敛 |
| P0 🔴 | 市场列表（全量搜索/筛选/自选/最近） | 1-2 天 | ExchangeInfo |
| P0 🔴 | 工程守门：`pnpm build`/`pnpm lint` 可稳定通过（可加 CI） | 0.5-1 天 | 无 |
| P1 🟡 | Private Data plane 事件模型（模拟用户数据流：订单回报/成交回报/余额变更） | 2-3 天 | 订单状态机/撮合 |
| P1 🟡 | 图表与交易融合（订单线/成交标记/止损线） | 2-4 天 | 订单体系 |
| P2 🟢 | 全局精度/格式化统一（替换散落的 parseFloat/toFixed） | 1 天 | ExchangeInfo |
| P2 🟢 | 性能基准与节流统一（raf/batch、Worker 策略收敛） | 1-2 天 | 无 |
| P2 🟢 | 最小测试体系（Vitest：状态机/撮合/精度/聚合） | 1-2 天 | 无 |

---

## 七、风险与注意事项

### 7.1 API 限流
Binance REST API 限流 1200 请求/分钟，需注意：
- exchangeInfo 缓存（启动时加载一次）
- 快照请求添加防抖

### 7.2 本地模拟器局限性
- 无法模拟网络延迟导致的乱序
- 深度不足导致的部分成交需要简化处理
- 建议添加开关，方便后期切换到真实后端

### 7.3 数据一致性
- ticker 价格与 orderbook 买一卖一可能有微小差异
- 建议 UI 上做容错处理（允许 0.1% 误差）

---

## 八、里程碑

| 里程碑 | 完成标志 | 预计时间 |
|-------|---------|---------|
| M0（已完成） | 交易页基础模块齐全（图表/盘口/成交/下单/订单/资产） | - |
| M1（已完成） | ExchangeInfo 可用（缓存 + fallback） | - |
| M2（进行中） | MarketDataHub 覆盖所有行情链路（目标：单 WS） | - |
| M3（待办） | 市场列表（全量搜索/自选/最近）上线 | - |
| M4（待办） | Private Data plane 事件化（高拟真订单/成交/余额一致性） | - |
| M5（待办） | Chart Trading（订单线/成交标记/止损线）上线 | - |

---

**🚀 确认此计划后即可开始实施！**
