import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
})

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response
}
