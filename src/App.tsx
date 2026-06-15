import {
  Bot,
  CheckCircle2,
  GitPullRequest,
  ShieldAlert,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import {
  confirmActionSuggestion,
  fetchAgentRuns,
  fetchActionSuggestions,
  fetchEvidenceBundle,
  fetchLLMProviders,
  fetchGitHubSettings,
  fetchAgentConversation,
  fetchProjects,
  fetchProjectRisk,
  githubInstallationStartURL,
  loadGitHubRepositoryProject,
  saveLLMProvider,
  sendAgentConversationTurn,
  triggerGitHubRepositorySync,
  updateGitHubRepositoryAnalysis,
  type AgentRun,
  type AgentConversationTurn,
  type ActionSuggestion,
  type EvidenceBundle,
  type GitHubSettings,
  type GitHubRepositoryAccess,
  type LLMProviderConfig,
  type ProjectRisk,
  type ProjectSummary,
} from './api'
import { AgentConversationList } from './AgentConversationList'
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
  const [selectedProjectRisk, setSelectedProjectRisk] = useState<ProjectRisk | null>(null)
  const [selectedEvidenceBundle, setSelectedEvidenceBundle] =
    useState<EvidenceBundle | null>(null)
  const [llmProviders, setLLMProviders] = useState<LLMProviderConfig[]>([])
  const [llmAPIKeys, setLLMAPIKeys] = useState<Record<string, string>>({})
  const [githubSettings, setGitHubSettings] = useState<GitHubSettings | null>(null)
  const [agentMessage, setAgentMessage] = useState('')
  const [agentConversationTurns, setAgentConversationTurns] = useState<
    AgentConversationTurn[]
  >([])
  const [isSendingAgentMessage, setIsSendingAgentMessage] = useState(false)
  const [agentMessageError, setAgentMessageError] = useState('')
  const [currentView, setCurrentView] = useState<
    'workspace' | 'llm-settings' | 'github-settings'
  >('workspace')
  const [apiError, setAPIError] = useState('')
  const agentMessagesRef = useRef<HTMLDivElement>(null)

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
        setSelectedProjectRisk(null)
        setSelectedEvidenceBundle(null)
        setActionSuggestions([])
        setAgentRuns([])
        setAgentConversationTurns([])
        setAgentMessage('')
        setAgentMessageError('')
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
    setSelectedEvidenceBundle(null)

    fetchProjectRisk(selectedProjectID)
      .then((projectRisk) => {
        if (ignore) {
          return null
        }
        setSelectedProjectRisk(projectRisk)
        return fetchEvidenceBundle(projectRisk.assessment.id)
      })
      .then((evidenceBundle) => {
        if (!ignore && evidenceBundle) {
          setSelectedEvidenceBundle(evidenceBundle)
        }
      })
      .catch(() => {
        if (!ignore) {
          setSelectedProjectRisk(null)
          setSelectedEvidenceBundle(null)
        }
      })

    return () => {
      ignore = true
    }
  }, [selectedProjectID])

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

  useEffect(() => {
    const messages = agentMessagesRef.current
    if (messages === null) {
      return
    }
    messages.scrollTop = messages.scrollHeight
  }, [agentConversationTurns.length])

  const selectedProject = useMemo(
    () =>
      riskProjects.find((project) => project.id === selectedProjectID) ??
      riskProjects[0],
    [riskProjects, selectedProjectID],
  )
  const selectedRiskSignal = selectedProjectRisk?.signals?.[0] ?? null
  const selectedRiskReason = selectedRiskSignal?.reason ?? selectedProject.reason
  const selectedEvidenceRefs = selectedRiskSignal?.evidence_refs ?? []
  const selectedEvidenceEvents = selectedEvidenceBundle?.events ?? []

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
        <button
          className="settings-button"
          onClick={() => openGitHubSettings()}
          type="button"
        >
          GitHub 设置
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
      ) : currentView === 'github-settings' ? (
        <section className="risk-detail" aria-label="GitHub 设置">
          <div className="detail-header">
            <GitPullRequest aria-hidden="true" size={20} />
            <div>
              <h2>GitHub 设置</h2>
              <p>Agent 可读取的 GitHub 授权范围</p>
            </div>
          </div>
          {githubSettings ? (
              <GitHubSettingsPanel
                installationStartURL={githubInstallationStartURL()}
                onRepositoryAnalysisChange={handleRepositoryAnalysisChange}
                onRepositoryLoadProject={handleRepositoryLoadProject}
                onRepositorySync={handleRepositorySync}
                settings={githubSettings}
              />
          ) : (
            <article className="llm-provider-card">
              <div className="llm-provider-header">
                <h3>GitHub</h3>
                <strong className="status-empty">加载中</strong>
              </div>
            </article>
          )}
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
            <p>{selectedRiskReason}</p>
            {selectedEvidenceRefs.length > 0 ? (
              <div className="evidence-chips" aria-label="当前风险证据">
                {selectedEvidenceRefs.map((evidenceRef) => (
                  <span key={evidenceRef}>{evidenceRef}</span>
                ))}
              </div>
            ) : (
              <small>{selectedProject.evidence}</small>
            )}
            {selectedEvidenceEvents.length > 0 ? (
              <div className="evidence-events" aria-label="证据事件">
                {selectedEvidenceEvents.map((event) => (
                  <article className="evidence-event" key={event.id}>
                    <strong>
                      {event.normalized_summary ||
                        formatEvidenceEventType(event.event_type)}
                    </strong>
                    <small>
                      {event.github_object_type} {event.github_object_id}
                    </small>
                  </article>
                ))}
              </div>
            ) : null}
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
        <div className="agent-messages" ref={agentMessagesRef}>
          <section className="agent-summary" aria-label="风险摘要">
            <strong>风险摘要</strong>
            <p>{selectedRiskReason}</p>
          </section>
          {agentRuns[0] ? (
            <article className="agent-run">
              <div className="agent-run-header">
                <strong>{formatAgentType(agentRuns[0].agent_type)}</strong>
                <span>状态：{formatAgentRunStatus(agentRuns[0].status)}</span>
              </div>
              {agentRuns[0].summary ? (
                <p className="agent-run-summary">{agentRuns[0].summary}</p>
              ) : null}
              <div className="agent-steps" aria-label="Agent 调查过程">
                {agentRuns[0].steps.map((step) => (
                  <div className="agent-step" key={step.id}>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                    {(step.evidence_refs ?? []).length > 0 ? (
                      <div className="evidence-chips">
                        {step.evidence_refs.map((evidenceRef) => (
                          <span key={evidenceRef}>{evidenceRef}</span>
                        ))}
                      </div>
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
                <div className="target-chip">{suggestion.target_ref}</div>
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
          <AgentConversationList turns={agentConversationTurns} />
        </div>
        <form className="agent-input" onSubmit={handleSendAgentMessage}>
          <label htmlFor="agent-message">询问 Agent</label>
          <div className="agent-input-row">
            <input
              id="agent-message"
              onChange={(event) => setAgentMessage(event.target.value)}
              placeholder="询问这个风险"
              value={agentMessage}
            />
            <button
              disabled={isSendingAgentMessage || agentMessage.trim() === ''}
              type="submit"
            >
              {isSendingAgentMessage ? '发送中' : '发送'}
            </button>
          </div>
          {agentMessageError ? (
            <p className="form-error">{agentMessageError}</p>
          ) : null}
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
    resetSelectedProjectState()
  }

  function resetSelectedProjectState() {
    setSelectedProjectRisk(null)
    setSelectedEvidenceBundle(null)
    setActionSuggestions([])
    setAgentRuns([])
    setAgentConversationTurns([])
    setAgentMessage('')
    setAgentMessageError('')
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

  function openGitHubSettings() {
    setCurrentView('github-settings')
    fetchGitHubSettings()
      .then((settings) => {
        setGitHubSettings(settings)
        setAPIError('')
      })
      .catch((error: unknown) => {
        setAPIError(
          error instanceof Error
            ? `GitHub 设置加载失败：${error.message}`
            : 'GitHub 设置加载失败',
        )
      })
  }

  function handleRepositoryAnalysisChange(
    repositoryID: string,
    analysisEnabled: boolean,
  ) {
    updateGitHubRepositoryAnalysis(repositoryID, analysisEnabled)
      .then((repository) => {
        setGitHubSettings((currentSettings) =>
          currentSettings === null
            ? currentSettings
            : {
                ...currentSettings,
                repositories: currentSettings.repositories.map((currentRepository) =>
                  currentRepository.id === repository.id
                    ? repository
                    : currentRepository,
                ),
              },
        )
        return fetchProjects().then((loadedProjects) => {
          if (loadedProjects.length === 0) {
            return
          }
          const mappedProjects = loadedProjects.map(mapProjectSummary)
          setRiskProjects(mappedProjects)
          if (
            !mappedProjects.some((project) => project.id === selectedProjectID)
          ) {
            setSelectedProjectID(mappedProjects[0].id)
            resetSelectedProjectState()
          }
        })
      })
      .then(() => {
        setAPIError('')
      })
      .catch((error: unknown) => {
        setAPIError(
          error instanceof Error
            ? `GitHub 仓库设置保存失败：${error.message}`
            : 'GitHub 仓库设置保存失败',
        )
      })
  }

  function handleRepositoryLoadProject(repositoryID: string) {
    loadGitHubRepositoryProject(repositoryID)
      .then((repository) => {
        setGitHubSettings((currentSettings) =>
          currentSettings === null
            ? currentSettings
            : {
                ...currentSettings,
                repositories: currentSettings.repositories.map((currentRepository) =>
                  currentRepository.id === repository.id
                    ? repository
                    : currentRepository,
                ),
              },
        )
        return fetchProjects().then((loadedProjects) => {
          if (loadedProjects.length === 0) {
            return
          }
          const mappedProjects = loadedProjects.map(mapProjectSummary)
          setRiskProjects(mappedProjects)
          if (
            !mappedProjects.some((project) => project.id === selectedProjectID)
          ) {
            setSelectedProjectID(mappedProjects[0].id)
            resetSelectedProjectState()
          }
        })
      })
      .then(() => {
        setAPIError('')
      })
      .catch((error: unknown) => {
        setAPIError(
          error instanceof Error
            ? `GitHub 仓库加载失败：${error.message}`
            : 'GitHub 仓库加载失败',
        )
      })
  }

  function handleRepositorySync(repositoryID: string) {
    triggerGitHubRepositorySync(repositoryID)
      .then((repository) => {
        setGitHubSettings((currentSettings) =>
          currentSettings === null
            ? currentSettings
            : {
                ...currentSettings,
                repositories: currentSettings.repositories.map((currentRepository) =>
                  currentRepository.id === repository.id
                    ? repository
                    : currentRepository,
                ),
              },
        )
        setAPIError('')
      })
      .catch((error: unknown) => {
        setAPIError(
          error instanceof Error
            ? `GitHub 仓库同步失败：${error.message}`
            : 'GitHub 仓库同步失败',
        )
      })
  }

  function handleSendAgentMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = agentMessage.trim()
    if (message === '') {
      return
    }

    setIsSendingAgentMessage(true)
    setAgentMessageError('')
    fetchProjectRisk(selectedProject.id)
      .then((projectRisk) =>
        fetchAgentConversation(
          selectedProject.id,
          projectRisk.assessment.id,
        ).then((conversation) =>
          sendAgentConversationTurn(
            conversation.id,
            projectRisk.assessment.id,
            message,
          ),
        ),
      )
      .then((turn) => {
        setAgentConversationTurns((currentTurns) => [...currentTurns, turn])
        setAgentMessage('')
        if (turn.approval_request) {
          return fetchActionSuggestions(selectedProject.id).then((loadedSuggestions) => {
            setActionSuggestions(loadedSuggestions)
          })
        }
      })
      .catch((error: unknown) => {
        setAgentMessageError(
          error instanceof Error ? `发送失败：${error.message}` : '发送失败',
        )
      })
      .finally(() => setIsSendingAgentMessage(false))
  }
}

function GitHubSettingsPanel({
  installationStartURL,
  onRepositoryAnalysisChange,
  onRepositoryLoadProject,
  onRepositorySync,
  settings,
}: {
  installationStartURL: string
  onRepositoryAnalysisChange: (
    repositoryID: string,
    analysisEnabled: boolean,
  ) => void
  onRepositoryLoadProject: (repositoryID: string) => void
  onRepositorySync: (repositoryID: string) => void
  settings: GitHubSettings
}) {
  const enabledRepositoryCount = settings.repositories.filter(
    (repository) => repository.analysis_enabled !== false,
  ).length
  const storageUnavailable = settings.storage_status === 'unavailable'
  const installationConfigured = settings.installation_configured !== false
  const connectionLabel = storageUnavailable
    ? '后端数据库未连接'
    : !installationConfigured
      ? 'GitHub App 未配置'
    : settings.connected
      ? 'GitHub 已连接'
      : 'GitHub 未连接'
  const connectionDescription = storageUnavailable
    ? '后端当前以无数据库开发模式运行，无法读取已授权仓库。'
    : !installationConfigured
      ? '先配置 GitHub App ID、slug、private key 和 setup state secret。'
    : settings.connected
      ? 'Agent 可以读取下列授权仓库的 PR、CI、Issue 和项目元数据。'
      : '连接 GitHub 后，Agent 才能读取仓库、PR、CI 和 Issue。'

  return (
    <div className="llm-settings-list">
      <article className="llm-provider-card">
        <div className="llm-provider-header">
          <h3>GitHub App</h3>
          <strong className={settings.connected ? 'status-ready' : 'status-empty'}>
            {connectionLabel}
          </strong>
        </div>
        <p>{connectionDescription}</p>
        {storageUnavailable || !installationConfigured ? (
          <button disabled type="button">
            {installationConfigured ? '连接 GitHub' : 'GitHub App 未配置'}
          </button>
        ) : (
          <a className="github-installation-link" href={installationStartURL}>
            {settings.connected ? '管理 GitHub 授权' : '连接 GitHub'}
          </a>
        )}
        {settings.permissions.length > 0 ? (
          <div className="evidence-chips" aria-label="GitHub 权限">
            {settings.permissions.map((permission) => (
              <span key={permission}>{permission}</span>
            ))}
          </div>
        ) : null}
        {settings.connected && enabledRepositoryCount === 0 ? (
          <p className="form-error">尚未选择纳入分析的仓库</p>
        ) : null}
      </article>
      {settings.repositories.map((repository) => (
        <article className="llm-provider-card" key={repository.id}>
          <div className="llm-provider-header">
            <h3>{repository.full_name}</h3>
            <strong className="status-ready">可读取</strong>
          </div>
          {repository.project_id ? (
            <>
              <p>绑定项目：{repository.project_id}</p>
              <p>同步状态：{formatGitHubSyncStatus(repository.sync_status)}</p>
              {repository.last_synced_at ? (
                <p>最近同步：{formatUTCMinute(repository.last_synced_at)}</p>
              ) : null}
              {repository.sync_failure_reason ? (
                <p className="form-error">{repository.sync_failure_reason}</p>
              ) : null}
              <button
                disabled={repository.sync_status === 'syncing'}
                onClick={() => onRepositorySync(repository.id)}
                type="button"
              >
                {repository.sync_status === 'syncing' ? '同步中' : '同步仓库'}
              </button>
              <RepositoryAnalysisToggle
                onChange={(analysisEnabled) =>
                  onRepositoryAnalysisChange(repository.id, analysisEnabled)
                }
                repository={repository}
              />
            </>
          ) : (
            <>
              <p>尚未加载到 Dev Time 项目</p>
              <button onClick={() => onRepositoryLoadProject(repository.id)} type="button">
                加载到 Dev Time
              </button>
            </>
          )}
        </article>
      ))}
    </div>
  )
}

function RepositoryAnalysisToggle({
  onChange,
  repository,
}: {
  onChange: (analysisEnabled: boolean) => void
  repository: GitHubRepositoryAccess
}) {
  const analysisEnabled = repository.analysis_enabled !== false

  return (
    <label className="repository-analysis-toggle">
      <input
        checked={analysisEnabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>纳入 Dev Time 分析</span>
    </label>
  )
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

function formatGitHubSyncStatus(status: string): string {
  const labels: Record<string, string> = {
    failed: '同步失败',
    not_synced: '未同步',
    stale: '已过期',
    succeeded: '已同步',
    syncing: '同步中',
  }
  return labels[status] ?? '未同步'
}

function formatEvidenceEventType(eventType: string): string {
  const labels: Record<string, string> = {
    check_run: 'Check run',
    pull_request: 'Pull request',
    workflow_run: 'Workflow run',
  }
  return labels[eventType] ?? eventType
}

function formatUTCMinute(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')
  const hour = `${date.getUTCHours()}`.padStart(2, '0')
  const minute = `${date.getUTCMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
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
