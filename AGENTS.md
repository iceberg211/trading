# Repository Guidelines

## 项目结构与模块组织
- `src/` 为应用源码，入口为 `src/main.tsx` 与 `src/App.tsx`。
- `src/components/` 存放通用与布局组件，按 `layout/`、`trading/`、`ui/` 分层。
- `src/features/` 按业务域拆分（`chart/`、`orderbook/`、`orders/`、`symbol/`、`ticker/`、`trade/`），通常包含 `atoms/`、`components/`、`hooks/`。
- `src/services/` 管理数据访问（`api/`、`websocket/`），`src/types/` 维护类型定义，`src/styles/globals.css` 为全局样式。
- 根目录包含 `index.html`、`vite.config.ts`、`tailwind.config.js`、`postcss.config.js`，规范文档在 `docs/trading-page-tech-spec.md`。

## 构建、测试与开发命令
- `pnpm install`：安装依赖（项目默认包管理器为 pnpm）。
- `pnpm dev`：启动 Vite 开发服务器。
- `pnpm build`：先运行 `tsc` 再执行 Vite 打包。
- `pnpm preview`：本地预览生产构建。
- `pnpm lint`：运行 ESLint 静态检查。

## 编码风格与命名规范
- 使用 TypeScript + React 18，组件为函数式写法。
- 代码风格与现有文件一致：2 空格缩进、单引号、语句末尾分号。
- 组件文件使用 `PascalCase.tsx`，Hooks 使用 `useXxx` 命名；业务内状态建议放在对应 `features/*/atoms/`。
- 支持路径别名 `@/` 指向 `src/`，优先使用别名保持导入清晰。
- 复杂业务逻辑尽量下沉到 hooks 或 services，组件保持单一职责与可读性。

## 开发与配置提示
- 本地开发端口为 `3000`（见 `vite.config.ts`）。
- REST 请求建议走 `/api` 前缀，已代理到 `https://data-api.binance.vision`，避免 CORS。
- 新增数据源时优先复用 `src/services/` 的 API/WS 封装与 `src/types/` 类型。

## 测试指南
- 当前未配置 `test` 脚本或测试框架。
- 如需新增测试，建议使用 `*.test.tsx`/`*.test.ts` 或 `__tests__/` 目录，并补充 `pnpm test` 脚本与文档说明。

## 提交与 Pull Request 指南
- 历史提交信息中中英混用，部分使用 `feat:` 前缀；保持简洁、描述清楚即可，必要时添加 `fix:`/`chore:`。
- PR 请包含变更说明、关键路径影响（如行情/WS 逻辑），UI 改动附截图或录屏，并注明自测步骤或关联 Issue。

## 安全与范围说明
- 本项目定位为行情展示页，不涉及真实下单；不要在前端加入 API Key、签名或资产相关逻辑。

## Agent 指引
- 默认使用中文回复，除非明确要求英文。
