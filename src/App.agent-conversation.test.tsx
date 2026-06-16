import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AgentConversationList } from './AgentConversationList'
import { App } from './App'

describe('Dev Time Agent conversation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('发送 Agent 对话消息并展示可折叠思考过程', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return jsonResponse({
          projects: [
            {
              id: 'project_server',
              name: 'dev-time-server',
              risk_score: 82,
              risk_level: 'high',
            },
          ],
        })
      }
      if (url.endsWith('/api/projects/project_server/action-suggestions')) {
        return jsonResponse({ action_suggestions: [] })
      }
      if (url.endsWith('/api/projects/project_server/agent-runs')) {
        return jsonResponse({ agent_runs: [] })
      }
      if (url.endsWith('/api/projects/project_server/risk')) {
        return jsonResponse({
          assessment: {
            id: 'risk_123',
            project_id: 'project_server',
            score: 82,
            level: 'high',
            trend: 'up',
          },
          signals: [],
        })
      }
      if (
        url.endsWith(
          '/api/projects/project_server/agent-conversation?risk_assessment_id=risk_123',
        )
      ) {
        return jsonResponse({
          id: 'conversation_project_server',
          project_id: 'project_server',
          latest_risk_assessment_id: 'risk_123',
          status: 'active',
        })
      }
      if (
        url.endsWith('/api/agent-conversations/conversation_project_server/turns') &&
        init?.method === 'POST'
      ) {
        expect(JSON.parse(String(init.body))).toEqual({
          message: '为什么是高风险？',
          risk_assessment_id: 'risk_123',
        })
        return jsonResponse({
          id: 'turn_123',
          conversation_id: 'conversation_project_server',
          user_message: '为什么是高风险？',
          agent_response: '因为 go test 持续失败并阻塞交付。',
          evidence_refs: ['event_check-run-123'],
          intent: 'risk_explain',
          trace_events: [
            {
              id: 'trace_turn_123',
              conversation_id: 'conversation_project_server',
              turn_id: 'turn_123',
              event_type: 'intent_routed',
              title: '完成意图识别',
              body: 'Agent 已根据用户输入选择处理路径。',
              intent: 'risk_explain',
              evidence_refs: ['event_check-run-123'],
            },
          ],
          reasoning_trace: [
            {
              stage: 'planning',
              title: '识别用户意图',
              summary: '用户要求解释当前高风险原因。',
              status: 'completed',
              confidence: 0.92,
              evidence_refs: [],
              tool_call: null,
            },
            {
              stage: 'tool_call',
              title: '读取风险证据',
              summary: '调用 risk_evidence.read 获取当前风险证据。',
              status: 'completed',
              confidence: null,
              evidence_refs: ['event_check-run-123'],
              tool_call: {
                name: 'risk_evidence.read',
                status: 'succeeded',
              },
            },
          ],
        })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText(/当前项目：dev-time-server/i)
    fireEvent.change(screen.getByLabelText(/询问 Agent/i), {
      target: { value: '为什么是高风险？' },
    })
    fireEvent.click(screen.getByRole('button', { name: /发送/i }))

    expect(
      await screen.findByText(/因为 go test 持续失败并阻塞交付。/i),
    ).toBeInTheDocument()
    expect(
      within(screen.getByLabelText(/Agent 对话记录/i)).getByText('Agent'),
    ).toBeInTheDocument()
    expect(screen.getByText('event_check-run-123')).toBeInTheDocument()
    expect(screen.getByText(/意图：风险解释/i)).toBeInTheDocument()
    expect(screen.queryByText(/Trace：完成意图识别/i)).not.toBeInTheDocument()
    const reasoningToggle = screen.getByRole('button', {
      name: /思考过程 · 2 步/i,
    })
    expect(reasoningToggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/用户要求解释当前高风险原因/i)).not.toBeInTheDocument()

    fireEvent.click(reasoningToggle)

    expect(reasoningToggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/用户要求解释当前高风险原因/i)).toBeInTheDocument()
    expect(screen.getByText(/调用 risk_evidence.read/i)).toBeInTheDocument()
    expect(
      screen
        .getByLabelText(/行动建议/i)
        .compareDocumentPosition(screen.getByLabelText(/Agent 对话记录/i)) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('Agent 生成待确认行动草稿后刷新行动建议', async () => {
    let actionSuggestionLoads = 0
    const draftBody = 'go test 失败阻塞交付，请先修复后再继续合并。'
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return jsonResponse({
          projects: [
            {
              id: 'project_server',
              name: 'dev-time-server',
              risk_score: 82,
              risk_level: 'high',
            },
          ],
        })
      }
      if (url.endsWith('/api/projects/project_server/action-suggestions')) {
        actionSuggestionLoads += 1
        return jsonResponse({
          action_suggestions:
            actionSuggestionLoads === 1
              ? []
              : [
                  {
                    id: 'action_tool_123',
                    project_id: 'project_server',
                    action_type: 'pr_comment',
                    status: 'pending_user_confirmation',
                    target_ref: 'pull_request:18',
                    draft_body: draftBody,
                    evidence_refs: ['event_check-run-123'],
                  },
                ],
        })
      }
      if (url.endsWith('/api/projects/project_server/agent-runs')) {
        return jsonResponse({ agent_runs: [] })
      }
      if (url.endsWith('/api/projects/project_server/risk')) {
        return jsonResponse({
          assessment: {
            id: 'risk_123',
            project_id: 'project_server',
            score: 82,
            level: 'high',
            trend: 'up',
          },
          signals: [],
        })
      }
      if (
        url.endsWith(
          '/api/projects/project_server/agent-conversation?risk_assessment_id=risk_123',
        )
      ) {
        return jsonResponse({
          id: 'conversation_project_server',
          project_id: 'project_server',
          latest_risk_assessment_id: 'risk_123',
          status: 'active',
        })
      }
      if (
        url.endsWith('/api/agent-conversations/conversation_project_server/turns') &&
        init?.method === 'POST'
      ) {
        return jsonResponse({
          id: 'turn_approval_123',
          conversation_id: 'conversation_project_server',
          user_message: '生成 PR 评论草稿',
          agent_response: '已生成 PR 评论草稿，请确认后发布。',
          evidence_refs: ['event_check-run-123'],
          intent: 'draft_pr_comment',
          trace_events: [],
          reasoning_trace: [],
          tool_calls: [
            {
              name: 'action_suggestion.create',
              status: 'succeeded',
              evidence_refs: ['event_check-run-123'],
            },
          ],
          approval_request: {
            status: 'pending',
            reason: 'LLM 生成了需要用户确认的写操作。',
            actions: [
              {
                action_suggestion_id: 'action_tool_123',
                action_type: 'pr_comment',
                target_ref: 'pull_request:18',
                draft_body: draftBody,
                evidence_refs: ['event_check-run-123'],
                required_permission: 'pull_request:write',
              },
            ],
          },
        })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findByText(/当前项目：dev-time-server/i)
    fireEvent.change(screen.getByLabelText(/询问 Agent/i), {
      target: { value: '生成 PR 评论草稿' },
    })
    fireEvent.click(screen.getByRole('button', { name: /发送/i }))

    expect(await screen.findByText(/已生成 PR 评论草稿/i)).toBeInTheDocument()
    expect(screen.getByText(/待确认行动/i)).toBeInTheDocument()
    expect(screen.getByText(/action_suggestion.create/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(actionSuggestionLoads).toBeGreaterThanOrEqual(2)
    })
    expect(screen.getAllByText(draftBody).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: /确认执行/i })).toBeInTheDocument()
  })

  it('1.0 工作台展示仓库选择、快捷指令、PR 诊断卡片、Trace 实体和 Markdown', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return jsonResponse({
          projects: [
            {
              id: 'project_agent',
              name: 'dev-time-agent',
              risk_score: 70,
              risk_level: 'high',
            },
            {
              id: 'project_web',
              name: 'dev-time',
              risk_score: 0,
              risk_level: 'stable',
            },
          ],
        })
      }
      if (url.includes('/action-suggestions')) {
        return jsonResponse({ action_suggestions: [] })
      }
      if (url.includes('/agent-runs')) {
        return jsonResponse({ agent_runs: [] })
      }
      if (url.endsWith('/api/projects/project_agent/risk')) {
        return jsonResponse({
          assessment: {
            id: 'risk_agent',
            project_id: 'project_agent',
            score: 70,
            level: 'high',
            trend: 'up',
          },
          signals: [
            {
              id: 'signal_agent',
              project_id: 'project_agent',
              category: 'ci',
              severity: 80,
              reason: 'ESLint 失败阻塞 PR。',
              evidence_refs: ['github_live_check_run_812_logs'],
            },
          ],
        })
      }
      if (
        url.endsWith(
          '/api/projects/project_agent/agent-conversation?risk_assessment_id=risk_agent',
        )
      ) {
        return jsonResponse({
          id: 'conversation_project_agent',
          project_id: 'project_agent',
          latest_risk_assessment_id: 'risk_agent',
          status: 'active',
        })
      }
      if (
        url.endsWith('/api/agent-conversations/conversation_project_agent/turns') &&
        init?.method === 'POST'
      ) {
        return jsonResponse({
          id: 'turn_smoke',
          conversation_id: 'conversation_project_agent',
          user_message: '帮我看看 #12 PR 为什么红了？',
          agent_response:
            'CI 失败是因为 ESLint 报了 3 个 no-unused-vars 错误。\n\n```ts\nconst draftPlan = 1\n```\n\nNext Step：检查 src/planner.ts 第 45 行。',
          evidence_refs: ['github_live_check_run_812_logs'],
          intent: 'github_pr_ci_diagnosis',
          domain: 'github',
          entities: {
            repository: {
              id: 'repo_1002',
              name: 'dev-time-agent',
              full_name: 'henry-insomniac/dev-time-agent',
            },
            pr_number: 12,
            run_id: 812,
          },
          capabilities: ['github.checks.logs'],
          trace_events: [],
          reasoning_trace: [
            {
              stage: 'tool_call',
              title: '读取失败 Check 日志',
              summary: '命中 github.checks.logs。',
              status: 'completed',
              confidence: null,
              evidence_refs: ['github_live_check_run_812_logs'],
              tool_call: {
                name: 'github.checks.logs',
                status: 'succeeded',
              },
            },
          ],
          tool_calls: [
            {
              name: 'github.checks.logs',
              status: 'succeeded',
              evidence_refs: ['github_live_check_run_812_logs'],
            },
          ],
        })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByLabelText(/选择仓库/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /分析当前仓库最新 CI 失败原因/i }),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/询问 Agent/i), {
      target: { value: '帮我看看 #12 PR 为什么红了？' },
    })
    fireEvent.click(screen.getByRole('button', { name: /发送/i }))

    expect(await screen.findByText(/CI 失败是因为 ESLint/i)).toBeInTheDocument()
    expect(screen.getByText(/PR #12/i)).toBeInTheDocument()
    expect(
      within(screen.getByLabelText(/PR #12 状态/i)).getByText(/失败/),
    ).toBeInTheDocument()
    expect(screen.getByText(/github.checks.logs/i)).toBeInTheDocument()
    expect(screen.getByText(/pr_number/i)).toBeInTheDocument()
    expect(screen.getByText(/const draftPlan = 1/i).tagName).toBe('CODE')
  })

  it('命中 Issue 能力时渲染独立 Issue 状态卡片', () => {
    render(
      <AgentConversationList
        turns={[
          {
            id: 'turn_issue',
            conversation_id: 'conversation_project_agent',
            user_message: '看看 #34 issue',
            agent_response: 'Issue #34 已关闭，根因已经修复。',
            evidence_refs: [],
            intent: 'github_issues_list',
            domain: 'github',
            entities: {
              issue_number: 34,
              issue: {
                url: 'https://github.test/henry-insomniac/dev-time/issues/34',
              },
            },
            capabilities: ['github.issues.list'],
            trace_events: [],
            reasoning_trace: [],
            tool_calls: [
              {
                name: 'github.issues.list',
                status: 'succeeded',
              },
            ],
            approval_request: null,
          },
        ]}
      />,
    )

    const issueStatusCard = screen.getByLabelText(/Issue #34 状态/i)
    expect(within(issueStatusCard).getByText(/Issue #34/i)).toBeInTheDocument()
    expect(
      within(issueStatusCard).getByText(/已关闭/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /打开 Issue/i })).toHaveAttribute(
      'href',
      'https://github.test/henry-insomniac/dev-time/issues/34',
    )
  })

  it('展示 GitHub OAuth 用户头像和基本信息', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/auth/session')) {
        return jsonResponse({
          connected: true,
          user: {
            login: 'octocat',
            name: 'The Octocat',
            avatar_url: 'https://github.test/avatar.png',
            html_url: 'https://github.test/octocat',
          },
        })
      }
      if (url.endsWith('/api/projects')) {
        return jsonResponse({
          projects: [
            {
              id: 'project_agent',
              name: 'dev-time-agent',
              risk_score: 70,
              risk_level: 'high',
            },
          ],
        })
      }
      if (url.includes('/action-suggestions')) {
        return jsonResponse({ action_suggestions: [] })
      }
      if (url.includes('/agent-runs')) {
        return jsonResponse({ agent_runs: [] })
      }
      if (url.endsWith('/api/projects/project_agent/risk')) {
        return jsonResponse({
          assessment: {
            id: 'risk_agent',
            project_id: 'project_agent',
            score: 70,
            level: 'high',
            trend: 'up',
          },
          signals: [],
        })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText(/The Octocat/i)).toBeInTheDocument()
    expect(screen.getByText(/@octocat/i)).toBeInTheDocument()
    expect(screen.getByAltText(/The Octocat GitHub 头像/i)).toHaveAttribute(
      'src',
      'https://github.test/avatar.png',
    )
  })
})

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response
}
