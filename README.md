# Trading App

现代化的加密货币交易页面（行情展示），基于 React 18.2 + Jotai + Lightweight Charts。

## 技术栈

- **框架**: React 18.2
- **状态管理**: Jotai
- **构建工具**: Vite
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **K线图表**: Lightweight Charts
- **包管理器**: pnpm

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 项目结构

```
src/
├── components/          # 通用 UI 组件
├── features/
│   └── chart/           # K 线图模块
│       ├── components/
│       ├── atoms/
│       ├── hooks/
│       └── services/
├── services/            # 全局服务
│   ├── api/
│   └── websocket/
├── atoms/               # 全局 Jotai atoms
├── hooks/               # 全局 hooks
├── utils/               # 工具函数
├── types/               # TypeScript 类型
└── styles/              # 全局样式
```

## 开发文档

详见 [`docs/trading-page-tech-spec.md`](./docs/trading-page-tech-spec.md)
