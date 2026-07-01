import type {
  ActionSuggestion,
  ActionSuggestionsResponse,
  AgentConversation,
  AgentConversationTurn,
  AgentRun,
  AgentRunsResponse,
  AuthSession,
  EvidenceBundle,
  GitHubRepositoryAccess,
  GitHubRepositoryAnalysisResponse,
  GitHubRepositoryLoadProjectResponse,
  GitHubRepositorySyncResponse,
  GitHubSettings,
  LLMProviderConfig,
  LLMProvidersResponse,
  PageContext,
  ProjectRisk,
  ProjectSummary,
  ProjectsResponse,
  SaveLLMProviderInput,
} from './api-types'

export type {
  ActionSuggestion,
  AgentConversationTurn,
  AgentUIBlock,
  AgentRun,
  AuthSession,
  EvidenceBundle,
  EvidenceEvent,
  GitHubRepositoryAccess,
  GitHubSettings,
  LLMProviderConfig,
  PageContext,
  ProjectRisk,
  ProjectSummary,
  ReasoningTraceStep,
} from './api-types'

const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export async function fetchAuthSession(): Promise<AuthSession> {
  const response = await fetch(`${apiBaseURL}/api/auth/session`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`load auth session failed: ${response.status}`)
  }
  return (await response.json()) as AuthSession
}

export function githubOAuthStartURL(): string {
  return `${apiBaseURL}/api/auth/github/start`
}

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

export async function fetchEvidenceBundle(
  riskAssessmentID: string,
): Promise<EvidenceBundle> {
  const response = await fetch(
    `${apiBaseURL}/api/risk-assessments/${riskAssessmentID}/evidence-bundle`,
  )
  if (!response.ok) {
    throw new Error(`load evidence bundle failed: ${response.status}`)
  }

  return (await response.json()) as EvidenceBundle
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
  pageContext?: PageContext,
): Promise<AgentConversationTurn> {
  const payload: {
    message: string
    risk_assessment_id: string
    page_context?: PageContext
  } = {
    message,
    risk_assessment_id: riskAssessmentID,
  }
  if (pageContext) {
    payload.page_context = pageContext
  }
  const response = await fetch(
    `${apiBaseURL}/api/agent-conversations/${conversationID}/turns`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok) {
    throw new Error(`send agent conversation turn failed: ${response.status}`)
  }

  return (await response.json()) as AgentConversationTurn
}

export async function sendAgentConversationTurnStream(
  conversationID: string,
  riskAssessmentID: string,
  message: string,
  pageContext: PageContext | undefined,
  onDelta: (text: string) => void,
): Promise<AgentConversationTurn> {
  const payload: {
    message: string
    risk_assessment_id: string
    page_context?: PageContext
  } = {
    message,
    risk_assessment_id: riskAssessmentID,
  }
  if (pageContext) {
    payload.page_context = pageContext
  }
  const response = await fetch(
    `${apiBaseURL}/api/agent-conversations/${conversationID}/turns/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!response.ok || response.body === null) {
    return sendAgentConversationTurn(
      conversationID,
      riskAssessmentID,
      message,
      pageContext,
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalTurn: AgentConversationTurn | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const eventBlock of events) {
      const event = parseSSEEvent(eventBlock)
      if (event.event === 'delta') {
        const payload = JSON.parse(event.data) as { text?: string }
        if (payload.text) {
          onDelta(payload.text)
        }
      }
      if (event.event === 'turn') {
        finalTurn = JSON.parse(event.data) as AgentConversationTurn
      }
    }
  }
  if (finalTurn === null) {
    throw new Error('streamed agent conversation turn missing final event')
  }
  return finalTurn
}

function parseSSEEvent(block: string): { event: string; data: string } {
  let event = ''
  let data = ''
  for (const line of block.split('\n')) {
    if (line.startsWith('event: ')) {
      event = line.slice('event: '.length)
    }
    if (line.startsWith('data: ')) {
      data += line.slice('data: '.length)
    }
  }
  return { event, data }
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

export async function fetchGitHubSettings(): Promise<GitHubSettings> {
  const response = await fetch(`${apiBaseURL}/api/settings/github`)
  if (!response.ok) {
    throw new Error(`load github settings failed: ${response.status}`)
  }

  return (await response.json()) as GitHubSettings
}

export function githubInstallationStartURL(): string {
  return `${apiBaseURL}/api/github/installations/start`
}

export async function updateGitHubRepositoryAnalysis(
  repositoryID: string,
  analysisEnabled: boolean,
): Promise<GitHubRepositoryAccess> {
  const response = await fetch(
    `${apiBaseURL}/api/settings/github/repositories/${repositoryID}/analysis`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis_enabled: analysisEnabled }),
    },
  )
  if (!response.ok) {
    throw new Error(`update github repository analysis failed: ${response.status}`)
  }

  const body = (await response.json()) as GitHubRepositoryAnalysisResponse
  return body.repository
}

export async function triggerGitHubRepositorySync(
  repositoryID: string,
): Promise<GitHubRepositoryAccess> {
  const response = await fetch(
    `${apiBaseURL}/api/settings/github/repositories/${repositoryID}/sync`,
    { method: 'POST' },
  )
  if (!response.ok) {
    throw new Error(`trigger github repository sync failed: ${response.status}`)
  }

  const body = (await response.json()) as GitHubRepositorySyncResponse
  return body.repository
}

export async function loadGitHubRepositoryProject(
  repositoryID: string,
): Promise<GitHubRepositoryAccess> {
  const response = await fetch(
    `${apiBaseURL}/api/settings/github/repositories/${repositoryID}/load-project`,
    { method: 'POST' },
  )
  if (!response.ok) {
    throw new Error(`load github repository project failed: ${response.status}`)
  }

  const body = (await response.json()) as GitHubRepositoryLoadProjectResponse
  return body.repository
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
