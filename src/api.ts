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
