import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import type { AgentConversationTurn } from './api'

type AgentConversationListProps = {
  turns: AgentConversationTurn[]
}

export function AgentConversationList({ turns }: AgentConversationListProps) {
  const [expandedTurns, setExpandedTurns] = useState<Record<string, boolean>>({})

  if (turns.length === 0) {
    return null
  }

  return (
    <div className="conversation-turns" aria-label="Agent 对话记录">
      {turns.map((turn) => (
        <article className="conversation-turn" key={turn.id}>
          <div className="message-row message-row-user">
            <p className="message-bubble message-bubble-user">{turn.user_message}</p>
          </div>
          <div className="message-row message-row-agent">
            <div className="message-bubble message-bubble-agent">
              <div className="message-agent-meta">
                <strong>Agent</strong>
                <span>意图：{formatAgentIntent(turn.intent)}</span>
              </div>
              <p>{turn.agent_response}</p>
            </div>
          </div>
          {(turn.evidence_refs ?? []).length > 0 ? (
            <div className="evidence-chips" aria-label="回复证据">
              {(turn.evidence_refs ?? []).map((evidenceRef) => (
                <span key={evidenceRef}>{evidenceRef}</span>
              ))}
            </div>
          ) : null}
          {(turn.tool_calls ?? []).length > 0 ? (
            <div className="tool-call-summary" aria-label="工具调用">
              {(turn.tool_calls ?? []).map((toolCall) => (
                <span key={`${turn.id}-${toolCall.name}`}>
                  {toolCall.name} · {formatToolStatus(toolCall.status)}
                </span>
              ))}
            </div>
          ) : null}
          {turn.approval_request ? (
            <div className="approval-summary" aria-label="待确认行动">
              <strong>待确认行动</strong>
              <p>{turn.approval_request.reason}</p>
              {turn.approval_request.actions.map((action) => (
                <div
                  className="approval-action"
                  key={action.action_suggestion_id ?? action.target_ref}
                >
                  <span>{action.target_ref}</span>
                  <p>{action.draft_body}</p>
                  <small>权限：{action.required_permission}</small>
                </div>
              ))}
            </div>
          ) : null}
          {(turn.reasoning_trace ?? []).length === 0 &&
          (turn.trace_events ?? []).length > 0 ? (
            <div className="trace-list" aria-label="Agent Trace">
              {(turn.trace_events ?? []).map((traceEvent) => (
                <p key={traceEvent.id}>Trace：{traceEvent.title}</p>
              ))}
            </div>
          ) : null}
          {(turn.reasoning_trace ?? []).length > 0 ? (
            <div className="reasoning-panel">
              <button
                aria-controls={`reasoning-${turn.id}`}
                aria-expanded={Boolean(expandedTurns[turn.id])}
                className="reasoning-toggle"
                onClick={() => toggleReasoningTrace(turn.id)}
                type="button"
              >
                <ChevronDown aria-hidden="true" size={16} />
                思考过程 · {turn.reasoning_trace.length} 步
              </button>
              {expandedTurns[turn.id] ? (
                <div className="reasoning-steps" id={`reasoning-${turn.id}`}>
                  {turn.reasoning_trace.map((step, index) => (
                    <div
                      className="reasoning-step"
                      key={`${turn.id}-${step.stage}-${index}`}
                    >
                      <div className="reasoning-step-header">
                        <strong>{step.title}</strong>
                        <span>{formatReasoningStage(step.stage)}</span>
                      </div>
                      <p>{step.summary}</p>
                      {step.confidence !== null ? (
                        <small>置信度：{Math.round(step.confidence * 100)}%</small>
                      ) : null}
                      {step.tool_call ? (
                        <small>
                          工具：{step.tool_call.name} ·{' '}
                          {formatToolStatus(step.tool_call.status)}
                        </small>
                      ) : null}
                      {(step.evidence_refs ?? []).length > 0 ? (
                        <div className="evidence-chips">
                          {step.evidence_refs.map((evidenceRef) => (
                            <span key={evidenceRef}>{evidenceRef}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )

  function toggleReasoningTrace(turnID: string) {
    const isOpening = !expandedTurns[turnID]
    setExpandedTurns((currentState) => ({
      ...currentState,
      [turnID]: !currentState[turnID],
    }))
    if (isOpening) {
      window.requestAnimationFrame(() => {
        document
          .getElementById(`reasoning-${turnID}`)
          ?.scrollIntoView({ block: 'nearest' })
      })
    }
  }
}

function formatAgentIntent(intent: string): string {
  const labels: Record<string, string> = {
    smalltalk: '普通对话',
    self_intro: '自我介绍',
    clarify: '需要澄清',
    project_status: '项目状态',
    risk_explain: '风险解释',
    action_plan: '行动计划',
  }
  return labels[intent] ?? intent
}

function formatReasoningStage(stage: string): string {
  const labels: Record<string, string> = {
    context: '上下文',
    intent: '意图',
    memory: '记忆',
    planning: '规划',
    tool_call: '工具',
    evidence: '证据',
    generation: '生成',
    verification: '审核',
    approval: '确认',
    error: '错误',
  }
  return labels[stage] ?? stage
}

function formatToolStatus(status: string): string {
  const labels: Record<string, string> = {
    succeeded: '成功',
    failed: '失败',
    skipped: '跳过',
  }
  return labels[status] ?? status
}
