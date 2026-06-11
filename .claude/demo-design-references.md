# Demo 设计参考

本文件记录 `demo/index.html` 的视觉参考来源和落地决策。该文档只服务于 `dev-time` 前端 demo，不属于跨前后端基础架构文档。

## 参考来源

### Modern Task Management Dashboard UI

链接：https://dribbble.com/shots/27015972-Modern-Task-Management-Dashboard-UI-SaaS-Productivity-Platform

可借鉴点：

- 清晰的 dashboard 主次结构。
- 高对比品牌蓝作为主要行动色。
- 卡片化布局服务于快速扫描，而不是装饰。
- 工作台需要让用户快速判断优先级。

落地方式：

- demo 使用强品牌蓝作为主 CTA 和 active 状态。
- 首屏保留一个主要风险判断，不堆多个同级模块。
- 风险列表使用 inbox 形态，强调需要处理的项目。

### Stratify - AI Project Management Dashboard

链接：https://dribbble.com/shots/26281371-Stratify-AI-Project-Management-Dashboard-Design

可借鉴点：

- AI 能力以辅助面板和建议动作出现，而不是空白聊天框。
- 模块化 widgets 组织任务、会议、文件、建议等上下文。
- 界面强调 clear and actionable，而不是炫技。

落地方式：

- demo 的 `Risk Copilot` 卡片只展示当前项目的解释和下一步。
- Agent 输出以行动草稿呈现，用户确认后才进入下一步。
- 详情区使用 `Why / Evidence / Action` tabs 逐步展开，避免首屏过载。

### TaskFlow - Task Management Dashboard

链接：https://dribbble.com/shots/27102120-TaskFlow-Task-Management-Dashboard-SaaS-Web-App

可借鉴点：

- 面向任务管理的结构化界面。
- 优先级、状态、截止时间和进度需要清晰可扫。
- 卡片圆角、留白和柔和背景能降低管理工具的压迫感。

落地方式：

- demo 使用浅紫灰背景和大圆角卡片。
- 风险卡片展示状态标签、原因摘要和关键 tags。
- 项目详情中保留风险分，但不让分数压过下一步行动。

### AI Project Management Dashboard Design

链接：https://dribbble.com/shots/27210322-AI-Project-Management-Dashboard-Design

可借鉴点：

- AI 项目管理界面可以结合 task tracking、team insights、progress analytics 和 smart assistant。
- 浅色背景、紫色系辅助色和深色重点卡片适合表达 AI 产品感。
- 智能助手应该帮助决策，而不是成为页面的唯一主体。

落地方式：

- demo 最终转向暖纸面背景、强黑描边、酸性绿色 Agent dock、品牌蓝主行动和珊瑚风险色。
- Agent 不作为卡片附属模块，而是右侧常驻工作区；用户始终可以在当前风险上下文里追问和确认行动。
- 页面核心是三栏工作台：左侧风险队列，中间风险详情，右侧 Agent 对话和运行状态。

## 当前 demo 设计决策

当前 `demo/index.html` 是 Dev Time 正式产品 UI 和核心交互的定稿基线。后续 React / 产品化实现必须沿用该 demo 的左中右三栏工作台、右侧常驻 Agent dock、EvidenceBundle / AgentArtifact / ActionSuggestion 闭环和视觉语言；除非产品决策明确变更，否则不得退回普通卡片看板、顶部 tab 管理后台或独立聊天页。

- 布局：左侧窄导航 + 左中右三栏主工作台。左栏是 `风险队列`，中栏是 `今日风险指挥台` 和 `风险详情`，右栏是常驻 `Agent Runtime / Agent 对话`。
- 信息架构：`风险队列 -> 当前风险详情 -> EvidenceBundle / AgentArtifact / ActionSuggestion -> Agent 对话确认`。
- 配色：暖纸面背景、强黑描边、品牌蓝主行动、酸性绿色表达 Agent Runtime、珊瑚色表达风险、黄色表达提醒和待确认。
- 字体：`Noto Sans SC` 强化中文标题层级，`IBM Plex Sans` 服务 UI 数字和技术标签。
- 插图：首屏使用自绘三服务流程图，表达 `GitHub -> dev-time-server -> dev-time-agent -> 用户确认` 的产品边界。
- 动效：流程 beam、扫描器和 pipeline 状态用于表达 Agent 正在读取证据、构建 EvidenceBundle、运行 workflow、生成草稿。
- Agent 交互：Agent 不是单一运行按钮，也不是无上下文聊天框；它是当前风险上下文里的对话侧栏。用户可以问风险原因、证据可靠性、下一步行动，Agent 回答必须基于当前 EvidenceBundle、AgentArtifact 和 ActionSuggestion。
- Agent dock：桌面端右侧 Agent 区域固定在视口内，顶部运行状态固定，中间消息列表内部滚动，底部输入框永远置底，不跟随中间项目内容滚动。
- 交互：筛选风险、切换项目、切换详情 tabs、运行 AgentJob、和 Agent 对话、聚焦证据、确认 ActionSuggestion 草稿。
- 约束：Agent 只生成草稿；用户确认后由 `dev-time-server` 校验权限并执行 GitHub 写入，MVP 不自动写入 GitHub。

## 后续改进方向

- 若进入正式 React 实现，应把 demo 拆为 `RiskCommandHero`、`AgentRuntimePanel`、`AgentConversationPanel`、`RiskQueue`、`SelectedRiskDetail`、`EvidenceBundlePanel`、`AgentArtifactPanel`、`ActionSuggestionDraft`。
- 需要确认中文字体加载策略，避免外部字体无法访问时中文标题层级变弱。
- 可引入真实 GitHub 图标和 lucide 图标库，但图标必须服务于状态、工具或操作，不堆装饰性图标。
