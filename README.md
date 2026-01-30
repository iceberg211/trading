# 🚀 Crypto Trading Terminal

一个功能完整的**现货交易模拟平台**，提供专业级的实时行情展示、K 线图表分析和模拟交易功能。

> **⚠️ 重要提示**：这是一个**教学演示项目**，所有交易均为模拟，不涉及真实资金。

---

## ✨ 核心功能

### 📊 实时行情数据
- **WebSocket 实时推送**：K 线、订单簿、成交记录、24h Ticker
- **多交易对支持**：BTC/USDT、ETH/USDT 等主流交易对
- **多时间周期**：1m、5m、15m、1h、4h、1d

### 📈 专业图表分析
- **TradingView 级别的 K 线图**（基于 Lightweight Charts）
  - 蜡烛图 / 折线图切换
  - MA/EMA 技术指标
  - 成交量柱状图
  - 十字线悬浮信息
  - 无限历史数据加载
- **订单簿深度图**：实时 Bid/Ask 可视化
- **最近成交列表**：虚拟列表优化，支持 100+ 条记录

### 💼 模拟交易系统
- **限价单 / 市价单**
- **买入 / 卖出**
- **百分比快捷下单**（25% / 50% / 75% / 100%）
- **当前委托 / 历史订单 / 成交记录**
- **模拟账户管理**（初始 10,000 USDT）

---

## 🛠️ 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| **框架** | React | 18.2 |
| **状态管理** | Jotai | 2.6.4 |
| **构建工具** | Vite | 5.0 |
| **语言** | TypeScript | 5.3 |
| **样式** | Tailwind CSS | 3.4 |
| **图表** | Lightweight Charts | 4.1.3 |
| **虚拟列表** | react-window | 1.8.10 |
| **精度计算** | decimal.js | 10.4.3 |
| **包管理器** | pnpm | - |

---

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8

### 安装与运行

```bash
# 1. 克隆项目
git clone <repository-url>
cd trading

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev

# 4. 访问 http://localhost:3000
```

### 构建生产版本

```bash
pnpm build
pnpm preview
```

---

## 📁 项目架构

```
src/
├── components/              # 通用 UI 组件
│   ├── layout/             # 布局组件
│   ├── trading/            # 交易相关组件
│   │   ├── AssetPanel.tsx      # 资产管理面板
│   │   ├── OrderPanel.tsx      # 订单管理面板
│   │   ├── RecentTrades.tsx    # 最近成交
│   │   ├── SymbolSelector.tsx  # 交易对选择器
│   │   └── TickerBar.tsx       # 行情信息栏
│   └── ui/                 # 基础 UI 组件
│
├── features/                # 功能模块（按业务领域划分）
│   ├── chart/              # K 线图模块
│   │   ├── components/         # 图表组件
│   │   ├── hooks/              # 图表 Hooks
│   │   ├── atoms/              # 图表状态
│   │   ├── constants/          # 图表配置
│   │   └── utils/              # 图表工具函数
│   ├── orderbook/          # 订单簿模块
│   ├── orders/             # 订单管理模块
│   ├── trade/              # 交易表单模块
│   ├── ticker/             # 行情数据模块
│   └── symbol/             # 交易对管理模块
│
├── core/                    # 核心基础设施
│   └── gateway/
│       └── MarketDataHub.ts    # WebSocket 统一订阅层
│
├── domain/                  # 领域模型
│   └── account/            # 账户模型（模拟）
│
├── services/                # 外部服务
│   ├── api/                # REST API 服务
│   │   └── binance.ts          # Binance API 封装
│   └── websocket/          # WebSocket 管理
│       └── manager.ts          # 连接管理器
│
├── workers/                 # Web Workers
│   └── orderbook.worker.ts # 订单簿计算 Worker
│
├── utils/                   # 工具函数
├── types/                   # TypeScript 类型定义
└── styles/                  # 全局样式
```

---

## 🏗️ 核心设计模式

### 1. **统一数据订阅层 (MarketDataHub)**
```typescript
// 单例模式 + 引用计数
marketDataHub.subscribe('kline', 'BTCUSDT', '15m');
marketDataHub.onMessage('kline', handleKlineUpdate);
```

**优势**：
- 避免重复 WebSocket 连接
- 自动管理订阅生命周期
- 支持组合流和单流格式

### 2. **领域驱动设计 (DDD)**
```
domain/account/  → 账户领域模型
features/trade/  → 交易功能模块
```

### 3. **Jotai 原子化状态管理**
```typescript
// 细粒度状态，按需订阅
const symbol = useAtomValue(symbolAtom);
const ticker = useAtomValue(tickerAtom);
```

### 4. **Web Worker 性能优化**
- 订单簿深度计算在 Worker 中执行
- 避免阻塞主线程

---

## 🔧 关键技术实现

### WebSocket 实时数据流

```typescript
// 1. 连接管理
WebSocketManager → 自动重连 + 心跳检测

// 2. 统一订阅
MarketDataHub → 引用计数 + 消息分发

// 3. 数据消费
useKlineData / useOrderBook / useRecentTrades
```

### K 线图表优化

| 优化点 | 实现方式 |
|--------|---------|
| **增量更新** | 只更新最后一根 K 线，避免全量重绘 |
| **历史数据加载** | 滚动到左边缘时自动加载更多 |
| **自动滚动** | 检测用户是否在右边缘，智能开关 autoScroll |
| **防抖节流** | requestAnimationFrame 批量更新 |

### 精度计算

使用 `decimal.js` 避免浮点数精度问题：

```typescript
const total = new Decimal(price).times(quantity);
```

---

## 🌐 数据源

- **REST API**: `https://api.binance.com/api/v3`
- **WebSocket**: `wss://stream.binance.com:9443/ws`

> **注意**：中国大陆用户可能需要代理访问

---

## 🎯 产品定位

| 特性 | 状态 |
|------|------|
| **行情数据** | ✅ 完整（实时 K 线、订单簿、成交） |
| **图表分析** | ✅ 专业级（Lightweight Charts） |
| **交易逻辑** | ⚠️ 模拟（本地状态管理） |
| **用户认证** | ❌ 无（Demo 项目） |
| **资金系统** | ❌ 无（模拟账户） |
| **风控系统** | ❌ 无 |

**适用场景**：
- ✅ 交易策略回测工具
- ✅ 前端技术学习项目
- ✅ UI/UX 设计参考
- ❌ 真实资金交易（需补充 KYC、资金密码、风控等模块）

---

## 📝 开发文档

- [技术规格说明](./docs/trading-page-tech-spec.md)
- [Agent 协作记录](./AGENTS.md)

---

## 🐛 已知问题

### WebSocket 连接问题
- **现象**：中国大陆网络可能无法直接连接 Binance WebSocket
- **解决方案**：
  1. 使用代理（VPN）
  2. 切换到测试网：`wss://testnet.binance.vision/ws`
  3. 配置后端代理转发

### 图表拖动跳回
- **状态**：✅ 已修复（v0.1.0）
- **修复内容**：移除了错误的 `fitContent()` 调用

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用 `memo` 优化性能
- 状态管理优先使用 Jotai

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [Binance API](https://binance-docs.github.io/apidocs/spot/en/)
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)
- [Jotai](https://jotai.org/)

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
