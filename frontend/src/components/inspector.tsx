import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { Input, Label, Textarea } from '@/components/ui/primitives'
import { api, queryKeys } from '@/api/client'
import {
  AgentIdentity,
  DeliveryBadge,
  EntityLink,
  HealthBadge,
  OwnerAssignee,
  PriorityBadge,
  RunStatusBadge,
  SlaCountdown,
  StatusBadge,
  Timestamp,
} from '@/components/ops'
import { ErrorState, InlineError, LoadingState } from '@/components/states'
import { useAgents, useApprovals, useEmployees, useInspect, useLeads, useProjects, useReports, useRuns, useTasks, useTickets, useTodos } from '@/hooks/queries'
import { formatDurationMs } from '@/lib/dates'
import { ApiError } from '@/demo/store'
import type { Approval, EntityRef, Lead, Task } from '@/types/domain'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'

export function EntityDetailSheet() {
  const { inspect, close, open } = useInspect()
  return (
    <Sheet open={Boolean(inspect)} onOpenChange={(next) => !next && close()}>
      <SheetContent aria-describedby="entity-detail">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Record detail</h2>
          <Button variant="outline" size="sm" onClick={close}>
            Close
          </Button>
        </div>
        <div id="entity-detail" className="min-h-0 flex-1 overflow-auto p-4">
          {inspect ? <InspectorBody type={inspect.type} id={inspect.id} onOpen={open} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function InspectorBody({ type, id, onOpen }: { type: EntityRef['type']; id: string; onOpen: (e: EntityRef) => void }) {
  const tickets = useTickets()
  const tasks = useTasks()
  const leads = useLeads()
  const projects = useProjects()
  const runs = useRuns()
  const reports = useReports()
  const employees = useEmployees()
  const agents = useAgents()
  const todos = useTodos()
  const approvals = useApprovals()
  const loading =
    tickets.isLoading ||
    tasks.isLoading ||
    leads.isLoading ||
    projects.isLoading ||
    runs.isLoading ||
    reports.isLoading ||
    employees.isLoading ||
    agents.isLoading ||
    todos.isLoading ||
    approvals.isLoading
  if (loading) return <LoadingState rows={4} />

  if (type === 'ticket') {
    const ticket = tickets.data?.data.find((t) => t.id === id)
    if (!ticket) return <p className="text-sm text-muted-foreground">Ticket not in the current workspace payload.</p>
    return <TicketDetail ticketId={ticket.id} onOpen={onOpen} />
  }
  if (type === 'task' || type === 'todo') {
    const task = tasks.data?.data.find((t) => t.id === id) ?? tasks.data?.data.find((t) => t.id === todos.data?.data.find((x) => x.id === id)?.task_id)
    if (!task) return <p className="text-sm">No linked task.</p>
    return <TaskDetail task={task} onOpen={onOpen} />
  }
  if (type === 'lead') {
    const lead = leads.data?.data.find((l) => l.id === id)
    if (!lead) return null
    return <LeadDetail lead={lead} onOpen={onOpen} />
  }
  if (type === 'project') {
    const project = projects.data?.data.find((p) => p.id === id)
    if (!project) return null
    return (
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="work">Work</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-3 pt-3">
          <h3 className="text-base font-semibold">{project.name}</h3>
          <HealthBadge value={project.health} reason={project.health_reason} />
          <p className="text-sm">{project.health_reason}</p>
          <p className="text-sm">{project.objective}</p>
          <p className="text-sm text-muted-foreground">Latest outcome: {project.latest_outcome}</p>
          <p className="text-sm">Next milestone: {project.next_milestone}</p>
          <p className="text-sm">{project.completion_label}</p>
          {project.latest_blocker ? <p className="rounded-md border border-urgent/30 p-2 text-sm">{project.latest_blocker}</p> : null}
          {project.team.map((person) => (
            <EntityLink key={person.id} entity={person} onOpen={onOpen} />
          ))}
        </TabsContent>
        <TabsContent value="work" className="pt-3 text-sm">
          Open the Work tab in the main view to mutate tasks. This sheet keeps the portfolio context.
        </TabsContent>
        <TabsContent value="timeline" className="pt-3 text-sm">
          Next milestone {project.next_milestone}
          {project.next_milestone_at ? <> · <Timestamp value={project.next_milestone_at} /></> : null}
        </TabsContent>
        <TabsContent value="activity" className="pt-3 text-sm">
          {project.latest_outcome}
        </TabsContent>
        <TabsContent value="reports" className="pt-3 text-sm">
          {project.latest_report_excerpt}
        </TabsContent>
      </Tabs>
    )
  }
  if (type === 'agent_run') {
    const run = runs.data?.data.find((r) => r.id === id)
    if (!run) return null
    return <RunInspector runId={run.id} onOpen={onOpen} />
  }
  if (type === 'report') {
    const report = reports.data?.data.find((r) => r.id === id)
    if (!report) return null
    return (
      <article className="space-y-3">
        <h3 className="text-base font-semibold">{report.title}</h3>
        <p className="text-xs text-muted-foreground">
          {report.period_label} · revision {report.revision} · {report.status} · {report.freshness}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-6">{report.body}</p>
        {report.linked_records.map((r) => (
          <EntityLink key={r.id} entity={r} onOpen={onOpen} />
        ))}
      </article>
    )
  }
  if (type === 'employee') {
    const employee = employees.data?.data.find((e) => e.id === id)
    if (!employee) return null
    return (
      <div className="space-y-2">
        <h3 className="text-base font-semibold">{employee.name}</h3>
        <p className="text-sm text-muted-foreground">{employee.role}</p>
        <HealthBadge value={employee.availability} reason={employee.availability_note ?? employee.workload_reason} />
        <p className="text-sm">{employee.workload_reason}</p>
        <p className="tabular text-sm">
          {employee.active_task_count} active · {employee.blocked_task_count} blocked
        </p>
        <p className="text-sm">{employee.coverage.join(', ')}</p>
      </div>
    )
  }
  if (type === 'agent') {
    const agent = agents.data?.data.find((a) => a.id === id)
    if (!agent) return null
    return (
      <div className="space-y-2">
        <AgentIdentity name={agent.name} purpose={agent.purpose} />
        <HealthBadge value={agent.status} reason={agent.health_reason} />
        <p className="text-sm">{agent.health_reason}</p>
        <p className="text-sm">Queue depth {agent.queue_depth}</p>
        <p className="text-xs text-muted-foreground">Permitted: {agent.permitted_tools.join(', ')}</p>
      </div>
    )
  }
  if (type === 'approval') {
    const approval = approvals.data?.data.find((a) => a.id === id)
    if (!approval) return <p className="text-sm">Approval not found.</p>
    return <ApprovalCard approval={approval} onOpen={onOpen} />
  }
  return <p className="text-sm text-muted-foreground">No inspector for {type}.</p>
}

function TaskDetail({ task, onOpen }: { task: Task; onOpen: (e: EntityRef) => void }) {
  const queryClient = useQueryClient()
  const employees = useEmployees()
  const agents = useAgents()
  const [blocker, setBlocker] = useState(task.blocker_reason ?? '')
  const [error, setError] = useState<string | null>(null)
  const patch = useMutation({
    mutationFn: (body: Partial<Task>) => api.patchTask(task.id, { ...body, version: task.version }),
    onSuccess: async (result) => {
      setError(null)
      toast.success(result.activity_event?.summary ?? 'Task updated')
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      await queryClient.invalidateQueries({ queryKey: queryKeys.todos })
      await queryClient.invalidateQueries({ queryKey: queryKeys.briefing })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Update failed'),
  })
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">{task.title}</h3>
      <div className="flex flex-wrap gap-2">
        <PriorityBadge value={task.priority} />
        <StatusBadge label={task.status.replace('_', ' ')} tone={task.status === 'blocked' ? 'red' : 'indigo'} />
      </div>
      <p className="text-sm">{task.description}</p>
      <p className="text-xs text-muted-foreground">Acceptance</p>
      <ul className="list-disc pl-4 text-sm">
        {task.acceptance_criteria.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <OwnerAssignee entity={task.assignee} />
      <EntityLink entity={task.project} onOpen={onOpen} />
      <EntityLink entity={task.client} onOpen={onOpen} />
      {task.blocker_reason ? <p className="rounded-md border border-urgent/30 bg-urgent/5 p-2 text-sm">{task.blocker_reason}</p> : null}
      <p className="text-xs text-muted-foreground">{task.latest_activity}</p>
      {task.linked_run_ids.map((runId) => (
        <EntityLink key={runId} entity={{ type: 'agent_run', id: runId, label: 'Linked agent run' }} onOpen={onOpen} />
      ))}
      <div className="space-y-2 border-t border-border pt-3">
        <Label htmlFor="task-assignee">Assign</Label>
        <select
          id="task-assignee"
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          value={task.assignee?.id ?? ''}
          onChange={(event) => {
            const value = event.target.value
            const person = employees.data?.data.find((e) => e.id === value)
            const agent = agents.data?.data.find((a) => a.id === value)
            const assignee = person
              ? { type: 'employee' as const, id: person.id, label: person.name }
              : agent
                ? { type: 'agent' as const, id: agent.id, label: agent.name }
                : null
            if (!assignee) return
            patch.mutate({ assignee, assignee_kind: assignee.type === 'agent' ? 'agent' : 'human' })
          }}
        >
          <option value="">Select a person or agent</option>
          <optgroup label="People">
            {employees.data?.data.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Agents">
            {agents.data?.data.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </optgroup>
        </select>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={task.status === 'done'} onClick={() => patch.mutate({ status: 'done' })}>
            Mark complete
          </Button>
        </div>
        <Label htmlFor="task-block">Blocker reason</Label>
        <Textarea id="task-block" value={blocker} onChange={(e) => setBlocker(e.target.value)} />
        <Button size="sm" variant="outline" disabled={!blocker} onClick={() => patch.mutate({ blocker_reason: blocker, status: 'blocked' })}>
          Mark blocked
        </Button>
        {error ? <InlineError message={error} /> : null}
      </div>
    </div>
  )
}

function LeadDetail({ lead, onOpen }: { lead: Lead; onOpen: (e: EntityRef) => void }) {
  const queryClient = useQueryClient()
  const employees = useEmployees()
  const [nextStep, setNextStep] = useState(lead.next_step ?? '')
  const [nextAt, setNextAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const patch = useMutation({
    mutationFn: (body: unknown) => api.patchLead(lead.id, body),
    onSuccess: async (result) => {
      setError(null)
      toast.success(result.activity_event?.summary ?? 'Lead updated')
      await queryClient.invalidateQueries({ queryKey: queryKeys.leads })
      await queryClient.invalidateQueries({ queryKey: queryKeys.briefing })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Update failed'),
  })
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">{lead.organization}</h3>
      <p className="text-sm text-muted-foreground">
        {lead.contact_name} · {lead.contact_role} · {lead.service_fit}
      </p>
      <StatusBadge label={lead.stage} tone="indigo" />
      <OwnerAssignee entity={lead.owner} />
      {lead.owner ? <EntityLink entity={lead.owner} onOpen={onOpen} /> : null}
      <p className="text-sm">Next step: {lead.next_step ?? 'None logged'}</p>
      {lead.health_reasons.map((reason) => (
        <p key={reason} className="text-sm text-attention-foreground">
          {reason}
        </p>
      ))}
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {Object.entries(lead.qualification).map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted-foreground">{k.replace('_', ' ')}</dt>
            <dd>{v ?? '—'}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm">{lead.notes}</p>
      {lead.linked_client_id ? <p className="text-sm">Converted client {lead.linked_client_id}</p> : null}
      {lead.linked_project_id ? <p className="text-sm">Converted project {lead.linked_project_id}</p> : null}
      <div className="space-y-2 border-t border-border pt-3">
        <Label htmlFor="lead-owner">Owner</Label>
        <select
          id="lead-owner"
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          value={lead.owner?.id ?? ''}
          onChange={(event) => {
            const person = employees.data?.data.find((e) => e.id === event.target.value)
            if (!person) return
            patch.mutate({ owner: { type: 'employee', id: person.id, label: person.name }, version: lead.version })
          }}
        >
          <option value="">Unassigned</option>
          {employees.data?.data.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <Label htmlFor="lead-next">Next step</Label>
        <Textarea id="lead-next" value={nextStep} onChange={(e) => setNextStep(e.target.value)} />
        <Label htmlFor="lead-next-at">Due</Label>
        <Input id="lead-next-at" type="datetime-local" value={nextAt} onChange={(e) => setNextAt(e.target.value)} />
        <Button
          size="sm"
          disabled={!nextStep}
          onClick={() =>
            patch.mutate({
              next_step: nextStep,
              next_step_at: nextAt ? new Date(nextAt).toISOString() : lead.next_step_at,
              version: lead.version,
            })
          }
        >
          Save next step
        </Button>
        {error ? <InlineError message={error} /> : null}
      </div>
    </div>
  )
}

function TicketDetail({ ticketId, onOpen }: { ticketId: string; onOpen: (e: EntityRef) => void }) {
  const tickets = useTickets()
  const employees = useEmployees()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'reply' | 'note' | 'draft'>('reply')
  const [body, setBody] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ticket = tickets.data?.data.find((t) => t.id === ticketId)
  useEffect(() => {
    setDraftBody(ticket?.draft?.body ?? '')
  }, [ticket?.draft?.body, ticket?.id])
  const mutate = useMutation({
    mutationFn: (payload: unknown) => api.patchTicket(ticketId, payload),
    onSuccess: async (result) => {
      setError(null)
      toast.success(result.activity_event?.summary ?? 'Ticket updated')
      await queryClient.invalidateQueries({ queryKey: queryKeys.tickets })
      await queryClient.invalidateQueries({ queryKey: queryKeys.briefing })
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Update failed'),
  })
  const message = useMutation({
    mutationFn: () => api.postTicketMessage(ticketId, { mode, body, version: ticket?.version }),
    onSuccess: async (result) => {
      setBody('')
      toast.success(result.activity_event?.summary ?? 'Message recorded')
      await queryClient.invalidateQueries({ queryKey: queryKeys.tickets })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Message failed'),
  })
  if (!ticket) return null
  const canSend = ticket.draft?.delivery_state === 'approved' || ticket.draft?.delivery_state === 'queued'

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">{ticket.number}</p>
        <h3 className="text-base font-semibold">{ticket.subject}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        <PriorityBadge value={ticket.priority} />
        <SlaCountdown deadline={ticket.sla_deadline_at} reason={ticket.sla_reason} />
        <StatusBadge label={ticket.status} />
      </div>
      <EntityLink entity={ticket.client} onOpen={onOpen} />
      <OwnerAssignee entity={ticket.assignee} />
      <div className="space-y-1">
        <Label htmlFor="ticket-assignee">Assign</Label>
        <select
          id="ticket-assignee"
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          value={ticket.assignee?.id ?? ''}
          onChange={(event) => {
            const person = employees.data?.data.find((e) => e.id === event.target.value)
            mutate.mutate({
              assignee: person ? { type: 'employee', id: person.id, label: person.name } : null,
              version: ticket.version,
            })
          }}
        >
          <option value="">Unassigned</option>
          {employees.data?.data.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>
      {ticket.dedicated_agent ? (
        <p className="text-xs text-muted-foreground">Dedicated agent: {ticket.dedicated_agent.label} — prompts are not shown.</p>
      ) : null}
      {ticket.draft ? <DeliveryBadge value={ticket.draft.delivery_state} /> : null}
      <ol className="space-y-2">
        {ticket.messages.map((msg) => (
          <li key={msg.id} className="rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium">
                {msg.speaker_name} · {msg.speaker}
              </span>
              <Timestamp value={msg.created_at} />
            </div>
            <p className="mt-1 text-sm">{msg.body}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <DeliveryBadge value={msg.delivery_state} />
              {msg.delivery_at ? <Timestamp value={msg.delivery_at} className="text-[11px]" /> : null}
              {msg.delivery_id ? <span className="text-[11px] text-muted-foreground">{msg.delivery_id}</span> : null}
            </div>
          </li>
        ))}
      </ol>
      {ticket.draft ? (
        <div className="rounded-md border border-attention/40 bg-attention/10 p-2">
          <p className="text-xs font-medium">Unsent draft from {ticket.draft.speaker_name}</p>
          <DeliveryBadge value={ticket.draft.delivery_state} />
          <Textarea className="mt-2 bg-card" value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={draftBody === ticket.draft.body}
              onClick={() => mutate.mutate({ edit_draft: draftBody, version: ticket.version })}
            >
              Save edits
            </Button>
            <ConfirmAction
              title="Approve this draft?"
              description="Approval marks the draft as approved and queued. It does not send until you choose Send."
              onConfirm={() => mutate.mutate({ approve_draft: true, version: ticket.version })}
            >
              Approve
            </ConfirmAction>
            <ConfirmAction
              title="Send the approved draft?"
              description="This delivers the message on Telegram. Only use after approval. A draft is never treated as sent."
              disabled={!canSend}
              onConfirm={() => mutate.mutate({ send_draft: true, version: ticket.version })}
            >
              Send
            </ConfirmAction>
            <Button size="sm" variant="outline" onClick={() => mutate.mutate({ reject_draft: true, version: ticket.version })}>
              Reject draft
            </Button>
          </div>
        </div>
      ) : null}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap gap-1">
          {(['reply', 'note', 'draft'] as const).map((item) => (
            <Button key={item} size="sm" variant={mode === item ? 'default' : 'outline'} onClick={() => setMode(item)}>
              {item === 'draft' ? 'Draft with support agent' : item === 'note' ? 'Internal note' : 'Reply'}
            </Button>
          ))}
        </div>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={mode === 'draft' ? 'Ask the support agent to draft…' : 'Write…'} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!body || message.isPending} onClick={() => message.mutate()}>
            {mode === 'reply' ? 'Queue reply' : mode === 'draft' ? 'Request draft' : 'Add note'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => mutate.mutate({ escalate: true, version: ticket.version })}>
            Escalate
          </Button>
          <Button size="sm" variant="outline" onClick={() => mutate.mutate({ convert_to_task: true, version: ticket.version })}>
            Convert to task
          </Button>
        </div>
        {mode === 'reply' ? <p className="text-[11px] text-muted-foreground">A queued reply is not sent until the server confirms delivery.</p> : null}
        {error ? <InlineError message={error} /> : null}
      </div>
    </div>
  )
}

function RunInspector({ runId, onOpen }: { runId: string; onOpen: (e: EntityRef) => void }) {
  const runs = useRuns()
  const queryClient = useQueryClient()
  const run = runs.data?.data.find((r) => r.id === runId)
  const retry = useMutation({
    mutationFn: () => api.retryRun(runId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.runs })
    },
  })
  if (!run) return null
  return (
    <div className="space-y-4">
      <div>
        <AgentIdentity name={run.agent.label} />
        <h3 className="mt-2 text-base font-semibold">{run.action_label}</h3>
        <p className="text-sm text-muted-foreground">{run.goal}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <RunStatusBadge value={run.status} />
        <StatusBadge label={run.approval_state === 'none' ? 'no approval' : run.approval_state} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Started</dt>
          <dd>
            <Timestamp value={run.started_at} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd className="tabular">{formatDurationMs(run.duration_ms)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Trigger</dt>
          <dd>{run.trigger}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Model</dt>
          <dd>{run.model_version ?? '—'}</dd>
        </div>
      </dl>
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h4>
        <ol className="mt-2 space-y-2">
          {run.events.map((event) => (
            <li key={event.id} className="border-l border-border pl-3">
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.detail}</p>
              <Timestamp value={event.at} className="text-[11px]" />
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inputs</h4>
        <p className="text-sm">{run.inputs_summary}</p>
      </section>
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</h4>
        <ul className="space-y-1 text-sm">
          {run.actions.map((action) => (
            <li key={action.label}>
              {action.label} — {action.result}
              {action.entity ? <EntityLink entity={action.entity} onOpen={onOpen} /> : null}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outputs</h4>
        {run.outputs.map((output) => (
          <p key={output.label} className="text-sm">
            <span className="font-medium">{output.label}: </span>
            {output.body}
          </p>
        ))}
      </section>
      {run.failure ? (
        <section className="rounded-md border border-urgent/30 p-2">
          <h4 className="text-sm font-medium">Failure</h4>
          <p className="text-sm">{run.failure.summary}</p>
          <p className="tabular text-xs text-muted-foreground">Correlation {run.failure.correlation_id}</p>
          {run.failure.retry_eligible ? (
            <ConfirmAction
              title="Retry this run?"
              description="Retry queues this run only. It does not restart unrelated queued or running work."
              onConfirm={() => retry.mutate()}
            >
              Retry this run
            </ConfirmAction>
          ) : null}
        </section>
      ) : null}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related</h4>
        {run.related_records.map((r) => (
          <EntityLink key={r.id} entity={r} onOpen={onOpen} />
        ))}
      </section>
    </div>
  )
}

export function ApprovalCard({ approval, onOpen }: { approval: Approval; onOpen: (e: EntityRef) => void }) {
  const decide = useMutation({
    mutationFn: (decision: 'approved' | 'rejected') => api.decideApproval(approval.id, decision, approval.version),
  })
  const queryClient = useQueryClient()
  return (
    <article className="rounded-md border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{approval.action_label}</h3>
          <p className="text-sm text-muted-foreground">{approval.effect}</p>
        </div>
        <StatusBadge
          label={approval.status.replace('_', ' ')}
          tone={approval.status === 'requested' ? 'amber' : approval.status === 'executed' || approval.status === 'approved' ? 'emerald' : approval.status === 'expired' || approval.status === 'invalidated' ? 'red' : 'slate'}
        />
      </div>
      <div className="mt-2">
        <EntityLink entity={approval.related} onOpen={onOpen} />
        <p className="text-xs text-muted-foreground">
          Requested by {approval.requester.label} · <Timestamp value={approval.requested_at} />
        </p>
        <p className="mt-1 text-sm">{approval.rationale}</p>
        {approval.conflict_reason ? <ErrorState message={approval.conflict_reason} /> : null}
      </div>
      {approval.status === 'requested' ? (
        <div className="mt-3 flex gap-2">
          <ConfirmAction
            title="Approve this action?"
            description={approval.effect}
            onConfirm={async () => {
              await decide.mutateAsync('approved')
              await queryClient.invalidateQueries({ queryKey: queryKeys.approvals })
              await queryClient.invalidateQueries({ queryKey: queryKeys.briefing })
            }}
          >
            Approve
          </ConfirmAction>
          <Button size="sm" variant="outline" onClick={() => decide.mutate('rejected')}>
            Reject
          </Button>
        </div>
      ) : null}
    </article>
  )
}

export function ConfirmAction({
  title,
  description,
  onConfirm,
  children,
  disabled,
  variant = 'default',
}: {
  title: string
  description: string
  onConfirm: () => void
  children: ReactNode
  disabled?: boolean
  variant?: 'default' | 'outline'
}) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant={variant} disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
