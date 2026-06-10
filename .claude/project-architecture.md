# 项目架构

## 项目定位

`dev-time`：Dev Time 的前端应用。Dev Time 是面向个人开发者和 2-5 人小团队的 GitHub 项目风险驾驶舱，用于把 GitHub 中的项目活动、交付节奏、阻塞信号、代码健康和计划偏差转成可解释的风险态势。

本文件用于记录当前仓库边界、目录职责、关键架构决策和后续扩展原则。跨前后端的产品定位、MVP、风险模型、Agent 场景和总体技术架构，以 `product-prd.md` 和 `technical-architecture.md` 为准。

## 跨项目基础文档

以下文档属于 Dev Time 产品级基础文档，必须在 `dev-time` 和 `dev-time-server` 两个仓库中保持同源更新：

- `product-prd.md`：产品定位、目标用户、MVP、风险模型、Agent 场景、信息架构和视觉方向。
- `technical-architecture.md`：GitHub 集成、事件存储、项目模型、风险引擎、Agent Runtime、LLM Gateway、通知层、API 边界和 SVG 架构图。

当变更影响产品定位、风险模型、Agent 落地场景、GitHub 数据边界、跨端技术架构或安全原则时，必须同步更新两个仓库的对应文档。仅影响前端实现细节、页面组件、样式组织或本仓库工具链时，只更新本仓库相关文档。

## 当前仓库职责

`dev-time` 负责前端体验：

- 风险驾驶舱。
- 项目风险详情。
- Agent Insight 面板。
- GitHub 连接和 repository 导入流程的用户界面。
- LLM Provider 配置界面。
- ActionSuggestion 的用户确认交互。
- Futuristic Risk Console 视觉系统落地。

前端不得保存 GitHub token 或 LLM API Key 明文；涉及密钥、GitHub 写入和 Agent 执行的能力必须通过 `dev-time-server` 提供的后端 API 完成。

## 当前目录结构

请在项目初始化后补充真实目录结构。

```text
.
├── AGENTS.md
└── .claude/
    ├── README.md
    ├── product-prd.md
    ├── technical-architecture.md
    ├── project-architecture.md
    ├── skill-authoring.md
    ├── bug-fix-log.md
    ├── git-collaboration.md
    └── tech-stack.md
```

## 目录职责

### `AGENTS.md`

Agent 入口文件。用于说明项目目标、协作原则和关键文档索引。任何 Agent 开始工作前都应先阅读该文件。

### `.claude/`

项目长期上下文目录。这里保存架构、规范、协作流程和故障记录，避免重要信息散落在对话或临时笔记中。

### `.claude/product-prd.md`

Dev Time 产品级 PRD。定义产品定位、MVP 范围、风险模型、Agent 场景和视觉方向。

### `.claude/technical-architecture.md`

Dev Time 跨端技术架构。定义 GitHub 事实源、事件流、风险引擎、Agent Runtime、LLM Gateway、通知层和 API 边界。

### `.agents/skills/`

可选的项目级 Agent Skills 目录。只有在项目明确需要可复用 Agent 工作流时才创建。新增 skill 时，应同步说明触发条件、输入输出、验证方式和安全边界。

## 架构原则

- 让目录结构表达职责边界。
- 优先遵循项目已有模式，不为了新功能随意引入新风格。
- 共享逻辑需要有清晰调用边界和验证方式。
- 外部服务、账号、密钥、网络访问和数据写入必须明确安全边界。
- 项目级 skills 应保持触发条件明确，避免把泛用提示词或个人偏好写成长期能力。
- 前端优先呈现风险、证据和行动建议，不引入独立于 GitHub 的项目事实源。
- Agent 相关交互必须能展示证据链和用户确认状态。
- 架构变更必须同步更新本文件。

## 架构变更记录

| 日期 | 变更 | 原因 | 验证 |
| --- | --- | --- | --- |
| 2026-06-10 | 初始化 Agent 项目文档 | 建立项目长期上下文和协作基线 | 已创建 `AGENTS.md` 与 `.claude` 文档 |
| 2026-06-10 | 补充 Dev Time 产品 PRD 和技术架构基线 | 明确 GitHub 风险驾驶舱、风险模型和 Agent 落地场景 | 已新增 `product-prd.md` 与 `technical-architecture.md` |
