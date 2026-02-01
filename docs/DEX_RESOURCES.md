# 知名 DEX 项目学习指南

以下是目前 Web3 领域最著名、最具学习价值的去中心化交易所（DEX）项目。它们代表了不同的技术流派和创新方向。

## 1. AMM 鼻祖与标杆：Uniswap

*   **类型**: 自动做市商 (AMM)
*   **适用场景**: 现货交易 (Spot)
*   **为什么值得学**:
    *   **Uniswap V2**: 代码极其精简，是学习 AMM 机制的**最佳入门教材**。核心是 `x * y = k` 公式。
    *   **Uniswap V3**: 引入了**集中流动性 (Concentrated Liquidity)**，技术复杂度大幅提升，涉及 NFT 作为 LP Token、由 Tick 组成的区间管理。
    *   **Uniswap V4**: 引入了 **Hooks** 架构，允许开发者在交易生命周期的各个阶段插入自定义逻辑（类似中间件），是未来的趋势。
*   **资源**:
    *   [Uniswap V2 Core 代码](https://github.com/Uniswap/v2-core) (Solidity)
    *   [Uniswap Interface (前端)](https://github.com/Uniswap/interface) (React + Redux/GraphQL)

## 2. 稳定币兑换之王：Curve Finance

*   **类型**: 混合 AMM (StableSwap)
*   **适用场景**: 稳定币互换 (USDT/USDC/DAI) 或 挂钩资产 (ETH/stETH)
*   **为什么值得学**:
    *   它的数学公式不仅是恒定乘积，还结合了恒定和公式，从而实现**极低的滑点**。
    *   学习它的 **VeToken 模型 (veCRV)**：一种极其成功的代币经济学模型（锁定代币以获得治理权和收益权）。

## 3. 链上订单簿代表：dYdX (v3/v4) & Hyperliquid

*   **类型**: 订单簿 (CLOB - Central Limit Order Book)
*   **适用场景**: 衍生品/永续合约 (Perpetuals)
*   **为什么值得学**:
    *   它们不仅是前端 DApp，甚至为了高性能交易**专门开发了一条链** (App-Chain)。
    *   **dYdX v4**: 基于 Cosmos SDK 开发，完全去中心化的订单簿。
    *   **Hyperliquid**: 目前 Solana/EVM 生态外非常火的独立高性能链，体验极其接近 CEX。
*   **学习点**: 如何在去中心化环境下解决高频撮合的性能瓶颈。

## 4. 聚合器 (Aggregator)：Jupiter & 1inch

*   **类型**: 交易路由聚合器
*   **适用场景**: 寻找全网最优价格
*   **为什么值得学**:
    *   **前端交互**: 它们的前端通常不仅是一个简单的 Swap，还包含了复杂的路由路径可视化。
    *   **Jupiter (Solana)**: 用户体验极佳，UI/UX 设计非常出色，响应速度极快，是前端工程化的典范。

## 5. 综合性 DeFi 平台：AAVE (借贷)

*   虽然不是 DEX，但通常与 DEX 结合学习。
*   **闪电贷 (Flash Loan)**: 允许在一个区块内借出巨额资金，只要在同一个区块内还清。这是 DeFi 独有的原子性操作，常用于 DEX 之间的套利。

---

## 学习建议路线

1.  **入门**: 阅读 **Uniswap V2 白皮书**，理解 Constant Product Market Maker (CPMM)。
2.  **代码**: Clone **Uniswap V2 Core** 代码，通读一遍（代码量很少）。
3.  **进阶**: 玩一下 **Uniswap V3** 的前端，体验一下添加流动性时如何设置价格区间。
4.  **实战**: 尝试在测试网（Sepolia）部署一个简单的 Swap 合约，并用 React 前端成功调用一次。
