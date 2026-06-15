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

  it('展示当前项目风险详情和证据引用', async () => {
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
      if (url.endsWith('/api/projects/project_server/risk')) {
        return jsonResponse({
          assessment: {
            id: 'risk_project_server',
            project_id: 'project_server',
            score: 82,
            level: 'high',
            trend: 'new',
          },
          signals: [
            {
              id: 'signal_check_run',
              project_id: 'project_server',
              category: 'blocked',
              severity: 82,
              reason: 'test failed and is blocking progress.',
              evidence_refs: ['event_check-run-123'],
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
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await screen.findAllByText(/test failed and is blocking progress/i)
    const riskDetail = screen.getByLabelText('当前风险', { selector: 'section' })
    expect(
      within(riskDetail).getByText(/test failed and is blocking progress/i),
    ).toBeInTheDocument()
    expect(within(riskDetail).getByText(/event_check-run-123/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/projects/project_server/risk',
    )
  })

  it('展示当前项目证据包中的标准化事件摘要', async () => {
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
      if (url.endsWith('/api/projects/project_server/risk')) {
        return jsonResponse({
          assessment: {
            id: 'risk_project_server',
            project_id: 'project_server',
            score: 82,
            level: 'high',
            trend: 'new',
          },
          signals: [
            {
              id: 'signal_check_run',
              project_id: 'project_server',
              category: 'blocked',
              severity: 82,
              reason: 'test failed and is blocking progress.',
              evidence_refs: ['event_check-run-123'],
            },
          ],
        })
      }
      if (url.endsWith('/api/risk-assessments/risk_project_server/evidence-bundle')) {
        return jsonResponse({
          project: {
            id: 'project_server',
            name: 'dev-time-server',
            risk_score: 82,
            risk_level: 'high',
          },
          assessment: {
            id: 'risk_project_server',
            project_id: 'project_server',
            score: 82,
            level: 'high',
            trend: 'new',
          },
          signals: [],
          events: [
            {
              id: 'event_check-run-123',
              event_type: 'check_run',
              github_object_type: 'check_run',
              github_object_id: '421',
              normalized_summary: 'Check run test completed with failure',
              payload: {},
            },
          ],
          allowed_actions: ['create_pr_comment'],
        })
      }
      if (url.endsWith('/api/projects/project_server/action-suggestions')) {
        return jsonResponse({ action_suggestions: [] })
      }
      if (url.endsWith('/api/projects/project_server/agent-runs')) {
        return jsonResponse({ agent_runs: [] })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(
      await screen.findByText(/Check run test completed with failure/i),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/risk-assessments/risk_project_server/evidence-bundle',
    )
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

  it('展示 GitHub 连接状态和授权仓库', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: true,
          provider: 'github_app',
          repositories: [
            {
              id: 'repo_9001',
              github_id: 9001,
              owner: 'henry-insomniac',
              name: 'dev-time-server',
              full_name: 'henry-insomniac/dev-time-server',
              project_id: 'project_repo_9001',
            },
          ],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))

    expect(await screen.findByText(/GitHub 已连接/i)).toBeInTheDocument()
    expect(screen.getByText(/henry-insomniac\/dev-time-server/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/settings/github',
    )
  })

  it('GitHub 设置在后端无数据库时显示本地存储状态', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: false,
          provider: 'github_app',
          repositories: [],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
          storage_status: 'unavailable',
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))

    expect(await screen.findByText(/后端数据库未连接/i)).toBeInTheDocument()
    expect(screen.getByText(/无法读取已授权仓库/i)).toBeInTheDocument()
  })

  it('GitHub 设置提供浏览器授权入口', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: false,
          provider: 'github_app',
          repositories: [],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))

    const authorizationLink = await screen.findByRole('link', {
      name: /连接 GitHub/i,
    })
    expect(authorizationLink).toHaveAttribute(
      'href',
      'http://localhost:8080/api/github/installations/start',
    )
  })

  it('在 GitHub 设置中将授权仓库加载到项目', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (
        url.endsWith('/api/settings/github/repositories/repo_9001/load-project') &&
        init?.method === 'POST'
      ) {
        return jsonResponse({
          project: {
            id: 'project_repo_9001',
            repository_id: 'repo_9001',
            name: 'dev-time-server',
          },
          repository: {
            id: 'repo_9001',
            github_id: 9001,
            owner: 'henry-insomniac',
            name: 'dev-time-server',
            full_name: 'henry-insomniac/dev-time-server',
            project_id: 'project_repo_9001',
            analysis_enabled: true,
            sync_status: 'not_synced',
            last_synced_at: null,
            sync_failure_reason: null,
          },
        })
      }
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: true,
          provider: 'github_app',
          repositories: [
            {
              id: 'repo_9001',
              github_id: 9001,
              owner: 'henry-insomniac',
              name: 'dev-time-server',
              full_name: 'henry-insomniac/dev-time-server',
              project_id: null,
              analysis_enabled: true,
              sync_status: 'not_synced',
              last_synced_at: null,
              sync_failure_reason: null,
            },
          ],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))
    fireEvent.click(await screen.findByRole('button', { name: /加载到 Dev Time/i }))

    expect(await screen.findByText(/绑定项目：project_repo_9001/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/settings/github/repositories/repo_9001/load-project',
      { method: 'POST' },
    )
  })

  it('加载授权仓库后将项目加入风险队列', async () => {
    let repositoryLoaded = false
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return jsonResponse({
          projects: repositoryLoaded
            ? [
                {
                  id: 'project_repo_9001',
                  name: 'dev-time-server',
                  risk_score: 0,
                  risk_level: 'stable',
                },
              ]
            : [],
        })
      }
      if (
        url.endsWith('/api/settings/github/repositories/repo_9001/load-project') &&
        init?.method === 'POST'
      ) {
        repositoryLoaded = true
        return jsonResponse({
          project: {
            id: 'project_repo_9001',
            repository_id: 'repo_9001',
            name: 'dev-time-server',
          },
          repository: {
            id: 'repo_9001',
            github_id: 9001,
            owner: 'henry-insomniac',
            name: 'dev-time-server',
            full_name: 'henry-insomniac/dev-time-server',
            project_id: 'project_repo_9001',
            analysis_enabled: true,
            sync_status: 'not_synced',
            last_synced_at: null,
            sync_failure_reason: null,
          },
        })
      }
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: true,
          provider: 'github_app',
          repositories: [
            {
              id: 'repo_9001',
              github_id: 9001,
              owner: 'henry-insomniac',
              name: 'dev-time-server',
              full_name: 'henry-insomniac/dev-time-server',
              project_id: null,
              analysis_enabled: true,
              sync_status: 'not_synced',
              last_synced_at: null,
              sync_failure_reason: null,
            },
          ],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      if (url.includes('/api/risk-assessments/')) {
        return jsonResponse({ events: [] })
      }
      if (url.includes('/risk')) {
        return jsonResponse({
          assessment: {
            id: 'risk_project_repo_9001',
            project_id: 'project_repo_9001',
            score: 0,
            level: 'stable',
            trend: 'stable',
          },
          signals: [],
        })
      }
      if (url.includes('/action-suggestions')) {
        return jsonResponse({ action_suggestions: [] })
      }
      if (url.includes('/agent-runs')) {
        return jsonResponse({ agent_runs: [] })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))
    fireEvent.click(await screen.findByRole('button', { name: /加载到 Dev Time/i }))

    expect(
      await screen.findByRole('button', { name: /dev-time-server 稳定/i }),
    ).toBeInTheDocument()
  })

  it('在 GitHub 设置中切换仓库是否纳入分析', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (
        url.endsWith('/api/settings/github/repositories/repo_9001/analysis') &&
        init?.method === 'PATCH'
      ) {
        expect(JSON.parse(String(init.body))).toEqual({
          analysis_enabled: true,
        })
        return jsonResponse({
          repository: {
            id: 'repo_9001',
            github_id: 9001,
            owner: 'henry-insomniac',
            name: 'dev-time-server',
            full_name: 'henry-insomniac/dev-time-server',
            project_id: 'project_repo_9001',
            analysis_enabled: true,
          },
        })
      }
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: true,
          provider: 'github_app',
          repositories: [
            {
              id: 'repo_9001',
              github_id: 9001,
              owner: 'henry-insomniac',
              name: 'dev-time-server',
              full_name: 'henry-insomniac/dev-time-server',
              project_id: 'project_repo_9001',
              analysis_enabled: false,
            },
          ],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))

    const analysisToggle = await screen.findByRole('checkbox', {
      name: /纳入 Dev Time 分析/i,
    })
    expect(analysisToggle).not.toBeChecked()

    fireEvent.click(analysisToggle)

    await waitFor(() => {
      expect(analysisToggle).toBeChecked()
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/settings/github/repositories/repo_9001/analysis',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_enabled: true }),
      },
    )
  })

  it('关闭仓库分析后刷新风险队列', async () => {
    let analysisPatchSeen = false
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/projects')) {
        return jsonResponse({
          projects: analysisPatchSeen
            ? [
                {
                  id: 'project_agent',
                  name: 'dev-time-agent',
                  risk_score: 23,
                  risk_level: 'low',
                },
              ]
            : [
                {
                  id: 'project_server',
                  name: 'dev-time-server',
                  risk_score: 82,
                  risk_level: 'high',
                },
                {
                  id: 'project_agent',
                  name: 'dev-time-agent',
                  risk_score: 23,
                  risk_level: 'low',
                },
              ],
        })
      }
      if (url.endsWith('/api/projects/project_server/risk')) {
        return jsonResponse({
          assessment: {
            id: 'risk_project_server',
            project_id: 'project_server',
            score: 82,
            level: 'high',
            trend: 'new',
          },
          signals: [],
        })
      }
      if (url.endsWith('/api/projects/project_agent/risk')) {
        return jsonResponse({
          assessment: {
            id: 'risk_project_agent',
            project_id: 'project_agent',
            score: 23,
            level: 'low',
            trend: 'stable',
          },
          signals: [],
        })
      }
      if (url.includes('/api/risk-assessments/')) {
        return jsonResponse({ events: [] })
      }
      if (url.endsWith('/api/settings/github/repositories/repo_9001/analysis')) {
        analysisPatchSeen = true
        expect(init?.method).toBe('PATCH')
        expect(JSON.parse(String(init?.body))).toEqual({
          analysis_enabled: false,
        })
        return jsonResponse({
          repository: {
            id: 'repo_9001',
            github_id: 9001,
            owner: 'henry-insomniac',
            name: 'dev-time-server',
            full_name: 'henry-insomniac/dev-time-server',
            project_id: 'project_server',
            analysis_enabled: false,
            sync_status: 'not_synced',
            last_synced_at: null,
            sync_failure_reason: null,
          },
        })
      }
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: true,
          provider: 'github_app',
          repositories: [
            {
              id: 'repo_9001',
              github_id: 9001,
              owner: 'henry-insomniac',
              name: 'dev-time-server',
              full_name: 'henry-insomniac/dev-time-server',
              project_id: 'project_server',
              analysis_enabled: true,
              sync_status: 'not_synced',
              last_synced_at: null,
              sync_failure_reason: null,
            },
          ],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      if (url.includes('/action-suggestions')) {
        return jsonResponse({ action_suggestions: [] })
      }
      if (url.includes('/agent-runs')) {
        return jsonResponse({ agent_runs: [] })
      }
      return jsonResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(
      await screen.findByRole('button', { name: /dev-time-server 高/i }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))
    fireEvent.click(
      await screen.findByRole('checkbox', { name: /纳入 Dev Time 分析/i }),
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /dev-time-server 高/i }),
      ).not.toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /dev-time-agent 低/i }),
    ).toBeInTheDocument()
  })

  it('在 GitHub 设置中展示仓库同步状态', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: true,
          provider: 'github_app',
          repositories: [
            {
              id: 'repo_9001',
              github_id: 9001,
              owner: 'henry-insomniac',
              name: 'dev-time-server',
              full_name: 'henry-insomniac/dev-time-server',
              project_id: 'project_repo_9001',
              analysis_enabled: true,
              sync_status: 'not_synced',
              last_synced_at: null,
              sync_failure_reason: null,
            },
          ],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))

    expect(await screen.findByText(/同步状态：未同步/i)).toBeInTheDocument()
  })

  it('GitHub 已连接但未选择分析仓库时给出选择提示', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: true,
          provider: 'github_app',
          repositories: [
            {
              id: 'repo_9001',
              github_id: 9001,
              owner: 'henry-insomniac',
              name: 'dev-time-server',
              full_name: 'henry-insomniac/dev-time-server',
              project_id: 'project_repo_9001',
              analysis_enabled: false,
              sync_status: 'not_synced',
              last_synced_at: null,
              sync_failure_reason: null,
            },
          ],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))

    expect(
      await screen.findByText(/尚未选择纳入分析的仓库/i),
    ).toBeInTheDocument()
  })

  it('在 GitHub 设置中触发仓库同步', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (
        url.endsWith('/api/settings/github/repositories/repo_9001/sync') &&
        init?.method === 'POST'
      ) {
        return jsonResponse({
          repository: {
            id: 'repo_9001',
            github_id: 9001,
            owner: 'henry-insomniac',
            name: 'dev-time-server',
            full_name: 'henry-insomniac/dev-time-server',
            project_id: 'project_repo_9001',
            analysis_enabled: true,
            sync_status: 'succeeded',
            last_synced_at: '2026-06-15T09:48:00Z',
            sync_failure_reason: null,
          },
        })
      }
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: true,
          provider: 'github_app',
          repositories: [
            {
              id: 'repo_9001',
              github_id: 9001,
              owner: 'henry-insomniac',
              name: 'dev-time-server',
              full_name: 'henry-insomniac/dev-time-server',
              project_id: 'project_repo_9001',
              analysis_enabled: true,
              sync_status: 'not_synced',
              last_synced_at: null,
              sync_failure_reason: null,
            },
          ],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))
    fireEvent.click(await screen.findByRole('button', { name: /同步仓库/i }))

    await waitFor(() => {
      expect(screen.getByText(/同步状态：已同步/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/最近同步：2026-06-15 09:48/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/settings/github/repositories/repo_9001/sync',
      { method: 'POST' },
    )
  })

  it('在 GitHub 设置中展示最近同步时间', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/settings/github')) {
        return jsonResponse({
          connected: true,
          provider: 'github_app',
          repositories: [
            {
              id: 'repo_9001',
              github_id: 9001,
              owner: 'henry-insomniac',
              name: 'dev-time-server',
              full_name: 'henry-insomniac/dev-time-server',
              project_id: 'project_repo_9001',
              analysis_enabled: true,
              sync_status: 'succeeded',
              last_synced_at: '2026-06-15T09:20:00Z',
              sync_failure_reason: null,
            },
          ],
          permissions: ['metadata:read', 'pull_requests:read', 'checks:read'],
        })
      }
      return jsonResponse({ projects: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /GitHub 设置/i }))

    expect(await screen.findByText(/最近同步：2026-06-15 09:20/i)).toBeInTheDocument()
  })

  it('展示 Agent 澄清意图', async () => {
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
        return jsonResponse({
          id: 'turn_123',
          conversation_id: 'conversation_project_server',
          user_message: '你怎么看',
          agent_response: '你想让我评估当前风险、解释证据，还是生成下一步行动计划？',
          evidence_refs: null,
          intent: 'clarify',
          trace_events: [
            {
              id: 'trace_turn_123',
              conversation_id: 'conversation_project_server',
              turn_id: 'turn_123',
              event_type: 'intent_routed',
              title: '完成意图识别',
              body: 'Agent 已根据用户输入选择处理路径。',
              intent: 'clarify',
              evidence_refs: [],
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
      target: { value: '你怎么看' },
    })
    fireEvent.click(screen.getByRole('button', { name: /发送/i }))

    expect(await screen.findByText(/意图：需要澄清/i)).toBeInTheDocument()
    expect(screen.getByText(/你想让我评估当前风险/i)).toBeInTheDocument()
  })
})

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response
}
