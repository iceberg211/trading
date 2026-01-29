# CEX 现货交易页完善计划

> **目标**: 将当前"行情展示 + 模拟交易"的前端原型升级为**高拟真的中心化交易所现货交易页面**
> 
> **范围**: 纯前端实现，使用本地模拟撮合引擎，不依赖真实后端

---

## 一、项目现状分析

### 1.1 已完成功能

| 模块 | 文件 | 状态 |
|------|------|------|
| K 线图表 | `useKlineData.ts`, `ChartContainer.tsx` | ✅ 完成 |
| 订单簿 | `useOrderBook.ts`, `OrderBook.tsx` | ✅ 完成（快照+增量+Gap检测） |
| 最近成交 | `RecentTrades.tsx` | ✅ 完成 |
| 24h Ticker | `useTicker.ts`, `TickerBar.tsx` | ✅ 完成 |
| WebSocket 管理 | `manager.ts` | ✅ 基础封装 |
| 交易表单 | `TradeForm.tsx`, `tradeAtom.ts` | ⚠️ 本地模拟 |
| 订单管理 | `useOrders.ts` | ⚠️ 本地模拟 |
| 资产面板 | `AssetPanel.tsx` | ⚠️ 本地模拟 |
| 订单簿 Worker | `orderbook.worker.ts`, `useOrderBookWorker.ts` | ⚠️ 已写但未接入 |

### 1.2 存在的问题

1. **WS 连接分散**: 各模块各自建立连接，缺少统一订阅层
2. **交易规则硬编码**: `POPULAR_SYMBOLS` 手写，未接入 `exchangeInfo`
3. **订单状态简陋**: 仅本地模拟，无完整状态机
4. **Worker 未接入**: 订单簿合并仍在主线程
5. **历史数据缺失**: RecentTrades 无首屏历史、K线无左侧翻页

---

## 二、CEX 交易页核心技术难点

### 2.1 订单簿一致性（已基本解决）
- 快照 + 增量的序列校验
- Gap 恢复机制
- 乱序处理
- 限频与回补

### 2.2 订单状态一致性（需重点强化）
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

#### 1.1 MarketDataHub 统一订阅层

**目标**: 合并所有 WS 连接，统一管理订阅

**WS 策略选择**: 
- ✅ **方案 A: 单连接 + 动态订阅** (`wss://stream.binance.com:9443/ws` + `SUBSCRIBE/UNSUBSCRIBE`)
- ❌ ~~方案 B: 组合流~~ (切换交易对需重连，不符合目标)

**文件变更**:
- [NEW] `src/core/gateway/MarketDataHub.ts`
- [NEW] `src/core/gateway/SubscriptionManager.ts`
- [MODIFY] `src/features/*/hooks/use*.ts` - 改为调用 MarketDataHub

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
- 浏览器 DevTools Network 面板只有 **1 个 WS 连接**
- 切换交易对时，**无需重连**，只发送 SUBSCRIBE/UNSUBSCRIBE 消息
- 控制台打印订阅/取消订阅日志，确认流名称正确

---

#### 1.2 ExchangeInfo 交易规则集成

**目标**: 从 Binance `/api/v3/exchangeInfo` 获取交易对元数据

**文件变更**:
- [NEW] `src/core/config/ExchangeInfo.ts`
- [NEW] `src/core/config/SymbolRegistry.ts`
- [MODIFY] `src/features/symbol/symbolAtom.ts` - 保留 `POPULAR_SYMBOLS` 作为 fallback

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
    
    // 2. 请求 REST API
    const data = await fetch('/api/v3/exchangeInfo').then(r => r.json());
    
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

#### 1.3 接入 OrderBook Worker

**目标**: 将订单簿增量合并移到 Worker，避免阻塞主线程

**文件变更**:
- [MODIFY] `src/workers/orderbook.worker.ts` - 增强合并逻辑
- [MODIFY] `src/features/orderbook/hooks/useOrderBook.ts` - 切换到 Worker

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

#### 2.1 订单状态机

**目标**: 实现完整的订单生命周期管理

**文件变更**:
- [NEW] `src/domain/trading/engine/OrderStateMachine.ts`
- [NEW] `src/domain/trading/engine/types.ts`
- [MODIFY] `src/features/orders/atoms/ordersAtom.ts`

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

#### 2.2 本地撮合引擎

**目标**: 根据订单簿模拟订单成交

**文件变更**:
- [NEW] `src/domain/trading/engine/MatchingEngine.ts`
- [NEW] `src/workers/matching.worker.ts`

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

#### 2.3 模拟账户系统

**目标**: 实现余额管理和资产变动

**文件变更**:
- [NEW] `src/domain/account/atoms/balanceAtom.ts`
- [MODIFY] `src/components/trading/AssetPanel.tsx`

**核心功能**:
- 初始化模拟资产（如 10000 USDT, 1 BTC）
- 下单时冻结资产
- 成交后扣减/增加资产
- 撤单后解冻资产

---

### Phase 3: 数据增强层 (预计 2-3 天)

#### 3.1 历史数据加载

**目标**: 完善首屏数据和分页加载

**文件变更**:
- [MODIFY] `src/components/trading/RecentTrades.tsx` - 首屏拉取 REST 历史
- [MODIFY] `src/features/chart/hooks/useKlineData.ts` - 支持左侧翻页

**验证**:
- RecentTrades 首屏显示历史成交
- 图表向左拖动时自动加载更多 K 线

---

#### 3.2 精度处理封装

**目标**: 使用 decimal.js 处理所有金额计算

**文件变更**:
- [NEW] `src/utils/decimal.ts`
- [MODIFY] 所有涉及金额计算的文件

**验证**:
- `0.1 + 0.2` 不再出现精度问题

---

### Phase 4: 性能优化层 (预计 2 天)

#### 4.1 虚拟列表

**目标**: 订单簿和成交列表使用虚拟滚动

**文件变更**:
- [MODIFY] `src/features/orderbook/components/OrderBook.tsx`
- [MODIFY] `src/components/trading/RecentTrades.tsx`

**技术选型**: `react-window`

---

#### 4.2 渲染节流

**目标**: 高频更新时批量合并渲染

**实现方式**:
- requestAnimationFrame 节流
- 16ms 内多次更新只渲染一次

---

## 五、验证计划

### 自动化验证
> ⚠️ 当前项目未配置测试框架，建议后续补充 Vitest

### 手动验证 Checklist

#### Phase 1 验证
- [ ] 浏览器 Network 面板只有 1 个 WS 连接
- [ ] 切换交易对后，订阅正确更新（无残留订阅）
- [ ] 交易对搜索可用，显示 tick/step 信息
- [ ] 订单簿高频更新时无卡顿（Chrome Performance）

#### Phase 2 验证
- [ ] 市价买单以卖一价立即成交
- [ ] 限价买单高于卖一价立即成交
- [ ] 限价买单低于卖一价进入挂单列表
- [ ] 撤单后订单状态变为 CANCELED，资产解冻
- [ ] 成交后余额正确变动

#### Phase 3 验证
- [ ] RecentTrades 首屏有历史数据
- [ ] K线图向左拖动可加载更多数据
- [ ] 金额计算无精度问题（如 0.1 + 0.2 = 0.3）

#### Phase 4 验证
- [ ] 订单簿 1000 条数据滚动流畅
- [ ] 高频更新时 FPS >= 55

---

## 六、优先级排序

| 优先级 | 任务 | 预计时间 | 依赖 |
|-------|------|---------|------|
| P0 🔴 | MarketDataHub 统一订阅层 | 2 天 | 无 |
| P0 🔴 | ExchangeInfo 集成 | 1 天 | 无 |
| P0 🔴 | 订单状态机 | 2 天 | 无 |
| P1 🟡 | 本地撮合引擎 | 2 天 | 订单状态机 |
| P1 🟡 | 模拟账户系统 | 1 天 | 撮合引擎 |
| P1 🟡 | 接入 OrderBook Worker | 1 天 | 无 |
| P2 🟢 | 精度处理 (decimal.js) | 0.5 天 | 无 |
| P2 🟢 | 历史数据加载 | 1 天 | 无 |
| P2 🟢 | 虚拟列表 | 1 天 | 无 |
| P2 🟢 | 渲染节流 | 0.5 天 | 无 |

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
| M1 | MarketDataHub 上线，单一 WS 连接 | Day 2 |
| M2 | 交易规则动态加载，下单校验完整 | Day 3 |
| M3 | 完整订单生命周期，可下单/撤单 | Day 6 |
| M4 | 模拟成交，资产变动正确 | Day 8 |
| M5 | 性能优化完成，高拟真体验 | Day 10 |

---

**🚀 确认此计划后即可开始实施！**
