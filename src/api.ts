export type ProjectSummary = {
  id: string
  name: string
  risk_score: number
  risk_level: 'stable' | 'low' | 'medium' | 'high'
}

export type ProjectsResponse = {
  projects: ProjectSummary[]
}

const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const response = await fetch(`${apiBaseURL}/api/projects`)
  if (!response.ok) {
    throw new Error(`load projects failed: ${response.status}`)
  }

  const body = (await response.json()) as ProjectsResponse
  return body.projects
}
