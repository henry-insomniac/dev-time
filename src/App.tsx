import { Bot, CheckCircle2, GitPullRequest, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  confirmActionSuggestion,
  fetchActionSuggestions,
  fetchProjects,
  type ActionSuggestion,
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
      })
      .catch(() => {
        // Keep the local demo queue available when the API is not running.
      })

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    fetchActionSuggestions(selectedProjectID)
      .then((loadedSuggestions) => {
        if (!ignore) {
          setActionSuggestions(loadedSuggestions)
        }
      })
      .catch(() => {
        if (!ignore) {
          setActionSuggestions([])
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
        <div className="queue-list">
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
    setSelectedProjectID(projectID)
    setActionSuggestions([])
  }
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
