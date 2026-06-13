import type {
  ActionSuggestion,
  ActionSuggestionsResponse,
  AgentConversation,
  AgentConversationTurn,
  AgentRun,
  AgentRunsResponse,
  LLMProviderConfig,
  LLMProvidersResponse,
  ProjectRisk,
  ProjectSummary,
  ProjectsResponse,
  SaveLLMProviderInput,
} from './api-types'

export type {
  ActionSuggestion,
  AgentConversationTurn,
  AgentRun,
  LLMProviderConfig,
  ProjectSummary,
  ReasoningTraceStep,
} from './api-types'

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
