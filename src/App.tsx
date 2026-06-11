import { Bot, CheckCircle2, GitPullRequest, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import {
  confirmActionSuggestion,
  fetchAgentRuns,
  fetchActionSuggestions,
  fetchLLMProviders,
  fetchProjects,
  saveLLMProvider,
  type AgentRun,
  type ActionSuggestion,
  type LLMProviderConfig,
  type ProjectSummary,
} from './api'
import './App.css'

type RiskProject = {
  id: string
  name: string
  level: ProjectSummary['risk_level']
  score: number
  reason: string
  evidence: string
}

const projects: RiskProject[] = [
  {
    id: 'project_agent',
    name: 'dev-time-agent',
    level: 'high',
    score: 70,
    reason: '测试失败，正在阻塞交付进度。',
    evidence: 'check_run event_check-run-1',
  },
  {
    id: 'project_web',
    name: 'dev-time',
    level: 'stable',
    score: 0,
    reason: '暂无活跃风险信号。',
    evidence: '最近一次同步正常完成',
  },
]

export function App() {
  const [riskProjects, setRiskProjects] = useState(projects)
  const [selectedProjectID, setSelectedProjectID] = useState(projects[0].id)
  const [actionSuggestions, setActionSuggestions] = useState<ActionSuggestion[]>([])
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([])
  const [llmProviders, setLLMProviders] = useState<LLMProviderConfig[]>([])
  const [llmAPIKeys, setLLMAPIKeys] = useState<Record<string, string>>({})
  const [currentView, setCurrentView] = useState<'workspace' | 'llm-settings'>(
    'workspace',
  )
  const [apiError, setAPIError] = useState('')

  useEffect(() => {
    let ignore = false

    fetchProjects()
      .then((loadedProjects) => {
        if (ignore || loadedProjects.length === 0) {
          return
        }
        const mappedProjects = loadedProjects.map(mapProjectSummary)
        setRiskProjects(mappedProjects)
        setSelectedProjectID(mappedProjects[0].id)
        setActionSuggestions([])
        setAgentRuns([])
        setAPIError('')
      })
      .catch((error: unknown) => {
        setAPIError(
          error instanceof Error
            ? `后端连接失败：${error.message}`
            : '后端连接失败',
        )
      })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    Promise.all([
      fetchActionSuggestions(selectedProjectID),
      fetchAgentRuns(selectedProjectID),
    ])
      .then(([loadedSuggestions, loadedAgentRuns]) => {
        if (!ignore) {
          setActionSuggestions(loadedSuggestions)
          setAgentRuns(loadedAgentRuns)
        }
      })
      .catch(() => {
        if (!ignore) {
          setActionSuggestions([])
          setAgentRuns([])
        }
      })

    return () => {
      ignore = true
    }
  }, [selectedProjectID])

  const selectedProject = useMemo(
    () =>
      riskProjects.find((project) => project.id === selectedProjectID) ??
      riskProjects[0],
    [riskProjects, selectedProjectID],
  )

  return (
    <main className="workspace" aria-labelledby="workspace-title">
      <section className="risk-queue" aria-label="风险队列">
        <div className="section-title">
          <ShieldAlert aria-hidden="true" size={18} />
          <h1 id="workspace-title">风险队列</h1>
        </div>
        <button
          className="settings-button"
          onClick={() => openLLMSettings()}
          type="button"
        >
          LLM 设置
        </button>
        <div className="queue-list">
          {apiError ? <p className="api-error">{apiError}</p> : null}
          {riskProjects.map((project) => (
            <button
              aria-label={`${project.name} ${formatRiskLevel(project.level)}`}
              className={
                project.id === selectedProject.id
                  ? 'queue-item queue-item-selected'
                  : 'queue-item'
              }
              key={project.id}
              onClick={() => handleSelectProject(project.id)}
              type="button"
            >
              <span>{project.name}</span>
              <strong>{formatRiskLevel(project.level)}</strong>
            </button>
          ))}
        </div>
      </section>

      {currentView === 'llm-settings' ? (
        <section className="risk-detail" aria-label="LLM 设置">
          <div className="detail-header">
            <Bot aria-hidden="true" size={20} />
            <div>
              <h2>LLM 设置</h2>
              <p>配置 Agent 使用的模型 Provider</p>
            </div>
          </div>
          <div className="llm-settings-list">
            {llmProviders.map((provider) => (
              <LLMProviderCard
                apiKey={llmAPIKeys[provider.provider] ?? ''}
                key={provider.provider}
                onAPIKeyChange={(value) =>
                  setLLMAPIKeys((current) => ({
                    ...current,
                    [provider.provider]: value,
                  }))
                }
                onProviderChange={(updatedProvider) =>
                  setLLMProviders((currentProviders) =>
                    currentProviders.map((currentProvider) =>
                      currentProvider.provider === updatedProvider.provider
                        ? updatedProvider
                        : currentProvider,
                    ),
                  )
                }
                provider={provider}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="risk-detail" aria-label="当前风险">
          <div className="detail-header">
            <GitPullRequest aria-hidden="true" size={20} />
            <div>
              <h2>{selectedProject.name}</h2>
              <p>风险分 {selectedProject.score}</p>
            </div>
          </div>

          <article className="evidence-panel">
            <h3>证据包</h3>
            <p>{selectedProject.reason}</p>
            <small>{selectedProject.evidence}</small>
          </article>
        </section>
      )}

      <aside className="agent-dock" aria-label="Agent 助手">
        <div className="agent-header">
          <Bot aria-hidden="true" size={20} />
          <div>
            <h2>Agent 助手</h2>
            <p>当前项目：{selectedProject.name}</p>
          </div>
        </div>
        <div className="agent-messages">
          <p>{selectedProject.reason}</p>
          {agentRuns[0] ? (
            <article className="agent-run">
              <div className="agent-run-header">
                <strong>{formatAgentType(agentRuns[0].agent_type)}</strong>
                <span>状态：{formatAgentRunStatus(agentRuns[0].status)}</span>
              </div>
              {agentRuns[0].summary ? <p>{agentRuns[0].summary}</p> : null}
              <div className="agent-steps" aria-label="Agent 调查过程">
                {agentRuns[0].steps.map((step) => (
                  <div className="agent-step" key={step.id}>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                    {(step.evidence_refs ?? []).length > 0 ? (
                      <small>{step.evidence_refs.join(', ')}</small>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ) : null}
          <div className="action-suggestions" aria-label="行动建议">
            {actionSuggestions.map((suggestion) => (
              <article className="action-suggestion" key={suggestion.id}>
                <div className="action-suggestion-header">
                  <CheckCircle2 aria-hidden="true" size={18} />
                  <strong>{formatActionType(suggestion.action_type)}</strong>
                  <span>状态：{formatActionStatus(suggestion.status)}</span>
                </div>
                <p>{suggestion.draft_body}</p>
                <small>{suggestion.target_ref}</small>
                {suggestion.status === 'pending_user_confirmation' ? (
                  <button
                    onClick={() => handleConfirmAction(suggestion.id)}
                    type="button"
                  >
                    确认执行
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </div>
        <form className="agent-input" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="agent-message">询问 Agent</label>
          <input id="agent-message" placeholder="询问这个风险" />
        </form>
      </aside>
    </main>
  )

  function handleConfirmAction(suggestionID: string) {
    confirmActionSuggestion(suggestionID)
      .then((confirmedSuggestion) => {
        setActionSuggestions((currentSuggestions) =>
          currentSuggestions.map((suggestion) =>
            suggestion.id === confirmedSuggestion.id
              ? confirmedSuggestion
              : suggestion,
          ),
        )
      })
      .catch(() => {
        setActionSuggestions((currentSuggestions) =>
          currentSuggestions.map((suggestion) =>
            suggestion.id === suggestionID
              ? { ...suggestion, status: 'failed' }
              : suggestion,
          ),
        )
      })
  }

  function handleSelectProject(projectID: string) {
    setCurrentView('workspace')
    setSelectedProjectID(projectID)
    setActionSuggestions([])
    setAgentRuns([])
  }

  function openLLMSettings() {
    setCurrentView('llm-settings')
    fetchLLMProviders()
      .then((providers) => setLLMProviders(providers))
      .catch((error: unknown) => {
        setAPIError(
          error instanceof Error
            ? `LLM 设置加载失败：${error.message}`
            : 'LLM 设置加载失败',
        )
      })
  }
}

type LLMProviderCardProps = {
  provider: LLMProviderConfig
  apiKey: string
  onAPIKeyChange: (value: string) => void
  onProviderChange: (provider: LLMProviderConfig) => void
}

function LLMProviderCard({
  provider,
  apiKey,
  onAPIKeyChange,
  onProviderChange,
}: LLMProviderCardProps) {
  const providerLabel = formatProviderLabel(provider.provider)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function handleSaveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setSaveError('')
    saveLLMProvider({
      provider: provider.provider,
      base_url: provider.base_url,
      model: provider.model,
      api_key: apiKey,
    })
      .then((savedProvider) => {
        onProviderChange(savedProvider)
        onAPIKeyChange('')
      })
      .catch((error: unknown) => {
        setSaveError(
          error instanceof Error ? error.message : `${providerLabel} 保存失败`,
        )
      })
      .finally(() => setIsSaving(false))
  }

  return (
    <form className="llm-provider-card" onSubmit={handleSaveProvider}>
      <div className="llm-provider-header">
        <h3>{providerLabel}</h3>
        <strong className={provider.configured ? 'status-ready' : 'status-empty'}>
          {provider.configured ? `${providerLabel} 已配置` : '未配置'}
        </strong>
      </div>
      <label>
        Base URL
        <input
          aria-label={`${providerLabel} Base URL`}
          onChange={(event) =>
            onProviderChange({ ...provider, base_url: event.target.value })
          }
          value={provider.base_url}
        />
      </label>
      <label>
        模型
        <input
          aria-label={`${providerLabel} 模型`}
          onChange={(event) =>
            onProviderChange({ ...provider, model: event.target.value })
          }
          value={provider.model}
        />
      </label>
      <label>
        API Key
        <input
          aria-label={`${providerLabel} API Key`}
          onChange={(event) => onAPIKeyChange(event.target.value)}
          placeholder={
            provider.configured ? `已保存，尾号 ${provider.key_last_four}` : '输入 API Key'
          }
          type="password"
          value={apiKey}
        />
      </label>
      <button
        disabled={isSaving || apiKey.trim() === ''}
        type="submit"
      >
        {isSaving ? '保存中' : `保存 ${providerLabel}`}
      </button>
      {saveError ? <p className="form-error">{saveError}</p> : null}
    </form>
  )
}

function mapProjectSummary(project: ProjectSummary): RiskProject {
  return {
    id: project.id,
    name: project.name,
    level: project.risk_level,
    score: project.risk_score,
    reason: `当前项目风险等级为${formatRiskLevel(project.risk_level)}。`,
    evidence: '来自 /api/projects',
  }
}

function formatRiskLevel(level: ProjectSummary['risk_level']): string {
  const labels: Record<ProjectSummary['risk_level'], string> = {
    stable: '稳定',
    low: '低',
    medium: '中',
    high: '高',
  }
  return labels[level]
}

function formatActionType(actionType: string): string {
  const labels: Record<string, string> = {
    pr_comment: 'PR 评论',
    issue_comment: 'Issue 评论',
  }
  return labels[actionType] ?? actionType
}

function formatActionStatus(status: ActionSuggestion['status']): string {
  const labels: Record<ActionSuggestion['status'], string> = {
    drafted: '草稿',
    pending_user_confirmation: '待确认',
    succeeded: '已执行',
    failed: '失败',
  }
  return labels[status]
}

function formatAgentType(agentType: string): string {
  const labels: Record<string, string> = {
    risk_scout: 'Risk Scout',
    pr_doctor: 'PR Doctor',
  }
  return labels[agentType] ?? agentType
}

function formatAgentRunStatus(status: string): string {
  const labels: Record<string, string> = {
    queued: '排队中',
    running: '调查中',
    succeeded: '已完成',
    failed: '失败',
  }
  return labels[status] ?? status
}

function formatProviderLabel(provider: LLMProviderConfig['provider']): string {
  const labels: Record<LLMProviderConfig['provider'], string> = {
    openai: 'OpenAI',
    deepseek: 'DeepSeek',
  }
  return labels[provider]
}
