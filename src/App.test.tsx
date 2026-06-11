import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'

describe('Dev Time risk workspace', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('默认选择最高风险项目', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /dev-time-agent/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/风险分 70/i)).toBeInTheDocument()
    expect(
      within(screen.getByLabelText(/当前风险/i)).getByText(
        /测试失败，正在阻塞交付进度/i,
      ),
    ).toBeInTheDocument()
  })

  it('选择项目时同步详情区和 Agent 助手', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /dev-time 稳定/i }))

    expect(
      screen.getByRole('heading', { name: /dev-time$/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/风险分 0/i)).toBeInTheDocument()
    expect(screen.getByText(/当前项目：dev-time/i)).toBeInTheDocument()
  })

  it('从服务端加载项目风险队列', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [
          {
            id: 'project_server',
            name: 'dev-time-server',
            risk_score: 82,
            risk_level: 'high',
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /dev-time-server 高/i }),
      ).toBeInTheDocument()
    })
    expect(screen.getByText(/风险分 82/i)).toBeInTheDocument()
    expect(screen.getByText(/当前项目：dev-time-server/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/api/projects')
  })

  it('展示并确认当前项目行动建议', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
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
        return jsonResponse({
          action_suggestions: [
            {
              id: 'action_123',
              project_id: 'project_server',
              action_type: 'pr_comment',
              status: 'pending_user_confirmation',
              target_ref: 'pull_request:18',
              draft_body: '请先修复 go test，再请求 Review。',
              evidence_refs: ['event_check-run-123'],
            },
          ],
        })
      }
      if (url.endsWith('/api/projects/project_server/agent-runs')) {
        return jsonResponse({
          agent_runs: [
            {
              id: 'run_job_123',
              agent_job_id: 'job_123',
              project_id: 'project_server',
              risk_assessment_id: 'risk_123',
              agent_type: 'pr_doctor',
              status: 'succeeded',
              summary: 'PR #18 被失败的 go test 检查阻塞。',
              steps: [
                {
                  id: 'step_1',
                  agent_run_id: 'run_job_123',
                  step_type: 'completed',
                  status: 'succeeded',
                  title: 'Agent 完成风险判断',
                  body: 'PR #18 被失败的 go test 检查阻塞。',
                  evidence_refs: ['event_check-run-123'],
                },
              ],
            },
          ],
        })
      }
      if (url.endsWith('/api/action-suggestions/action_123/confirm')) {
        return jsonResponse({
          id: 'action_123',
          project_id: 'project_server',
          action_type: 'pr_comment',
          status: 'succeeded',
          target_ref: 'pull_request:18',
          draft_body: '请先修复 go test，再请求 Review。',
          evidence_refs: ['event_check-run-123'],
        })
      }
      return jsonResponse({ action_suggestions: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(
      await screen.findByText(/请先修复 go test，再请求 Review/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/Agent 完成风险判断/i)).toBeInTheDocument()
    expect(
      screen.getAllByText(/PR #18 被失败的 go test 检查阻塞/i).length,
    ).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /确认执行/i }))

    await waitFor(() => {
      expect(screen.getByText(/状态：已执行/i)).toBeInTheDocument()
    })
  })

  it('配置 OpenAI 和 DeepSeek LLM Provider', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/settings/llm-providers') && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({
          provider: 'openai',
          base_url: 'https://api.openai.com/v1',
          model: 'gpt-4.1',
          api_key: 'sk-test-secret',
        })
        return jsonResponse({
          id: 'llm_provider_openai',
          provider: 'openai',
          base_url: 'https://api.openai.com/v1',
          model: 'gpt-4.1',
          configured: true,
          key_last_four: 'cret',
          enabled: true,
        })
      }
      if (url.endsWith('/api/settings/llm-providers')) {
        return jsonResponse({
          providers: [
            {
              id: 'llm_provider_openai',
              provider: 'openai',
              base_url: 'https://api.openai.com/v1',
              model: 'gpt-4.1',
              configured: false,
              key_last_four: '',
              enabled: false,
            },
            {
              id: 'llm_provider_deepseek',
              provider: 'deepseek',
              base_url: 'https://api.deepseek.com/v1',
              model: 'deepseek-chat',
              configured: false,
              key_last_four: '',
              enabled: false,
            },
          ],
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /LLM 设置/i }))

    expect(await screen.findByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('DeepSeek')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/OpenAI API Key/i), {
      target: { value: 'sk-test-secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: /保存 OpenAI/i }))

    await waitFor(() => {
      expect(screen.getByText(/OpenAI 已配置/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/sk-test-secret/i)).not.toBeInTheDocument()
  })
})

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response
}
