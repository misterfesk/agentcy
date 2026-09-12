import type {
  ActivityEvent,
  Agent,
  AgentRun,
  ApiErrorBody,
  Approval,
  CeoAnswer,
  CursorPage,
  DashboardBriefing,
  DecisionItem,
  Employee,
  EntityRef,
  EntityType,
  Lead,
  LeadStage,
  LiveEvent,
  NotificationItem,
  Project,
  Report,
  SearchHit,
  Task,
  Ticket,
  TicketMessage,
  Todo,
} from '@/types/domain'
import { createApprovals, createNotifications, createReports, createRuns } from './seed-more'
import {
  createAgents,
  createEmployees,
  createLeads,
  createProjects,
  createTasks,
  createTickets,
  createTodos,
  id,
  MAYA,
  nowOffset,
  USER,
} from './seed'

export class ApiError extends Error {
  code: string
  status: number
  fields?: Record<string, string>
  request_id: string

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message)
    this.code = body.code
    this.status = status
    this.fields = body.fields
    this.request_id = body.request_id
  }
}

type Listener = (event: LiveEvent) => void

function page<T>(data: T[]): CursorPage<T> {
  return { data, meta: { next_cursor: null, has_more: false } }
}

function reqId() {
  return `req_demo_${Math.random().toString(36).slice(2, 10)}`
}

let seq = 800

function nextId(prefix: string) {
  seq += 1
  return id(prefix, seq)
}

class DemoStore {
  employees = createEmployees()
  agents = createAgents()
  projects = createProjects()
  tasks = createTasks()
  todos = createTodos()
  leads = createLeads()
  tickets = createTickets()
  approvals = createApprovals()
  runs = createRuns()
  reports = createReports()
  notifications = createNotifications()
  activity: ActivityEvent[] = []
  events: LiveEvent[] = []
  listeners = new Set<Listener>()
  demoLoaded = true
  eventTick = 0

  user() {
    return USER
  }

  briefing(): DashboardBriefing {
    const waiting = this.approvals.filter((a) => a.status === 'requested')
    const blocked = this.tasks.filter((t) => t.status === 'blocked')
    const sla = this.tickets.filter((t) => t.queues.includes('sla_risk') && t.status !== 'resolved')
    const activeRuns = this.runs.filter((r) =>
      ['queued', 'running', 'awaiting_input', 'awaiting_approval'].includes(r.status),
    )
    const overdueLeads = this.leads.filter(
      (l) => l.next_step_at && new Date(l.next_step_at).getTime() < Date.now() && !['won', 'lost'].includes(l.stage),
    )

    const decision_queue: DecisionItem[] = [
      {
        id: 'dec_001',
        decision: 'Approve or edit the Northstar latency reply',
        related: { type: 'ticket', id: 'tkt_001', label: 'NS-184 Portal API latency' },
        reason: 'A generated reply is waiting. It has not been sent. SLA is still open.',
        requester: { type: 'agent', id: 'agt_002', label: 'Support Agent' },
        elapsed_at: nowOffset(-8),
        next_action: 'Review draft',
        href_kind: 'ticket',
      },
      {
        id: 'dec_002',
        decision: 'Absorb Helios revision #4 or issue a change order',
        related: { type: 'task', id: 'tsk_001', label: 'Decide Helios homepage revision #4' },
        reason: 'Content freeze is blocked. This is scope creep, not a quality issue.',
        requester: { type: 'agent', id: 'agt_004', label: 'Helios Account Agent' },
        elapsed_at: nowOffset(-40),
        next_action: 'Call the decision',
        href_kind: 'approval',
      },
      {
        id: 'dec_003',
        decision: 'Assign Atlas pause ticket AT-12',
        related: { type: 'ticket', id: 'tkt_005', label: 'AT-12 Request to pause retainers' },
        reason: 'Unassigned churn signal. Auto-confirming a pause would be the wrong action.',
        requester: { type: 'client', id: 'cli_004', label: 'Atlas Fintech' },
        elapsed_at: nowOffset(-4 * 60),
        next_action: 'Assign owner',
        href_kind: 'ticket',
      },
      {
        id: 'dec_004',
        decision: 'Retry or repair the Meridian CRM write',
        related: { type: 'agent_run', id: 'run_003', label: 'Meridian CRM update' },
        reason: 'Agent action failed on a required field. No client message was sent.',
        requester: { type: 'agent', id: 'agt_005', label: 'Meridian Account Agent' },
        elapsed_at: nowOffset(-93),
        next_action: 'Inspect run',
        href_kind: 'agent_run',
      },
    ]

    return {
      generated_at: nowOffset(-22),
      health: {
        status: waiting.length || sla.length ? 'attention' : 'stable',
        summary:
          'Two human decisions and one support SLA risk need attention. Helios delivery is blocked on a founder call; Northstar’s reply is drafted but not sent.',
      },
      counts: {
        waiting_for_human: waiting.length,
        blocked_tasks: blocked.length,
        sla_risk_tickets: sla.length,
        active_agent_runs: activeRuns.length,
        overdue_lead_followups: overdueLeads.length,
      },
      decision_queue,
      today_todos: this.todos.filter((t) => !t.completed),
      live_runs: this.runs.filter((r) => r.status !== 'cancelled'),
      project_health: this.projects.filter((p) => p.health !== 'complete'),
      ticket_risks: sla,
      pipeline_risks: this.leads.filter((l) => l.health_reasons.length > 0),
      capacity_alerts: this.employees
        .filter((e) => e.workload === 'over_capacity' || e.availability === 'away')
        .map((e) => ({
          id: `cap_${e.id}`,
          title: e.workload === 'over_capacity' ? `${e.name} is over capacity` : `${e.name} is unavailable`,
          reason: e.workload_reason,
          related: { type: 'employee', id: e.id, label: e.name },
        })),
      recent_reports: this.reports.filter((r) => r.status !== 'superseded').slice(0, 4),
      first_run: !this.demoLoaded,
    }
  }

  search(q: string): CursorPage<SearchHit> {
    const query = q.trim().toLowerCase()
    if (!query) return page([])
    const hits: SearchHit[] = []
    const push = (type: EntityType, itemId: string, label: string, context: string) => {
      if (`${label} ${context}`.toLowerCase().includes(query)) {
        hits.push({ id: itemId, type, label, context })
      }
    }
    this.leads.forEach((l) => push('lead', l.id, l.organization, `${l.stage} · ${l.contact_name}`))
    this.tickets.forEach((t) => push('ticket', t.id, `${t.number} ${t.subject}`, t.client.label))
    this.projects.forEach((p) => push('project', p.id, p.name, p.client.label))
    this.tasks.forEach((t) => push('task', t.id, t.title, t.project.label))
    this.employees.forEach((e) => push('employee', e.id, e.name, e.role))
    this.reports.forEach((r) => push('report', r.id, r.title, r.period_label))
    this.runs.forEach((r) => push('agent_run', r.id, r.action_label, r.agent.label))
    this.todos.forEach((t) => push('todo', t.id, t.title, t.group))
    return page(hits.slice(0, 12))
  }

  askCeo(question: string): CeoAnswer {
    const q = question.toLowerCase()
    if (q.includes('decision')) {
      return {
        question,
        answer:
          'Two decisions are actually yours right now. First: approve, edit, or reject the Northstar NS-184 draft — it is not sent. Second: absorb Helios revision #4 or issue a change order so Priya can freeze content. Atlas AT-12 is unassigned and should not be auto-paused.',
        linked_records: [
          { type: 'ticket', id: 'tkt_001', label: 'NS-184' },
          { type: 'approval', id: 'apr_002', label: 'Helios change order' },
          { type: 'ticket', id: 'tkt_005', label: 'AT-12' },
        ],
        provenance: [
          { type: 'report', id: 'rpt_001', label: 'Daily operations brief r3' },
          { type: 'agent_run', id: 'run_002', label: 'Generated operations briefing' },
        ],
        generated_at: nowOffset(0),
      }
    }
    if (q.includes('risk') || q.includes('project')) {
      return {
        question,
        answer:
          'Helios Health Website Revamp is At risk because homepage revision #4 is outside the signed SOW — the backend reason is scope/revision creep, not percent-complete. Northstar Needs attention because Sam is away and NS-184 is still an unsent draft. Atlas Retain is At risk on silence plus a pause request.',
        linked_records: [
          { type: 'project', id: 'prj_002', label: 'Helios Health Website Revamp' },
          { type: 'project', id: 'prj_001', label: 'Northstar Customer Portal' },
          { type: 'project', id: 'prj_004', label: 'Atlas Fintech Retain' },
        ],
        provenance: [{ type: 'report', id: 'rpt_001', label: 'Daily operations brief r3' }],
        generated_at: nowOffset(0),
      }
    }
    if (q.includes('lead') || q.includes('next step')) {
      return {
        question,
        answer:
          'Vesper Hotels has a sent proposal and no follow-up. Brightline Schools has no owner. Lumen Pay is still missing qualification data, so it must stay in New. Harbor Clinic is the healthy negotiation.',
        linked_records: [
          { type: 'lead', id: 'led_001', label: 'Vesper Hotels' },
          { type: 'lead', id: 'led_002', label: 'Brightline Schools' },
          { type: 'lead', id: 'led_004', label: 'Lumen Pay' },
        ],
        provenance: [{ type: 'report', id: 'rpt_004', label: 'Pipeline review' }],
        generated_at: nowOffset(0),
      }
    }
    return {
      question,
      answer:
        'Today’s priorities: send the Northstar draft if you accept it, call the Helios commercial decision, assign Atlas, and leave Meridian with the client — they still hold the pixel IDs. Jordan is over capacity; do not add Atlas to Jordan without taking work off.',
      linked_records: [
        { type: 'todo', id: 'tdo_001', label: 'Approve Northstar latency reply' },
        { type: 'employee', id: 'emp_002', label: 'Jordan Hale' },
      ],
      provenance: [{ type: 'report', id: 'rpt_001', label: 'Daily operations brief r3' }],
      generated_at: nowOffset(0),
    }
  }

  patchTodo(todoId: string, body: Partial<Todo> & { version?: number }) {
    const todo = this.require(this.todos, todoId, 'todo')
    this.assertVersion(todo.version, body.version)
    if (body.completed && !todo.completable) {
      throw this.err(422, 'VALIDATION_ERROR', 'This item cannot be completed from the list. Finish the linked approval or send first.')
    }
    if (body.blocker_reason) {
      todo.blocker_reason = body.blocker_reason
      todo.group = 'waiting_on_client'
    }
    if (typeof body.completed === 'boolean') todo.completed = body.completed
    todo.version += 1
    return this.mutated(todo, `Todo updated: ${todo.title}`)
  }

  patchTask(taskId: string, body: Partial<Task> & { version?: number }) {
    const task = this.require(this.tasks, taskId, 'task')
    this.assertVersion(task.version, body.version)
    if (body.status) task.status = body.status
    if (body.assignee) {
      task.assignee = body.assignee
      task.assignee_kind = body.assignee.type === 'agent' ? 'agent' : 'human'
    }
    if (body.blocker_reason !== undefined) {
      task.blocker_reason = body.blocker_reason
      if (body.blocker_reason) task.status = 'blocked'
    }
    task.latest_activity = 'Updated by operator'
    task.latest_activity_at = nowOffset(0)
    task.version += 1
    return this.mutated(task, `Task updated: ${task.title}`)
  }

  delegateTask(
    taskId: string,
    input: { assignee: EntityRef; expected_result: string; due_at: string; requires_approval: boolean; version?: number },
  ) {
    const task = this.require(this.tasks, taskId, 'task')
    this.assertVersion(task.version, input.version)
    task.assignee = input.assignee
    task.assignee_kind = input.assignee.type === 'agent' ? 'agent' : 'human'
    task.due_at = input.due_at
    task.status = 'in_progress'
    const run: AgentRun = {
      id: nextId('run'),
      agent: input.assignee.type === 'agent' ? input.assignee : { type: 'agent', id: 'agt_006', label: 'Jordan Subagent' },
      goal: input.expected_result,
      action_label: 'Delegated work started',
      related: { type: 'task', id: task.id, label: task.title },
      status: input.requires_approval ? 'queued' : 'running',
      started_at: nowOffset(0),
      ended_at: null,
      duration_ms: null,
      trigger: 'Operator delegation',
      initiator: MAYA,
      model_version: 'delegate.v1',
      cost_tokens: null,
      approval_state: input.requires_approval ? 'requested' : 'none',
      outcome_summary: 'Delegation accepted. The task is not complete.',
      inputs_summary: `Expected result: ${input.expected_result}`,
      actions: [],
      outputs: [],
      events: [
        {
          id: nextId('evt'),
          at: nowOffset(0),
          title: 'Delegated',
          detail: 'Linked run created. Work is not finished.',
          kind: 'system',
        },
      ],
      related_records: [{ type: 'task', id: task.id, label: task.title }],
      failure: null,
      version: 1,
    }
    this.runs.unshift(run)
    task.linked_run_ids = [...task.linked_run_ids, run.id]
    task.version += 1
    this.emit('agent_run.updated', run.id, 'agent_run', `Delegated “${task.title}”. Linked run is ${run.status}.`)
    return this.mutated({ task, run }, `Delegated ${task.title}`)
  }

  patchLead(leadId: string, body: Partial<Lead> & { lost_reason?: string; version?: number }) {
    const lead = this.require(this.leads, leadId, 'lead')
    this.assertVersion(lead.version, body.version)
    if (body.stage && body.stage !== lead.stage) {
      this.assertLeadTransition(lead, body.stage)
      if (body.stage === 'won') {
        lead.stage = 'won'
        lead.linked_client_id = nextId('cli')
        lead.linked_project_id = nextId('prj')
        lead.health_reasons = []
      } else if (body.stage === 'lost') {
        if (!body.lost_reason) {
          throw this.err(422, 'VALIDATION_ERROR', 'A lost reason is required.', { lost_reason: 'Required.' })
        }
        lead.stage = 'lost'
        lead.notes = `${lead.notes}\nLost reason: ${body.lost_reason}`
      } else {
        lead.stage = body.stage
      }
    }
    if (body.owner !== undefined) lead.owner = body.owner
    if (body.next_step !== undefined) lead.next_step = body.next_step
    if (body.next_step_at !== undefined) lead.next_step_at = body.next_step_at
    lead.version += 1
    this.emit('lead.updated', lead.id, 'lead', `${lead.organization} is now ${lead.stage}.`)
    return this.mutated(lead, `Lead updated: ${lead.organization}`)
  }

  postTicketMessage(
    ticketId: string,
    input: { mode: 'reply' | 'note' | 'draft'; body: string; version?: number },
  ) {
    const ticket = this.require(this.tickets, ticketId, 'ticket')
    this.assertVersion(ticket.version, input.version)
    const message: TicketMessage = {
      id: nextId('msg'),
      ticket_id: ticket.id,
      speaker: input.mode === 'note' ? 'human' : input.mode === 'draft' ? 'agent' : 'human',
      speaker_name: input.mode === 'draft' ? 'Support Agent' : 'Maya Chen',
      body: input.body,
      created_at: nowOffset(0),
      delivery_state: input.mode === 'reply' ? 'queued' : input.mode === 'draft' ? 'draft' : 'sent',
      delivery_at: input.mode === 'note' ? nowOffset(0) : null,
      delivery_id: null,
      approved_by: input.mode === 'note' ? MAYA : null,
      channel: input.mode === 'note' ? 'internal' : 'telegram',
    }
    if (input.mode === 'draft') {
      ticket.draft = { ...message, delivery_state: 'awaiting_approval' }
      this.approvals.unshift({
        id: nextId('apr'),
        action_label: `Send draft on ${ticket.number}`,
        effect: 'Delivers the drafted message on Telegram. Not delivered until approved and sent.',
        related: { type: 'ticket', id: ticket.id, label: `${ticket.number} ${ticket.subject}` },
        requester: { type: 'agent', id: 'agt_002', label: 'Support Agent' },
        requested_at: nowOffset(0),
        expires_at: nowOffset(4 * 60),
        rationale: 'External send.',
        status: 'requested',
        decided_by: null,
        decided_at: null,
        conflict_reason: null,
        version: 1,
      })
    } else if (input.mode === 'reply') {
      ticket.messages.push(message)
      ticket.latest_preview = 'Queued for delivery. Not yet confirmed sent.'
    } else {
      ticket.messages.push(message)
    }
    ticket.updated_at = nowOffset(0)
    ticket.version += 1
    return this.mutated(ticket, `Message recorded on ${ticket.number}`)
  }

  patchTicket(
    ticketId: string,
    body: {
      version?: number
      assignee?: EntityRef | null
      status?: Ticket['status']
      escalate?: boolean
      convert_to_task?: boolean
      send_draft?: boolean
      approve_draft?: boolean
      reject_draft?: boolean
      edit_draft?: string
    },
  ) {
    const ticket = this.require(this.tickets, ticketId, 'ticket')
    this.assertVersion(ticket.version, body.version)
    if (body.assignee !== undefined) {
      ticket.assignee = body.assignee
      ticket.assignee_kind = body.assignee ? 'human' : 'unassigned'
    }
    if (body.escalate) {
      ticket.status = 'escalated'
      if (!ticket.queues.includes('escalated')) ticket.queues.push('escalated')
    }
    if (body.convert_to_task) {
      const task: Task = {
        id: nextId('tsk'),
        title: `Follow ${ticket.number}: ${ticket.subject}`,
        description: ticket.latest_preview,
        acceptance_criteria: ['Ticket has a next human action'],
        project: this.projects[0] ? { type: 'project', id: this.projects[0].id, label: this.projects[0].name } : { type: 'project', id: 'prj_001', label: 'Northstar Customer Portal' },
        client: ticket.client,
        owner: MAYA,
        assignee: ticket.assignee,
        assignee_kind: ticket.assignee_kind,
        status: 'ready',
        priority: ticket.priority,
        due_at: ticket.sla_deadline_at,
        latest_activity_at: nowOffset(0),
        latest_activity: 'Converted from ticket.',
        blocker_reason: null,
        waiting_on: null,
        linked_ticket_id: ticket.id,
        linked_lead_id: null,
        linked_run_ids: [],
        created_by_agent: false,
        version: 1,
      }
      this.tasks.unshift(task)
    }
    if (body.edit_draft != null && ticket.draft) {
      if (ticket.draft.delivery_state === 'sent') {
        throw this.err(422, 'VALIDATION_ERROR', 'A sent message cannot be edited as a draft.')
      }
      ticket.draft.body = body.edit_draft
      if (ticket.draft.delivery_state === 'approved' || ticket.draft.delivery_state === 'queued') {
        ticket.draft.delivery_state = 'awaiting_approval'
        ticket.latest_preview = 'Draft edited. Re-approval required. Not sent.'
      } else {
        ticket.latest_preview = 'Draft updated. Not sent.'
      }
    }
    if (body.approve_draft && ticket.draft) {
      ticket.draft.delivery_state = 'approved'
      ticket.draft.approved_by = MAYA
      ticket.latest_preview = 'Approved, pending delivery — not delivered yet.'
    }
    if (body.send_draft && ticket.draft) {
      if (ticket.draft.delivery_state !== 'approved' && ticket.draft.delivery_state !== 'queued') {
        throw this.err(422, 'VALIDATION_ERROR', 'Approve the draft before sending. A generated reply is not a sent reply.')
      }
      ticket.draft.delivery_state = 'sent'
      ticket.draft.delivery_at = nowOffset(0)
      ticket.draft.delivery_id = `tg_${ticket.number}_${Date.now()}`
      ticket.messages.push({ ...ticket.draft })
      ticket.draft = null
      ticket.latest_preview = 'Sent on Telegram.'
      const approval = this.approvals.find((a) => a.related.id === ticket.id && a.status === 'requested')
      if (approval) {
        approval.status = 'executed'
        approval.decided_by = MAYA
        approval.decided_at = nowOffset(0)
      }
    }
    if (body.reject_draft && ticket.draft) {
      ticket.draft.delivery_state = 'failed'
      ticket.latest_preview = 'Draft rejected. Nothing was sent.'
    }
    ticket.version += 1
    ticket.updated_at = nowOffset(0)
    return this.mutated(ticket, `Ticket ${ticket.number} updated`)
  }

  decideApproval(approvalId: string, decision: 'approved' | 'rejected', version?: number) {
    const approval = this.require(this.approvals, approvalId, 'approval')
    this.assertVersion(approval.version, version)
    if (approval.status !== 'requested') {
      throw this.err(409, 'CONFLICT', 'This approval is no longer in a requested state.')
    }
    approval.status = decision
    approval.decided_by = MAYA
    approval.decided_at = nowOffset(0)
    approval.version += 1
    if (decision === 'approved' && approval.related.type === 'ticket') {
      const ticket = this.tickets.find((t) => t.id === approval.related.id)
      if (ticket?.draft) {
        ticket.draft.delivery_state = 'approved'
        ticket.latest_preview = 'Approved, pending delivery — not delivered yet.'
        ticket.version += 1
      }
    }
    this.emit('approval.updated', approval.id, 'approval', `${approval.action_label} ${decision}.`)
    return this.mutated(approval, `Approval ${decision}`)
  }

  retryRun(runId: string) {
    const run = this.require(this.runs, runId, 'run')
    if (!run.failure?.retry_eligible) {
      throw this.err(422, 'VALIDATION_ERROR', 'This run is not eligible to retry.')
    }
    run.status = 'queued'
    run.failure = null
    run.outcome_summary = 'Retry queued. Previous failure remains in the timeline.'
    run.events.push({
      id: nextId('evt'),
      at: nowOffset(0),
      title: 'Retry queued',
      detail: 'Operator requested retry. Affects this run only, not unrelated queued work.',
      kind: 'system',
    })
    run.version += 1
    this.emit('agent_run.updated', run.id, 'agent_run', `Retry queued for ${run.action_label}.`)
    return this.mutated(run, 'Retry queued')
  }

  regenerateReport(reportId: string) {
    const report = this.require(this.reports, reportId, 'report')
    const next: Report = {
      ...report,
      id: nextId('rpt'),
      revision: report.revision + 1,
      status: 'queued',
      generated_at: null,
      superseded_by: null,
      freshness: 'Queued. Will not overwrite the previous revision.',
      version: 1,
    }
    report.status = 'superseded'
    report.superseded_by = next.id
    this.reports.unshift(next)
    this.emit('report.updated', next.id, 'report', `Queued ${next.title} revision ${next.revision}.`)
    return this.mutated(next, 'Regeneration queued as a new revision')
  }

  patchAgent(
    agentId: string,
    body: { pause?: boolean; resume?: boolean; version?: number },
  ) {
    const agent = this.require(this.agents, agentId, 'agent')
    if (body.pause) {
      agent.status = 'offline'
      agent.health_reason = 'Paused by operator. New runs will not start. In-flight work is not killed from this control.'
      agent.current_action = null
    }
    if (body.resume) {
      agent.status = 'available'
      agent.health_reason = 'Resumed by operator. Heartbeat expected on next tick.'
      agent.heartbeat_at = nowOffset(0)
    }
    this.emit('agent.updated', agent.id, 'agent', `${agent.name} ${body.pause ? 'paused' : 'resumed'}.`)
    return this.mutated(agent, `${agent.name} updated`)
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  tickLive() {
    this.eventTick += 1
    const running = this.runs.find((r) => r.status === 'running')
    if (running && this.eventTick % 2 === 0) {
      running.events.push({
        id: nextId('evt'),
        at: nowOffset(0),
        title: 'Still working',
        detail: 'Collecting the next evidence item.',
        kind: 'action',
      })
      running.version += 1
      this.emit('agent_run.updated', running.id, 'agent_run', `${running.agent.label} is still ${running.action_label.toLowerCase()}.`)
    }
  }

  private emit(type: string, entityId: string, entityType: EntityType, summary: string) {
    const event: LiveEvent = {
      id: nextId('evt'),
      type,
      occurred_at: nowOffset(0),
      entity: { type: entityType, id: entityId },
      version: 1,
      summary,
    }
    this.events.unshift(event)
    this.listeners.forEach((fn) => fn(event))
  }

  private mutated<T>(data: T, summary: string) {
    return {
      data,
      activity_event: { id: nextId('act'), at: nowOffset(0), summary },
    }
  }

  private require<T extends { id: string }>(list: T[], itemId: string, label: string) {
    const found = list.find((item) => item.id === itemId)
    if (!found) throw this.err(404, 'NOT_FOUND', `${label} not found.`)
    return found
  }

  private assertVersion(current: number, incoming?: number) {
    if (incoming != null && incoming !== current) {
      throw this.err(
        409,
        'CONFLICT',
        'This record changed since you loaded it. Refresh and compare before retrying.',
      )
    }
  }

  private assertLeadTransition(lead: Lead, next: LeadStage) {
    if (['qualified', 'discovery', 'proposal', 'negotiation'].includes(next)) {
      if (!lead.owner) {
        throw this.err(422, 'VALIDATION_ERROR', 'An owner is required before this stage.', { owner: 'Required for this stage.' })
      }
    }
    if (['qualified', 'discovery', 'proposal', 'negotiation', 'won'].includes(next) && !lead.next_step) {
      throw this.err(422, 'VALIDATION_ERROR', 'A next step is required before a qualified lead can move forward.', {
        next_step: 'Required for this stage.',
        next_step_at: 'Required for this stage.',
      })
    }
    if (next === 'qualified' && !lead.qualification.budget) {
      throw this.err(422, 'VALIDATION_ERROR', 'Budget is required to qualify this lead.', {
        budget: 'Missing qualification data.',
      })
    }
  }

  private err(status: number, code: string, message: string, fields?: Record<string, string>) {
    return new ApiError(status, { code, message, fields, request_id: reqId() })
  }
}

export const demoStore = new DemoStore()

export type { Employee, Project, Task, Ticket, Todo, Lead, Agent, AgentRun, Report, Approval, NotificationItem }
