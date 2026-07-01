import { CheckCircle2, ChevronDown, CircleX, GitMerge } from 'lucide-react'
import { useState } from 'react'

import type { AgentConversationTurn, AgentUIBlock } from './api'

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
                {turn.domain ? (
                  <span>领域：{formatAgentDomain(turn.domain)}</span>
                ) : null}
                {(turn.capabilities ?? []).length > 0 ? (
                  <span>
                    能力：
                    {(turn.capabilities ?? []).map(formatAgentCapability).join('、')}
                  </span>
                ) : null}
              </div>
              <MarkdownMessage content={turn.agent_response} />
              <AgentUIBlocks blocks={turn.ui_blocks ?? []} />
            </div>
          </div>
          <PRStatusCard turn={turn} />
          <IssueStatusCard turn={turn} />
          {Object.keys(turn.entities ?? {}).length > 0 ? (
            <div className="trace-entities" aria-label="Trace 实体">
              {Object.entries(turn.entities ?? {}).map(([name, value]) => (
                <span key={name}>
                  {name}: {formatEntityValue(value)}
                </span>
              ))}
            </div>
          ) : null}
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

function AgentUIBlocks({ blocks }: { blocks: AgentUIBlock[] }) {
  const supportedBlocks = blocks.filter(isSupportedUIBlock)
  if (supportedBlocks.length === 0) {
    return null
  }
  return (
    <div className="agent-ui-blocks" aria-label="Agent 结构化内容">
      {supportedBlocks.map((block, index) => (
        <AgentUIBlockView block={block} key={`${block.type}-${index}`} />
      ))}
    </div>
  )
}

function AgentUIBlockView({ block }: { block: AgentUIBlock }) {
  const props = block.props ?? {}
  if (block.type === 'text') {
    return (
      <section className="agent-ui-block">
        {stringProp(props, 'title') ? <strong>{stringProp(props, 'title')}</strong> : null}
        <p>{stringProp(props, 'body')}</p>
      </section>
    )
  }
  if (block.type === 'repo_card') {
    return (
      <section className="agent-ui-block" aria-label="仓库卡片">
        <strong>{stringProp(props, 'full_name') || stringProp(props, 'name')}</strong>
        {stringProp(props, 'risk_level') ? (
          <span>风险：{stringProp(props, 'risk_level')}</span>
        ) : null}
      </section>
    )
  }
  if (block.type === 'pr_table') {
    const rows = arrayProp(props, 'rows')
    return (
      <table className="agent-ui-block-table" aria-label="PR 列表">
        <thead>
          <tr>
            <th>PR</th>
            <th>标题</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${stringProp(row, 'number')}-${index}`}>
              <td>#{stringProp(row, 'number')}</td>
              <td>{stringProp(row, 'title')}</td>
              <td>{stringProp(row, 'state')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (block.type === 'check_summary') {
    const checks = arrayProp(props, 'checks')
    return (
      <section className="agent-ui-block" aria-label="Checks 摘要">
        <strong>Checks</strong>
        {checks.map((check, index) => (
          <p key={`${stringProp(check, 'name')}-${index}`}>
            {stringProp(check, 'name')} ·{' '}
            {stringProp(check, 'conclusion') || stringProp(check, 'status')}
            {stringProp(check, 'run_id') ? ` · run ${stringProp(check, 'run_id')}` : ''}
          </p>
        ))}
      </section>
    )
  }
  if (block.type === 'log_excerpt') {
    const lines = stringArrayProp(props, 'lines')
    const text = lines.length > 0 ? lines.join('\n') : stringProp(props, 'text')
    return (
      <section className="agent-ui-block" aria-label="日志摘录">
        {stringProp(props, 'title') ? <strong>{stringProp(props, 'title')}</strong> : null}
        <pre>
          <code>{text}</code>
        </pre>
      </section>
    )
  }
  if (block.type === 'approval_card') {
    const actions = arrayProp(props, 'actions')
    return (
      <section className="agent-ui-block" aria-label="审批卡片">
        <strong>审批：{stringProp(props, 'status') || 'pending'}</strong>
        {actions.map((action, index) => (
          <div className="agent-ui-block-item" key={`${stringProp(action, 'target_ref')}-${index}`}>
            <span>{stringProp(action, 'target_ref')}</span>
            <p>{stringProp(action, 'draft_body')}</p>
          </div>
        ))}
      </section>
    )
  }
  if (block.type === 'config_diff') {
    const files = arrayProp(props, 'files')
    return (
      <section className="agent-ui-block" aria-label="配置变更">
        <strong>配置变更</strong>
        {files.map((file, index) => (
          <div className="agent-ui-block-item" key={`${stringProp(file, 'path')}-${index}`}>
            <span>{stringProp(file, 'path')}</span>
            <pre>
              <code>
                {stringProp(file, 'before')}
                {'\n'}
                {stringProp(file, 'after')}
              </code>
            </pre>
          </div>
        ))}
      </section>
    )
  }
  return null
}

function isSupportedUIBlock(block: AgentUIBlock): boolean {
  return [
    'text',
    'repo_card',
    'pr_table',
    'check_summary',
    'log_excerpt',
    'approval_card',
    'config_diff',
  ].includes(block.type)
}

function stringProp(props: Record<string, unknown>, key: string): string {
  const value = props[key]
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  return ''
}

function arrayProp(
  props: Record<string, unknown>,
  key: string,
): Array<Record<string, unknown>> {
  const value = props[key]
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item),
  )
}

function stringArrayProp(props: Record<string, unknown>, key: string): string[] {
  const value = props[key]
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function PRStatusCard({ turn }: { turn: AgentConversationTurn }) {
  const prNumber = Number((turn.entities ?? {}).pr_number)
  if (!Number.isFinite(prNumber) || prNumber <= 0) {
    return null
  }
  const status = inferTurnStatus(turn)
  const url = findEntityURL(turn.entities, 'pull_request')
  const StatusIcon =
    status === 'merged' ? GitMerge : status === 'passed' ? CheckCircle2 : CircleX

  return (
    <article
      className={`pr-status-card pr-status-card-${status}`}
      aria-label={`PR #${prNumber} 状态`}
    >
      <div className="pr-status-card-header">
        <StatusIcon aria-hidden="true" size={18} />
        <strong>PR #{prNumber}</strong>
        <span>{formatPRStatus(status)}</span>
      </div>
      {url ? <a href={url}>打开 PR</a> : null}
    </article>
  )
}

function IssueStatusCard({ turn }: { turn: AgentConversationTurn }) {
  const issueNumber = Number((turn.entities ?? {}).issue_number)
  if (!Number.isFinite(issueNumber) || issueNumber <= 0) {
    return null
  }
  const status = inferIssueStatus(turn)
  const url = findEntityURL(turn.entities, 'issue')
  const StatusIcon = status === 'closed' ? CheckCircle2 : CircleX

  return (
    <article
      className={`pr-status-card issue-status-card-${status}`}
      aria-label={`Issue #${issueNumber} 状态`}
    >
      <div className="pr-status-card-header">
        <StatusIcon aria-hidden="true" size={18} />
        <strong>Issue #{issueNumber}</strong>
        <span>{formatIssueStatus(status)}</span>
      </div>
      {url ? <a href={url}>打开 Issue</a> : null}
    </article>
  )
}

function MarkdownMessage({ content }: { content: string }) {
  const parts = content.split(/```(?:\w+)?\n?([\s\S]*?)```/g)
  return (
    <div className="markdown-message">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <pre key={`${index}-${part.slice(0, 12)}`}>
            <code>{part.trim()}</code>
          </pre>
        ) : (
          part
            .split(/\n{2,}/)
            .filter((paragraph) => paragraph.trim() !== '')
            .map((paragraph) => (
              <p key={`${index}-${paragraph.slice(0, 12)}`}>
                {paragraph.trim()}
              </p>
            ))
        ),
      )}
    </div>
  )
}

function inferTurnStatus(turn: AgentConversationTurn): 'passed' | 'failed' | 'merged' {
  const text = `${turn.intent} ${turn.agent_response}`.toLowerCase()
  if (text.includes('merge') || text.includes('merged') || text.includes('合并')) {
    return 'merged'
  }
  if (text.includes('失败') || text.includes('红') || text.includes('failure') || text.includes('failed')) {
    return 'failed'
  }
  return 'passed'
}

function formatPRStatus(status: 'passed' | 'failed' | 'merged'): string {
  const labels = {
    passed: '通过',
    failed: '失败',
    merged: '已合并',
  }
  return labels[status]
}

function inferIssueStatus(turn: AgentConversationTurn): 'open' | 'closed' {
  const text = `${turn.intent} ${turn.agent_response}`.toLowerCase()
  if (
    text.includes('closed') ||
    text.includes('resolved') ||
    text.includes('fixed') ||
    text.includes('关闭') ||
    text.includes('已解决') ||
    text.includes('修复')
  ) {
    return 'closed'
  }
  return 'open'
}

function formatIssueStatus(status: 'open' | 'closed'): string {
  const labels = {
    open: '未关闭',
    closed: '已关闭',
  }
  return labels[status]
}

function findEntityURL(entities: Record<string, unknown>, entityName: string): string {
  const entity = entities[entityName]
  if (
    entity &&
    typeof entity === 'object' &&
    'url' in entity &&
    typeof entity.url === 'string'
  ) {
    return entity.url
  }
  if (
    entity &&
    typeof entity === 'object' &&
    'html_url' in entity &&
    typeof entity.html_url === 'string'
  ) {
    return entity.html_url
  }
  return ''
}

function formatEntityValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    if (
      'name' in value &&
      typeof value.name === 'string'
    ) {
      return value.name
    }
    if (
      'full_name' in value &&
      typeof value.full_name === 'string'
    ) {
      return value.full_name
    }
    return JSON.stringify(value)
  }
  return String(value)
}

function formatAgentIntent(intent: string): string {
  const labels: Record<string, string> = {
    smalltalk: '普通对话',
    self_intro: '自我介绍',
    clarify: '需要澄清',
    project_status: '项目状态',
    risk_explain: '风险解释',
    action_plan: '行动计划',
    github_auth_status: 'GitHub 授权状态',
    github_repository_list: 'GitHub 项目列表',
    github_repository_detail: 'GitHub 项目详情',
    github_pull_requests_list: 'GitHub PR 列表',
    github_issues_list: 'GitHub Issue 列表',
    github_checks_list: 'GitHub CI 列表',
    github_pr_ci_diagnosis: 'PR CI 诊断',
  }
  return labels[intent] ?? intent
}

function formatAgentDomain(domain: string): string {
  const labels: Record<string, string> = {
    github: 'GitHub',
  }
  return labels[domain] ?? domain
}

function formatAgentCapability(capability: string): string {
  const labels: Record<string, string> = {
    'github.auth.status': 'GitHub 授权状态',
    'github.repos.list': 'GitHub 项目列表',
    'github.repo.detail': 'GitHub 项目详情',
    'github.pull_requests.list': 'GitHub PR 列表',
    'github.issues.list': 'GitHub Issue 列表',
    'github.checks.list': 'GitHub CI 列表',
    'github.checks.logs': 'GitHub CI 日志',
  }
  return labels[capability] ?? capability
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
