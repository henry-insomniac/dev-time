import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AgentConversationList } from './AgentConversationList'

describe('AgentConversationList', () => {
  it('展示 Agent turn 的领域和能力', () => {
    render(
      <AgentConversationList
        turns={[
          {
            id: 'turn_1',
            conversation_id: 'conversation_1',
            user_message: '查看 dev-time-agent 的 PR',
            agent_response: 'henry-insomniac/dev-time-agent 当前没有 PR。',
            evidence_refs: [],
            intent: 'github_pull_requests_list',
            domain: 'github',
            entities: {
              repository: {
                full_name: 'henry-insomniac/dev-time-agent',
              },
            },
            capabilities: ['github.pull_requests.list'],
            trace_events: [],
            reasoning_trace: [],
            tool_calls: [],
            approval_request: null,
          },
        ]}
      />,
    )

    expect(screen.getByText(/领域：GitHub/i)).toBeInTheDocument()
    expect(screen.getByText(/能力：GitHub PR 列表/i)).toBeInTheDocument()
  })
})
