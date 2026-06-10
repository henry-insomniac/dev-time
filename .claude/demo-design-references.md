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

- demo 使用浅紫灰背景、深色 Copilot 卡片、紫色和薄荷色点缀。
- Copilot 不再固定为三栏右侧大面板，而是作为 bento 卡片和 action tab 出现。
- 页面核心仍是 risk inbox 和 selected risk。

## 当前 demo 设计决策

- 布局：bento dashboard，首屏是 `Top risk today` + `Risk Copilot`。
- 信息架构：`Top risk -> Risk inbox -> Selected project -> Why / Evidence / Action`。
- 配色：浅紫灰底、品牌蓝主行动、珊瑚风险色、薄荷绿和黄色点缀。
- 字体：`Space Grotesk` 用于大标题和数字，`Manrope` 用于 UI 文案。
- 交互：筛选风险、切换项目、切换详情 tabs、运行 Agent、确认草稿。
- 约束：Agent 只生成草稿，MVP 不自动写入 GitHub。

## 后续改进方向

- 若进入正式 React 实现，应把 demo 拆为 `TopRiskCard`、`RiskInbox`、`SelectedRiskDetail`、`RiskCopilot`、`EvidenceList`、`ActionDraft`。
- 需要确认中文字体加载策略，避免外部字体无法访问时中文标题层级变弱。
- 可增加真实 GitHub 图标和语义风险图标，但不要堆装饰性图标。
