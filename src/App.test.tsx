import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'

describe('Dev Time risk workspace', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('selects the highest risk project by default', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /dev-time-agent/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/risk score 70/i)).toBeInTheDocument()
    expect(
      within(screen.getByLabelText(/selected risk/i)).getByText(
        /test failed and is blocking progress/i,
      ),
    ).toBeInTheDocument()
  })

  it('syncs the detail area and agent dock when a project is selected', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /dev-time stable/i }))

    expect(
      screen.getByRole('heading', { name: /dev-time$/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/risk score 0/i)).toBeInTheDocument()
    expect(screen.getByText(/agent context: dev-time/i)).toBeInTheDocument()
  })

  it('loads projects from the server risk queue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          projects: [
            {
              id: 'project_server',
              name: 'dev-time-server',
              risk_score: 82,
              risk_level: 'high',
            },
          ],
        }),
      }),
    )

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /dev-time-server high/i }),
      ).toBeInTheDocument()
    })
    expect(screen.getByText(/risk score 82/i)).toBeInTheDocument()
    expect(
      screen.getByText(/agent context: dev-time-server/i),
    ).toBeInTheDocument()
  })
})
