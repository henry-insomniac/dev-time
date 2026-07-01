export type ProjectSummary = {
  id: string
  name: string
  risk_score: number
  risk_level: 'stable' | 'low' | 'medium' | 'high'
}

export type ProjectsResponse = {
  projects: ProjectSummary[]
}

export type AuthSession = {
  connected: boolean
  user: {
    login: string
    name: string
    avatar_url: string
    html_url: string
  } | null
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

export type EvidenceEvent = {
  id: string
  event_type: string
  github_object_type: string
  github_object_id: string
  normalized_summary: string
  payload: unknown
}

export type EvidenceBundle = {
  project: ProjectSummary
  assessment: ProjectRisk['assessment']
  signals: ProjectRisk['signals']
  events: EvidenceEvent[]
  allowed_actions: string[]
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
  domain: string
  entities: Record<string, unknown>
  capabilities: string[]
  page_context?: PageContext
  trace_events: AgentTraceEvent[]
  reasoning_trace: ReasoningTraceStep[]
  tool_calls: AgentToolCall[]
  ui_blocks?: AgentUIBlock[]
  approval_request: AgentApprovalRequest | null
}

export type AgentUIBlock =
  | {
      type: 'text'
      props?: { title?: string; body?: string }
    }
  | {
      type: 'repo_card'
      props?: Record<string, unknown>
    }
  | {
      type: 'pr_table'
      props?: { rows?: Array<Record<string, unknown>> }
    }
  | {
      type: 'check_summary'
      props?: { checks?: Array<Record<string, unknown>> }
    }
  | {
      type: 'log_excerpt'
      props?: { title?: string; lines?: string[]; text?: string }
    }
  | {
      type: 'approval_card'
      props?: { status?: string; actions?: Array<Record<string, unknown>> }
    }
  | {
      type: 'config_diff'
      props?: { files?: Array<Record<string, unknown>> }
    }
  | {
      type: string
      props?: Record<string, unknown>
    }

export type PageContext = {
  route: string
  locale?: string
  timezone?: string
  user_role?: string
  selected_resource?: {
    type: 'project' | 'repository'
    id: string
    name: string
  }
  visible_fields?: Record<string, unknown>
  recent_actions?: Array<Record<string, unknown>>
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

export type ReasoningTraceStep = {
  stage: string
  title: string
  summary: string
  status: string
  confidence: number | null
  evidence_refs: string[]
  tool_call: AgentToolCall | null
}

export type AgentToolCall = {
  name: string
  status: string
  evidence_refs?: string[]
}

export type AgentApprovalRequest = {
  status: string
  reason: string
  actions: Array<{
    action_suggestion_id?: string
    action_type: string
    target_ref: string
    draft_body: string
    evidence_refs: string[]
    required_permission: string
  }>
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

export type GitHubRepositoryAccess = {
  id: string
  github_id: number
  owner: string
  name: string
  full_name: string
  project_id: string | null
  analysis_enabled: boolean
  sync_status: string
  last_synced_at: string | null
  sync_failure_reason: string | null
}

export type GitHubSettings = {
  connected: boolean
  provider: 'github_app'
  repositories: GitHubRepositoryAccess[]
  permissions: string[]
  storage_status?: 'ready' | 'unavailable'
  installation_configured?: boolean
}

export type GitHubRepositoryAnalysisResponse = {
  repository: GitHubRepositoryAccess
}

export type GitHubRepositorySyncResponse = {
  repository: GitHubRepositoryAccess
}

export type GitHubRepositoryLoadProjectResponse = {
  project: {
    id: string
    repository_id: string
    name: string
  }
  repository: GitHubRepositoryAccess
}
