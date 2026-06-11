# 编码规范

## 适用范围

本文件定义 `dev-time` 前端代码规范和行数约束。技术栈、工具链和验证命令以 `tech-stack.md` 为准。

## 基础原则

- 组件、hooks、API client 和 mapper 按职责拆分，避免把页面、数据请求、状态转换和样式细节堆在一个文件。
- 类型定义优先来自 API schema 或生成类型；业务对象不得长期使用 `any` 或松散字典。
- 组件只关心展示和交互，复杂业务规则放到 feature 内的 service、mapper 或 hook。
- UI 状态必须覆盖 loading、empty、error、stale、permission denied 和 success。
- 证据链、AgentArtifact、ActionSuggestion 的关键字段必须显式展示，不能隐藏在未命名 blob 中。

## React 与 TypeScript

- 组件使用函数组件。
- props 使用具名类型，例如 `RiskQueueProps`。
- hooks 以 `use` 开头，并只封装一个稳定职责。
- 对 API 返回值做显式映射，避免后端字段变化直接穿透 UI。
- 条件分支超过 3 个时，拆成具名渲染函数或子组件。
- 禁止在 JSX 中堆叠复杂三元表达式；复杂条件先提取变量。
- 列表渲染必须使用稳定 key，不使用数组 index 表示 GitHub 对象或风险对象。

## 样式与交互

- 视觉 token 使用 CSS variables 或 Tailwind theme 表达。
- 风险色、状态色、Agent Dock 色和文本色不得在组件中随意硬编码。
- 固定格式 UI 元素必须有稳定尺寸约束，避免 hover、loading 或长文本造成布局跳动。
- 右侧 Agent Dock 的输入框必须置底，消息列表只在 dock 内部滚动。
- 动效只用于状态理解，必须尊重 `prefers-reduced-motion`。

## 行数规范

| 对象 | 目标上限 | 硬上限 | 处理方式 |
| --- | --- | --- | --- |
| React 组件文件 | 220 行 | 280 行 | 拆子组件、hooks、mapper 或样式 token |
| 单个组件函数 | 80 行 | 120 行 | 拆 presentational 子组件或提取状态逻辑 |
| hooks 文件 | 120 行 | 180 行 | 按数据请求、交互状态、派生计算拆分 |
| API client 文件 | 180 行 | 260 行 | 按资源拆分，例如 `projects-api.ts` |
| mapper / pure utility | 180 行 | 260 行 | 按输入输出对象拆分 |
| feature index / barrel | 80 行 | 120 行 | 只做导出，不放业务逻辑 |
| 单元测试文件 | 300 行 | 420 行 | 按组件状态或 hook 行为拆分 |
| E2E 测试文件 | 300 行 | 450 行 | 按用户路径拆分 |

超过硬上限时，PR 必须说明为什么暂不拆分，并补一个后续拆分任务。

## 例外

- 生成代码不受行数限制，但必须放在明确目录，并在文件头或目录 README 标记 generated。
- 大型 fixture、snapshot、静态测试数据不受普通行数限制，但必须只被测试引用。
- 临时 demo 文件可以超过行数上限；正式实现迁移时必须按本规范拆分。

## 评审检查

代码评审时优先检查：

- 文件是否表达单一职责。
- 类型是否稳定、可追踪、没有绕过类型系统。
- Agent 和 GitHub 写入边界是否仍由后端控制。
- 长组件是否能通过拆 hooks、mapper 或子组件降低阅读成本。
- UI 状态是否覆盖失败、空态、过期和权限问题。
