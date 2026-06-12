export type ProjectSummary = {
  id: string
  name: string
  risk_score: number
  risk_level: 'stable' | 'low' | 'medium' | 'high'
}

export type ProjectsResponse = {
  projects: ProjectSummary[]
}

export type ActionSuggestion = {
  id: string
  project_id: string
  action_type: string
  status: 'pending_user_confirmation' | 'succeeded' | 'failed' | 'drafted'
  target_ref: string
  draft_body: string
  evidence_refs: string[]
}

export type ActionSuggestionsResponse = {
  action_suggestions: ActionSuggestion[]
}

export type AgentStep = {
  id: string
  agent_run_id: string
  step_type: string
  status: string
  title: string
  body: string
  evidence_refs: string[]
}

export type AgentRun = {
  id: string
  agent_job_id: string
  project_id: string
  risk_assessment_id: string
  agent_type: string
  status: string
  summary: string
  steps: AgentStep[]
}

export type AgentRunsResponse = {
  agent_runs: AgentRun[]
}

export type ProjectRisk = {
  assessment: {
    id: string
    project_id: string
    score: number
    level: string
    trend: string
  }
  signals: Array<{
    id: string
    project_id: string
    category: string
    severity: number
    reason: string
    evidence_refs: string[]
  }>
}

export type AgentConversation = {
  id: string
  project_id: string
  latest_risk_assessment_id: string
  status: string
}

export type AgentConversationTurn = {
  id: string
  conversation_id: string
  user_message: string
  agent_response: string
  evidence_refs: string[]
  intent: string
  trace_events: AgentTraceEvent[]
}

export type AgentTraceEvent = {
  id: string
  conversation_id: string
  turn_id: string
  event_type: string
  title: string
  body: string
  intent: string
  evidence_refs: string[]
}

export type LLMProviderConfig = {
  id: string
  provider: 'openai' | 'deepseek'
  base_url: string
  model: string
  configured: boolean
  key_last_four: string
  enabled: boolean
}

export type LLMProvidersResponse = {
  providers: LLMProviderConfig[]
}

export type SaveLLMProviderInput = {
  provider: LLMProviderConfig['provider']
  base_url: string
  model: string
  api_key: string
}

const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const response = await fetch(`${apiBaseURL}/api/projects`)
  if (!response.ok) {
    throw new Error(`load projects failed: ${response.status}`)
  }

  const body = (await response.json()) as ProjectsResponse
  return body.projects ?? []
}

export async function fetchActionSuggestions(
  projectID: string,
): Promise<ActionSuggestion[]> {
  const response = await fetch(
    `${apiBaseURL}/api/projects/${projectID}/action-suggestions`,
  )
  if (!response.ok) {
    throw new Error(`load action suggestions failed: ${response.status}`)
  }

  const body = (await response.json()) as ActionSuggestionsResponse
  return body.action_suggestions ?? []
}

export async function fetchAgentRuns(projectID: string): Promise<AgentRun[]> {
  const response = await fetch(`${apiBaseURL}/api/projects/${projectID}/agent-runs`)
  if (!response.ok) {
    throw new Error(`load agent runs failed: ${response.status}`)
  }

  const body = (await response.json()) as AgentRunsResponse
  return body.agent_runs ?? []
}

export async function fetchProjectRisk(projectID: string): Promise<ProjectRisk> {
  const response = await fetch(`${apiBaseURL}/api/projects/${projectID}/risk`)
  if (!response.ok) {
    throw new Error(`load project risk failed: ${response.status}`)
  }

  return (await response.json()) as ProjectRisk
}

export async function fetchAgentConversation(
  projectID: string,
  riskAssessmentID: string,
): Promise<AgentConversation> {
  const params = new URLSearchParams({ risk_assessment_id: riskAssessmentID })
  const response = await fetch(
    `${apiBaseURL}/api/projects/${projectID}/agent-conversation?${params}`,
  )
  if (!response.ok) {
    throw new Error(`load agent conversation failed: ${response.status}`)
  }

  return (await response.json()) as AgentConversation
}

export async function sendAgentConversationTurn(
  conversationID: string,
  riskAssessmentID: string,
  message: string,
): Promise<AgentConversationTurn> {
  const response = await fetch(
    `${apiBaseURL}/api/agent-conversations/${conversationID}/turns`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        risk_assessment_id: riskAssessmentID,
      }),
    },
  )
  if (!response.ok) {
    throw new Error(`send agent conversation turn failed: ${response.status}`)
  }

  return (await response.json()) as AgentConversationTurn
}

export async function confirmActionSuggestion(
  suggestionID: string,
): Promise<ActionSuggestion> {
  const response = await fetch(
    `${apiBaseURL}/api/action-suggestions/${suggestionID}/confirm`,
    { method: 'POST' },
  )
  if (!response.ok) {
    throw new Error(`confirm action suggestion failed: ${response.status}`)
  }

  return (await response.json()) as ActionSuggestion
}

export async function fetchLLMProviders(): Promise<LLMProviderConfig[]> {
  const response = await fetch(`${apiBaseURL}/api/settings/llm-providers`)
  if (!response.ok) {
    throw new Error(`load llm providers failed: ${response.status}`)
  }

  const body = (await response.json()) as LLMProvidersResponse
  return body.providers ?? []
}

export async function saveLLMProvider(
  input: SaveLLMProviderInput,
): Promise<LLMProviderConfig> {
  const response = await fetch(`${apiBaseURL}/api/settings/llm-providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error(`save llm provider failed: ${response.status}`)
  }

  return (await response.json()) as LLMProviderConfig
}
