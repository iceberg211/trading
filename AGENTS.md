# Repository Guidelines

## 项目结构与模块组织
- `src/` 为主要源码入口，`src/main.tsx` 挂载应用，`src/App.tsx` 组合整体布局。
- `src/components/` 存放通用组件，按 `layout/`、`trading/`、`ui/` 分层。
- `src/features/` 按业务拆分（如 `chart/`、`orderbook/`、`ticker/`、`trade/`、`symbol/`）。
- `src/services/` 聚合 API 与 WebSocket 逻辑；`src/workers/` 放置 Web Worker。
- `src/hooks/`、`src/types/`、`src/styles/` 分别管理通用 Hook、类型与全局样式。
- 规范与需求文档在 `docs/trading-page-tech-spec.md`。

## 构建、测试与开发命令
- `pnpm install`：安装依赖。
- `pnpm dev`：启动 Vite 开发服务器。
- `pnpm build`：先 `tsc` 再执行 Vite 产物构建。
- `pnpm preview`：本地预览构建产物。
- `pnpm lint`：运行 ESLint 进行静态检查。

## 编码风格与命名规范
- 使用 TypeScript + React 函数组件；组件文件采用 `PascalCase.tsx`。
- 目录命名小写；Hook 以 `useXxx` 命名并置于 `src/hooks/`。
- 代码风格与现有文件保持一致：2 空格缩进、单引号、语句末尾分号。
- 样式采用 Tailwind CSS，新增类名尽量复用既有设计变量与布局模式。

## 测试指南
- 当前未配置测试框架与测试脚本；如新增测试，建议使用 `*.test.ts(x)` 命名并与源码同目录或置于 `__tests__/`。
- 提交前至少运行 `pnpm lint`，确保基础静态检查通过。

## 提交与合并请求规范
- 提交信息遵循 Conventional Commits 风格，如 `feat:`、`fix:`、`chore:`，描述可使用中文。
- PR 需说明变更范围、关联问题或需求；涉及 UI 的改动请附截图或录屏，并注明自测步骤。
