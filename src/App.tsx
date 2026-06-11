import { Bot, GitPullRequest, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { fetchProjects, type ProjectSummary } from './api'
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
    reason: 'test failed and is blocking progress.',
    evidence: 'check_run event_check-run-1',
  },
  {
    id: 'project_web',
    name: 'dev-time',
    level: 'stable',
    score: 0,
    reason: 'No active risk signals were found.',
    evidence: 'Latest sync completed cleanly',
  },
]

export function App() {
  const [riskProjects, setRiskProjects] = useState(projects)
  const [selectedProjectID, setSelectedProjectID] = useState(projects[0].id)

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
      })
      .catch(() => {
        // Keep the local demo queue available when the API is not running.
      })

    return () => {
      ignore = true
    }
  }, [])

  const selectedProject = useMemo(
    () =>
      riskProjects.find((project) => project.id === selectedProjectID) ??
      riskProjects[0],
    [riskProjects, selectedProjectID],
  )

  return (
    <main className="workspace" aria-labelledby="workspace-title">
      <section className="risk-queue" aria-label="Risk queue">
        <div className="section-title">
          <ShieldAlert aria-hidden="true" size={18} />
          <h1 id="workspace-title">Risk queue</h1>
        </div>
        <div className="queue-list">
          {riskProjects.map((project) => (
            <button
              aria-label={`${project.name} ${project.level}`}
              className={
                project.id === selectedProject.id
                  ? 'queue-item queue-item-selected'
                  : 'queue-item'
              }
              key={project.id}
              onClick={() => setSelectedProjectID(project.id)}
              type="button"
            >
              <span>{project.name}</span>
              <strong>{project.level}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="risk-detail" aria-label="Selected risk">
        <div className="detail-header">
          <GitPullRequest aria-hidden="true" size={20} />
          <div>
            <h2>{selectedProject.name}</h2>
            <p>Risk score {selectedProject.score}</p>
          </div>
        </div>

        <article className="evidence-panel">
          <h3>EvidenceBundle</h3>
          <p>{selectedProject.reason}</p>
          <small>{selectedProject.evidence}</small>
        </article>
      </section>

      <aside className="agent-dock" aria-label="Agent dock">
        <div className="agent-header">
          <Bot aria-hidden="true" size={20} />
          <div>
            <h2>Agent Dock</h2>
            <p>Agent context: {selectedProject.name}</p>
          </div>
        </div>
        <div className="agent-messages">
          <p>{selectedProject.reason}</p>
        </div>
        <form className="agent-input">
          <label htmlFor="agent-message">Ask Agent</label>
          <input id="agent-message" placeholder="Ask about this risk" />
        </form>
      </aside>
    </main>
  )
}

function mapProjectSummary(project: ProjectSummary): RiskProject {
  return {
    id: project.id,
    name: project.name,
    level: project.risk_level,
    score: project.risk_score,
    reason: `Current project risk level is ${project.risk_level}.`,
    evidence: 'Loaded from /api/projects',
  }
}
