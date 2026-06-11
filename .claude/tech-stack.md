# 技术栈与技术规范

## 当前决策

`dev-time` 是 Dev Time 的前端 Web App，负责风险工作台、Agent Dock、证据链展示和用户确认交互。

前端技术栈定稿如下：

| 类别 | 选型 | 说明 |
| --- | --- | --- |
| 构建工具 | Vite | 轻量、启动快，适合 React SPA 和后续静态部署 |
| UI 框架 | React | 承载三栏风险工作台、Agent Dock 和状态化交互 |
| 语言 | TypeScript | 前端数据契约需要和后端 API / AgentArtifact 对齐 |
| 包管理器 | pnpm | 工作区和锁文件稳定，适合后续多包前端结构 |
| API 状态 | TanStack Query | 管理 server state、缓存、刷新、mutation 和错误状态 |
| 路由 | TanStack Router 或 React Router | 项目初始化时二选一；若需要强类型路由，优先 TanStack Router |
| 样式 | Tailwind CSS + CSS variables | 快速落地 demo 视觉系统，同时保留主题 token |
| 单元测试 | Vitest + Testing Library | 与 Vite 配套，覆盖组件、hooks 和纯逻辑 |
| E2E | Playwright | 验证三栏布局、Agent Dock、状态流和响应式表现 |
| 图标 | lucide-react | 工具按钮和语义图标优先使用现成图标 |

## 技术规范来源

技术栈规范优先以官方文档为准：

- Vite Guide：https://vite.dev/guide/
- React TypeScript：https://react.dev/learn/typescript
- TypeScript Documentation：https://www.typescriptlang.org/docs/
- TanStack Query React Docs：https://tanstack.com/query/latest/docs/framework/react/overview
- Vitest Guide：https://vitest.dev/guide/
- Playwright：https://playwright.dev/

## 前端架构规范

- 前端只保存展示状态、表单草稿和短期 UI 状态，不保存 GitHub token、LLM API Key 或 installation token。
- API 请求必须经过统一 client 层，组件不得散落裸 `fetch`。
- server state 使用 TanStack Query；局部展开、筛选、选中项等 UI state 使用 React state。
- 类型优先来自 API schema 或共享生成类型；禁止为了绕过错误随意使用 `any`。
- 风险、证据、AgentArtifact、ActionSuggestion 等核心对象必须保留明确类型，不使用松散字典穿透组件树。
- Agent Dock 是当前项目风险上下文入口，不做无上下文通用聊天页。
- 所有 GitHub 写入类动作只展示草稿和确认状态，实际执行由 `dev-time-server` 完成。
- 动效必须尊重 `prefers-reduced-motion`。

## 目录建议

项目初始化后建议采用以下结构：

```text
src/
├── app/
│   ├── router/
│   └── providers/
├── features/
│   ├── risk-workspace/
│   ├── agent-dock/
│   ├── evidence-bundle/
│   ├── action-suggestions/
│   └── settings/
├── shared/
│   ├── api/
│   ├── components/
│   ├── icons/
│   ├── lib/
│   └── styles/
└── test/
```

## 代码规范

- TypeScript 开启严格模式。
- React 组件使用函数组件和 hooks。
- 组件 props 必须定义显式类型。
- 复杂条件渲染拆成具名子组件或具名变量。
- 业务组件不得直接拼接 API URL；统一从 `shared/api` 调用。
- 共享组件保持无业务依赖；业务组件放入对应 `features`。
- 对用户可见状态必须覆盖 loading、empty、error、stale 和 permission denied。
- CSS token 使用 CSS variables 表达，避免把颜色值散落在组件里。
- UI 文案中文为主，API 字段、GitHub 对象名、状态枚举保留英文原文。

## 行数规范

详见 `coding-standards.md`。核心约束：

- 普通 React 组件文件目标不超过 220 行，超过 280 行必须拆分或在 PR 中说明原因。
- 单个组件函数目标不超过 80 行。
- hooks 文件目标不超过 120 行。
- API client、mapper、纯工具文件目标不超过 180 行。
- 测试文件目标不超过 300 行；大型 E2E 流程应按用户路径拆分。

## 脚本规范

项目初始化后建议提供：

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
```

脚本必须可从仓库根目录运行。

## 依赖规范

新增依赖前需要说明：

- 依赖解决什么问题。
- 是否已有项目内工具、系统工具或标准库可替代。
- 是否会增加安装、运行或维护成本。
- 是否需要网络、账号或密钥。

## 安全规范

- 不提交 `.env`、密钥、令牌、Cookie、账号凭据。
- 示例配置使用 `.env.example` 或文档片段，不使用真实值。
- 前端不得记录或展示 LLM API Key 明文。
- 前端不得缓存 GitHub installation token。
- 涉及 GitHub 写入的按钮必须展示目标对象、草稿正文、权限要求和确认状态。

## 验证规范

当前仓库尚未初始化前端工程。初始化后最小验证命令为：

```bash
pnpm lint
pnpm test
pnpm build
```

涉及布局、Agent Dock、ActionSuggestion 确认和响应式行为时，必须补充：

```bash
pnpm test:e2e
```
