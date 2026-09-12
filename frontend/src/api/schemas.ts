import { z } from 'zod'

export const entityTypeSchema = z.enum([
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
])

export const entityRefSchema = z.object({
  type: entityTypeSchema,
  id: z.string(),
  label: z.string(),
  subtitle: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
})

export const cursorPageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: z.object({
      next_cursor: z.string().nullable(),
      has_more: z.boolean(),
    }),
  })

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    request_id: z.string(),
  }),
})

export const healthStatusSchema = z.enum(['stable', 'attention', 'at_risk'])
export const projectHealthSchema = z.enum(['on_track', 'needs_attention', 'at_risk', 'paused', 'complete'])
export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const assigneeKindSchema = z.enum(['human', 'agent', 'unassigned'])
export const runStatusSchema = z.enum([
  'queued',
  'running',
  'awaiting_input',
  'awaiting_approval',
  'succeeded',
  'failed',
  'cancelled',
])
export const approvalStatusSchema = z.enum([
  'requested',
  'approved',
  'rejected',
  'expired',
  'executing',
  'executed',
  'execution_failed',
  'invalidated',
])
export const messageDeliverySchema = z.enum([
  'draft',
  'awaiting_approval',
  'approved',
  'queued',
  'sent',
  'failed',
])
export const leadStageSchema = z.enum([
  'new',
  'qualified',
  'discovery',
  'proposal',
  'negotiation',
  'won',
  'lost',
  'nurture',
])
export const agentStatusSchema = z.enum(['available', 'busy', 'awaiting_approval', 'degraded', 'offline'])
export const employeeAvailabilitySchema = z.enum(['available', 'busy', 'away', 'unavailable'])
export const reportStatusSchema = z.enum(['queued', 'generating', 'ready', 'failed', 'superseded'])
export const todoGroupSchema = z.enum(['needs_my_action', 'today', 'delegated', 'waiting_on_client', 'later'])
export const ticketQueueSchema = z.enum([
  'mine',
  'unassigned',
  'vip',
  'awaiting_customer',
  'awaiting_internal',
  'sla_risk',
  'escalated',
  'resolved',
])
export const taskStatusSchema = z.enum(['backlog', 'ready', 'in_progress', 'blocked', 'in_review', 'done'])

export const employeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  availability: employeeAvailabilitySchema,
  availability_note: z.string().nullable(),
  active_task_count: z.number(),
  blocked_task_count: z.number(),
  workload: z.enum(['light', 'balanced', 'heavy', 'over_capacity']),
  workload_reason: z.string(),
  coverage: z.array(z.string()),
  initials: z.string(),
})

export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string(),
  kind: z.enum(['ceo', 'support', 'account', 'employee_subagent']),
  status: agentStatusSchema,
  health_reason: z.string(),
  heartbeat_at: z.string(),
  current_action: z.string().nullable(),
  last_action: z.string().nullable(),
  queue_depth: z.number(),
  permitted_tools: z.array(z.string()),
  escalation_owner_id: z.string(),
  related_employee_id: z.string().nullable(),
  related_client_id: z.string().nullable(),
})

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  client: entityRefSchema,
  health: projectHealthSchema,
  health_reason: z.string(),
  phase: z.string(),
  completion_label: z.string(),
  tasks_done: z.number(),
  tasks_total: z.number(),
  next_milestone: z.string(),
  next_milestone_at: z.string().nullable(),
  owner: entityRefSchema,
  overdue_count: z.number(),
  latest_blocker: z.string().nullable(),
  objective: z.string(),
  latest_outcome: z.string(),
  team: z.array(entityRefSchema),
  latest_report_excerpt: z.string().nullable(),
  version: z.number(),
})

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  acceptance_criteria: z.array(z.string()),
  project: entityRefSchema,
  client: entityRefSchema,
  owner: entityRefSchema,
  assignee: entityRefSchema.nullable(),
  assignee_kind: assigneeKindSchema,
  status: taskStatusSchema,
  priority: prioritySchema,
  due_at: z.string().nullable(),
  latest_activity_at: z.string(),
  latest_activity: z.string(),
  blocker_reason: z.string().nullable(),
  waiting_on: entityRefSchema.nullable(),
  linked_ticket_id: z.string().nullable(),
  linked_lead_id: z.string().nullable(),
  linked_run_ids: z.array(z.string()),
  created_by_agent: z.boolean(),
  version: z.number(),
})

export const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  group: todoGroupSchema,
  completed: z.boolean(),
  priority: prioritySchema,
  owner: entityRefSchema,
  assignee: entityRefSchema.nullable(),
  assignee_kind: assigneeKindSchema,
  client: entityRefSchema.nullable(),
  project: entityRefSchema.nullable(),
  due_at: z.string().nullable(),
  rationale: z.string(),
  blocker_reason: z.string().nullable(),
  agent_owned: z.boolean(),
  completable: z.boolean(),
  task_id: z.string().nullable(),
  version: z.number(),
})

export const leadSchema = z.object({
  id: z.string(),
  organization: z.string(),
  contact_name: z.string(),
  contact_role: z.string(),
  service_fit: z.string(),
  stage: leadStageSchema,
  owner: entityRefSchema.nullable(),
  source: z.string(),
  next_step: z.string().nullable(),
  next_step_at: z.string().nullable(),
  last_activity_at: z.string(),
  health_reasons: z.array(z.string()),
  deal_value: z.number().nullable(),
  qualification: z.record(z.string(), z.string().nullable()),
  notes: z.string(),
  linked_client_id: z.string().nullable(),
  linked_project_id: z.string().nullable(),
  version: z.number(),
})

export const ticketMessageSchema = z.object({
  id: z.string(),
  ticket_id: z.string(),
  speaker: z.enum(['client', 'human', 'agent', 'system']),
  speaker_name: z.string(),
  body: z.string(),
  created_at: z.string(),
  delivery_state: messageDeliverySchema,
  delivery_at: z.string().nullable(),
  delivery_id: z.string().nullable(),
  approved_by: entityRefSchema.nullable(),
  channel: z.enum(['telegram', 'email', 'internal']),
})

export const ticketSchema = z.object({
  id: z.string(),
  number: z.string(),
  subject: z.string(),
  client: entityRefSchema,
  contact_name: z.string(),
  priority: prioritySchema,
  sla_deadline_at: z.string(),
  sla_reason: z.string(),
  assignee: entityRefSchema.nullable(),
  assignee_kind: assigneeKindSchema,
  latest_preview: z.string(),
  updated_at: z.string(),
  tags: z.array(z.string()),
  queues: z.array(ticketQueueSchema),
  status: z.enum(['open', 'pending', 'escalated', 'resolved']),
  dedicated_agent: entityRefSchema.nullable(),
  messages: z.array(ticketMessageSchema),
  draft: ticketMessageSchema.nullable(),
  version: z.number(),
})

export const approvalSchema = z.object({
  id: z.string(),
  action_label: z.string(),
  effect: z.string(),
  related: entityRefSchema,
  requester: entityRefSchema,
  requested_at: z.string(),
  expires_at: z.string().nullable(),
  rationale: z.string(),
  status: approvalStatusSchema,
  decided_by: entityRefSchema.nullable(),
  decided_at: z.string().nullable(),
  conflict_reason: z.string().nullable(),
  version: z.number(),
})

export const agentRunSchema = z.object({
  id: z.string(),
  agent: entityRefSchema,
  goal: z.string(),
  action_label: z.string(),
  related: entityRefSchema.nullable(),
  status: runStatusSchema,
  started_at: z.string(),
  ended_at: z.string().nullable(),
  duration_ms: z.number().nullable(),
  trigger: z.string(),
  initiator: entityRefSchema,
  model_version: z.string().nullable(),
  cost_tokens: z.number().nullable(),
  approval_state: z.union([approvalStatusSchema, z.literal('none')]),
  outcome_summary: z.string(),
  inputs_summary: z.string(),
  actions: z.array(
    z.object({
      label: z.string(),
      result: z.string(),
      entity: entityRefSchema.optional(),
    }),
  ),
  outputs: z.array(z.object({ label: z.string(), body: z.string() })),
  events: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      title: z.string(),
      detail: z.string(),
      kind: z.enum(['thought', 'action', 'approval', 'result', 'error', 'system']),
    }),
  ),
  related_records: z.array(entityRefSchema),
  failure: z
    .object({
      summary: z.string(),
      retry_eligible: z.boolean(),
      correlation_id: z.string(),
    })
    .nullable(),
  version: z.number(),
})

export const reportSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum([
    'daily_operations',
    'weekly_delivery',
    'client_health',
    'pipeline_review',
    'project_status',
    'ceo_briefing',
  ]),
  status: reportStatusSchema,
  period_label: z.string(),
  generated_at: z.string().nullable(),
  author: entityRefSchema,
  scope: z.string(),
  freshness: z.string(),
  revision: z.number(),
  superseded_by: z.string().nullable(),
  body: z.string(),
  linked_records: z.array(entityRefSchema),
  version: z.number(),
})

export const briefingSchema = z.object({
  generated_at: z.string(),
  health: z.object({
    status: healthStatusSchema,
    summary: z.string(),
  }),
  counts: z.object({
    waiting_for_human: z.number(),
    blocked_tasks: z.number(),
    sla_risk_tickets: z.number(),
    active_agent_runs: z.number(),
    overdue_lead_followups: z.number(),
  }),
  decision_queue: z.array(
    z.object({
      id: z.string(),
      decision: z.string(),
      related: entityRefSchema,
      reason: z.string(),
      requester: entityRefSchema,
      elapsed_at: z.string(),
      next_action: z.string(),
      href_kind: entityTypeSchema,
    }),
  ),
  today_todos: z.array(todoSchema),
  live_runs: z.array(agentRunSchema),
  project_health: z.array(projectSchema),
  ticket_risks: z.array(ticketSchema),
  pipeline_risks: z.array(leadSchema),
  capacity_alerts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      reason: z.string(),
      related: entityRefSchema,
    }),
  ),
  recent_reports: z.array(reportSchema),
  first_run: z.boolean(),
})

export const searchResponseSchema = cursorPageSchema(
  z.object({
    id: z.string(),
    type: entityTypeSchema,
    label: z.string(),
    context: z.string(),
  }),
)

export const notificationSchema = z.object({
  id: z.string(),
  kind: z.enum(['approval', 'sla', 'failed_run', 'blocked', 'follow_up', 'mention']),
  title: z.string(),
  body: z.string(),
  related: entityRefSchema,
  occurred_at: z.string(),
  read: z.boolean(),
})

export const ceoAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
  linked_records: z.array(entityRefSchema),
  provenance: z.array(entityRefSchema),
  generated_at: z.string(),
})

export const liveEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  occurred_at: z.string(),
  entity: z.object({ type: entityTypeSchema, id: z.string() }),
  version: z.number(),
  summary: z.string(),
})

export const currentUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  workspace: z.string(),
})

export const mutationResultSchema = <T extends z.ZodTypeAny>(record: T) =>
  z.object({
    data: record,
    activity_event: z
      .object({
        id: z.string(),
        at: z.string(),
        summary: z.string(),
      })
      .nullable(),
  })
