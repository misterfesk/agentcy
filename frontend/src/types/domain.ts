export const ENTITY_TYPES = [
  'client',
  'project',
  'task',
  'todo',
  'lead',
  'ticket',
  'employee',
  'agent',
  'agent_run',
  'report',
  'approval',
  'message',
] as const

export type EntityType = (typeof ENTITY_TYPES)[number]

export type EntityRef = {
  type: EntityType
  id: string
  label: string
  subtitle?: string | null
  status?: string | null
}

export type CursorPage<T> = {
  data: T[]
  meta: { next_cursor: string | null; has_more: boolean }
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
    request_id: string
  }
}

export type HealthStatus = 'stable' | 'attention' | 'at_risk'
export type ProjectHealth = 'on_track' | 'needs_attention' | 'at_risk' | 'paused' | 'complete'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type AssigneeKind = 'human' | 'agent' | 'unassigned'
export type RunStatus =
  | 'queued'
  | 'running'
  | 'awaiting_input'
  | 'awaiting_approval'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
export type ApprovalStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'executing'
  | 'executed'
  | 'execution_failed'
  | 'invalidated'
export type MessageDeliveryState = 'draft' | 'awaiting_approval' | 'approved' | 'queued' | 'sent' | 'failed'
export type LeadStage =
  | 'new'
  | 'qualified'
  | 'discovery'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'nurture'
export type AgentStatus = 'available' | 'busy' | 'awaiting_approval' | 'degraded' | 'offline'
export type EmployeeAvailability = 'available' | 'busy' | 'away' | 'unavailable'
export type ReportStatus = 'queued' | 'generating' | 'ready' | 'failed' | 'superseded'
export type TodoGroup = 'needs_my_action' | 'today' | 'delegated' | 'waiting_on_client' | 'later'
export type TicketQueue =
  | 'mine'
  | 'unassigned'
  | 'vip'
  | 'awaiting_customer'
  | 'awaiting_internal'
  | 'sla_risk'
  | 'escalated'
  | 'resolved'

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: string
  workspace: string
}

export type Client = {
  id: string
  name: string
  segment: 'strategic' | 'growth' | 'past'
  owner_id: string
  dedicated_agent_id: string | null
  health_summary: string
  version: number
}

export type Employee = {
  id: string
  name: string
  role: string
  availability: EmployeeAvailability
  availability_note: string | null
  active_task_count: number
  blocked_task_count: number
  workload: 'light' | 'balanced' | 'heavy' | 'over_capacity'
  workload_reason: string
  coverage: string[]
  initials: string
}

export type Agent = {
  id: string
  name: string
  purpose: string
  kind: 'ceo' | 'support' | 'account' | 'employee_subagent'
  status: AgentStatus
  health_reason: string
  heartbeat_at: string
  current_action: string | null
  last_action: string | null
  queue_depth: number
  permitted_tools: string[]
  escalation_owner_id: string
  related_employee_id: string | null
  related_client_id: string | null
}

export type Project = {
  id: string
  name: string
  client: EntityRef
  health: ProjectHealth
  health_reason: string
  phase: string
  completion_label: string
  tasks_done: number
  tasks_total: number
  next_milestone: string
  next_milestone_at: string | null
  owner: EntityRef
  overdue_count: number
  latest_blocker: string | null
  objective: string
  latest_outcome: string
  team: EntityRef[]
  latest_report_excerpt: string | null
  version: number
}

export type Task = {
  id: string
  title: string
  description: string
  acceptance_criteria: string[]
  project: EntityRef
  client: EntityRef
  owner: EntityRef
  assignee: EntityRef | null
  assignee_kind: AssigneeKind
  status: 'backlog' | 'ready' | 'in_progress' | 'blocked' | 'in_review' | 'done'
  priority: Priority
  due_at: string | null
  latest_activity_at: string
  latest_activity: string
  blocker_reason: string | null
  waiting_on: EntityRef | null
  linked_ticket_id: string | null
  linked_lead_id: string | null
  linked_run_ids: string[]
  created_by_agent: boolean
  version: number
}

export type Todo = {
  id: string
  title: string
  group: TodoGroup
  completed: boolean
  priority: Priority
  owner: EntityRef
  assignee: EntityRef | null
  assignee_kind: AssigneeKind
  client: EntityRef | null
  project: EntityRef | null
  due_at: string | null
  rationale: string
  blocker_reason: string | null
  agent_owned: boolean
  completable: boolean
  task_id: string | null
  version: number
}

export type Lead = {
  id: string
  organization: string
  contact_name: string
  contact_role: string
  service_fit: string
  stage: LeadStage
  owner: EntityRef | null
  source: string
  next_step: string | null
  next_step_at: string | null
  last_activity_at: string
  health_reasons: string[]
  deal_value: number | null
  qualification: Record<string, string | null>
  notes: string
  linked_client_id: string | null
  linked_project_id: string | null
  version: number
}

export type TicketMessage = {
  id: string
  ticket_id: string
  speaker: 'client' | 'human' | 'agent' | 'system'
  speaker_name: string
  body: string
  created_at: string
  delivery_state: MessageDeliveryState
  delivery_at: string | null
  delivery_id: string | null
  approved_by: EntityRef | null
  channel: 'telegram' | 'email' | 'internal'
}

export type Ticket = {
  id: string
  number: string
  subject: string
  client: EntityRef
  contact_name: string
  priority: Priority
  sla_deadline_at: string
  sla_reason: string
  assignee: EntityRef | null
  assignee_kind: AssigneeKind
  latest_preview: string
  updated_at: string
  tags: string[]
  queues: TicketQueue[]
  status: 'open' | 'pending' | 'escalated' | 'resolved'
  dedicated_agent: EntityRef | null
  messages: TicketMessage[]
  draft: TicketMessage | null
  version: number
}

export type Approval = {
  id: string
  action_label: string
  effect: string
  related: EntityRef
  requester: EntityRef
  requested_at: string
  expires_at: string | null
  rationale: string
  status: ApprovalStatus
  decided_by: EntityRef | null
  decided_at: string | null
  conflict_reason: string | null
  version: number
}

export type AgentRunEvent = {
  id: string
  at: string
  title: string
  detail: string
  kind: 'thought' | 'action' | 'approval' | 'result' | 'error' | 'system'
}

export type AgentRun = {
  id: string
  agent: EntityRef
  goal: string
  action_label: string
  related: EntityRef | null
  status: RunStatus
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  trigger: string
  initiator: EntityRef
  model_version: string | null
  cost_tokens: number | null
  approval_state: ApprovalStatus | 'none'
  outcome_summary: string
  inputs_summary: string
  actions: { label: string; result: string; entity?: EntityRef }[]
  outputs: { label: string; body: string }[]
  events: AgentRunEvent[]
  related_records: EntityRef[]
  failure: { summary: string; retry_eligible: boolean; correlation_id: string } | null
  version: number
}

export type Report = {
  id: string
  title: string
  type:
    | 'daily_operations'
    | 'weekly_delivery'
    | 'client_health'
    | 'pipeline_review'
    | 'project_status'
    | 'ceo_briefing'
  status: ReportStatus
  period_label: string
  generated_at: string | null
  author: EntityRef
  scope: string
  freshness: string
  revision: number
  superseded_by: string | null
  body: string
  linked_records: EntityRef[]
  version: number
}

export type DecisionItem = {
  id: string
  decision: string
  related: EntityRef
  reason: string
  requester: EntityRef
  elapsed_at: string
  next_action: string
  href_kind: EntityType
}

export type CapacityAlert = {
  id: string
  title: string
  reason: string
  related: EntityRef
}

export type DashboardBriefing = {
  generated_at: string
  health: { status: HealthStatus; summary: string }
  counts: {
    waiting_for_human: number
    blocked_tasks: number
    sla_risk_tickets: number
    active_agent_runs: number
    overdue_lead_followups: number
  }
  decision_queue: DecisionItem[]
  today_todos: Todo[]
  live_runs: AgentRun[]
  project_health: Project[]
  ticket_risks: Ticket[]
  pipeline_risks: Lead[]
  capacity_alerts: CapacityAlert[]
  recent_reports: Report[]
  first_run: boolean
}

export type SearchHit = {
  id: string
  type: EntityType
  label: string
  context: string
}

export type NotificationItem = {
  id: string
  kind: 'approval' | 'sla' | 'failed_run' | 'blocked' | 'follow_up' | 'mention'
  title: string
  body: string
  related: EntityRef
  occurred_at: string
  read: boolean
}

export type LiveEvent = {
  id: string
  type: string
  occurred_at: string
  entity: { type: EntityType; id: string }
  version: number
  summary: string
}

export type ActivityEvent = {
  id: string
  at: string
  actor: EntityRef
  summary: string
  related: EntityRef
}

export type CeoAnswer = {
  question: string
  answer: string
  linked_records: EntityRef[]
  provenance: EntityRef[]
  generated_at: string
}
