import type { ReactNode } from 'react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/primitives'
import { api } from '@/api/client'
import { EntityLink, HealthBadge, OwnerAssignee, PriorityBadge, RunStatusBadge, SlaCountdown, StatusBadge, Timestamp } from '@/components/ops'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { MetricStrip, PageHeader } from '@/components/shell'
import { useBriefing, useInspect, useTasks } from '@/hooks/queries'
import { dueStateLabel } from '@/lib/dates'
import { leadRef, projectRef, reportRef, runRef, taskRef, ticketRef, todoRef } from '@/lib/entity'
import type { CeoAnswer, EntityRef, Todo } from '@/types/domain'

export function CommandCenterPage() {
  const briefing = useBriefing()
  const tasks = useTasks()
  const { open } = useInspect()
  const [ceoOpen, setCeoOpen] = useState(false)

  if (briefing.isLoading) return <LoadingState rows={8} />
  if (briefing.error) {
    const err = briefing.error as { message: string; request_id?: string }
    return <ErrorState message={err.message} requestId={err.request_id} onRetry={() => briefing.refetch()} />
  }
  const data = briefing.data
  if (!data) return null
  if (data.first_run) {
    return (
      <EmptyState
        title="This workspace has no live operations yet"
        description="Connect a source, create a first client and project, map Discord identities, then run a CEO briefing. Demo data is never mixed into a live workspace."
      />
    )
  }

  const mine = data.today_todos.filter((t) => t.group === 'needs_my_action' || t.group === 'today')
  const delegated = data.today_todos.filter((t) => t.group === 'delegated')
  const waiting = data.today_todos.filter((t) => t.group === 'waiting_on_client')
  const blocked = (tasks.data?.data ?? []).filter((t) => t.status === 'blocked')
  const activeRuns = data.live_runs.filter((r) =>
    ['queued', 'running', 'awaiting_input', 'awaiting_approval'].includes(r.status),
  )
  const recentRuns = data.live_runs.filter((r) => ['succeeded', 'failed'].includes(r.status)).slice(0, 6)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description="What needs a human decision, what agents are doing, and what is at risk."
        updatedAt={data.generated_at}
        actions={
          <Button onClick={() => setCeoOpen(true)}>Ask CEO Agent</Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <HealthBadge value={data.health.status} reason={data.health.summary} />
        <p className="text-sm text-muted-foreground">{data.health.summary}</p>
        <p className="text-xs text-muted-foreground">
          CEO briefing generated <Timestamp value={data.generated_at} />
        </p>
      </div>
      <MetricStrip
        items={[
          { label: 'Waiting on human', value: data.counts.waiting_for_human, hint: 'Approvals and decisions' },
          { label: 'Blocked work', value: data.counts.blocked_tasks, hint: 'Server-marked blockers' },
          { label: 'SLA-risk tickets', value: data.counts.sla_risk_tickets, hint: 'Desk exceptions' },
          { label: 'Active agent runs', value: data.counts.active_agent_runs, hint: 'Queued through awaiting' },
          { label: 'Overdue lead follow-ups', value: data.counts.overdue_lead_followups, hint: 'Pipeline leaks' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_20rem]">
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Human decision queue</h2>
              <p className="text-xs text-muted-foreground">Largest block on purpose. Each row is a decision, not a metric.</p>
            </header>
            <ul>
              {data.decision_queue.map((item) => (
                <li key={item.id} className="border-b border-border px-4 py-3 last:border-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.decision}</p>
                      <p className="text-sm text-muted-foreground">{item.reason}</p>
                      <EntityLink entity={item.related} onOpen={open} />
                      <p className="text-xs text-muted-foreground">
                        {item.requester.label} · <Timestamp value={item.elapsed_at} />
                      </p>
                    </div>
                    <Button size="sm" onClick={() => open(item.related)}>
                      {item.next_action}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Today’s work</h2>
            </header>
            <TodoGroup title="Mine" items={mine} onOpen={open} />
            <TodoGroup title="Delegated to agent" items={delegated} onOpen={open} />
            <TodoGroup title="Waiting" items={waiting} onOpen={open} />
          </section>

          <section className="rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Blocked work</h2>
              <p className="text-xs text-muted-foreground">Server-marked blockers with the recorded reason.</p>
            </header>
            {blocked.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No blocked tasks in the current payload.</p>
            ) : (
              <ul>
                {blocked.map((task) => (
                  <li key={task.id} className="border-b border-border px-4 py-3 last:border-0">
                    <button type="button" className="text-left text-sm font-medium hover:underline" onClick={() => open(taskRef(task))}>
                      {task.title}
                    </button>
                    <p className="text-xs text-urgent-foreground">{task.blocker_reason ?? 'Blocked'}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.project.label} · {task.waiting_on ? `Waiting on ${task.waiting_on.label}` : 'Owner needed'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Active agent runs</h2>
            </header>
            {activeRuns.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No queued or running agent work.</p>
            ) : (
              <ul>
                {activeRuns.map((run) => (
                  <li key={run.id}>
                    <button type="button" className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted" onClick={() => open(runRef(run))}>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{run.agent.label}</span> {run.action_label.toLowerCase()}
                          {run.related ? ` · ${run.related.label}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">{run.outcome_summary}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <RunStatusBadge value={run.status} />
                        <Timestamp value={run.ended_at ?? run.started_at} className="text-[11px]" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Recent agent activity</h2>
            </header>
            {recentRuns.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No completed runs in this briefing.</p>
            ) : (
              <ul>
                {recentRuns.map((run) => (
                  <li key={run.id}>
                    <button type="button" className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted" onClick={() => open(runRef(run))}>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{run.agent.label}</span> {run.action_label.toLowerCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">{run.outcome_summary}</p>
                      </div>
                      <RunStatusBadge value={run.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Project delivery</h2>
              <p className="text-xs text-muted-foreground">Health is a labelled server state, not an unlabeled percent.</p>
            </header>
            <ul>
              {data.project_health.map((project) => (
                <li key={project.id} className="grid gap-2 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1fr_auto]">
                  <div>
                    <button type="button" className="text-left text-sm font-medium hover:underline" onClick={() => open(projectRef(project))}>
                      {project.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{project.client.label}</p>
                    <p className="text-sm">{project.completion_label}</p>
                    <p className="text-xs text-muted-foreground">Next: {project.next_milestone}</p>
                    {project.latest_blocker ? <p className="text-xs text-urgent-foreground">{project.latest_blocker}</p> : null}
                    <p className="text-xs text-muted-foreground">{project.health_reason}</p>
                  </div>
                  <HealthBadge value={project.health} reason={project.health_reason} />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="grid gap-3 sm:grid-cols-2 xl:block xl:space-y-3">
          <Rail title="Support SLA risk">
            {data.ticket_risks.map((ticket) => (
              <button key={ticket.id} type="button" className="w-full rounded-md border border-border p-2 text-left" onClick={() => open(ticketRef(ticket))}>
                <p className="text-sm font-medium">{ticket.number}</p>
                <p className="text-xs text-muted-foreground">{ticket.subject}</p>
                <SlaCountdown deadline={ticket.sla_deadline_at} reason={ticket.sla_reason} />
              </button>
            ))}
          </Rail>
          <Rail title="Pipeline follow-up risk">
            {data.pipeline_risks.map((lead) => (
              <button key={lead.id} type="button" className="w-full rounded-md border border-border p-2 text-left" onClick={() => open(leadRef(lead))}>
                <p className="text-sm font-medium">{lead.organization}</p>
                {lead.health_reasons.map((reason) => (
                  <p key={reason} className="text-xs text-attention-foreground">
                    {reason}
                  </p>
                ))}
              </button>
            ))}
          </Rail>
          <Rail title="Capacity">
            {data.capacity_alerts.map((alert) => (
              <button key={alert.id} type="button" className="w-full rounded-md border border-border p-2 text-left" onClick={() => open(alert.related)}>
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.reason}</p>
              </button>
            ))}
          </Rail>
          <Rail title="Latest reports">
            {data.recent_reports.map((report) => (
              <button key={report.id} type="button" className="w-full rounded-md border border-border p-2 text-left" onClick={() => open(reportRef(report))}>
                <p className="text-sm font-medium">{report.title}</p>
                <p className="text-xs text-muted-foreground">
                  {report.status} · r{report.revision}
                </p>
              </button>
            ))}
          </Rail>
        </aside>
      </div>
      <CeoSheet open={ceoOpen} onOpenChange={setCeoOpen} onOpenRecord={open} />
    </div>
  )
}

function TodoGroup({ title, items, onOpen }: { title: string; items: Todo[]; onOpen: (e: EntityRef) => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <h3 className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul>
        {items.map((todo) => (
          <li key={todo.id} className="flex items-start justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <button type="button" className="text-left" onClick={() => onOpen(todoRef(todo))}>
                <p className="text-sm font-medium">{todo.title}</p>
                <p className="text-xs text-muted-foreground">{todo.rationale}</p>
                {todo.blocker_reason ? <p className="text-xs text-urgent-foreground">{todo.blocker_reason}</p> : null}
              </button>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <PriorityBadge value={todo.priority} />
                <OwnerAssignee entity={todo.assignee} />
                {todo.client ? <EntityLink entity={todo.client} onOpen={onOpen} /> : null}
                <span className="text-[11px] text-muted-foreground">{dueStateLabel(todo.due_at)}</span>
                {todo.agent_owned ? <StatusBadge label="agent-owned" tone="indigo" /> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Rail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function CeoSheet({
  open,
  onOpenChange,
  onOpenRecord,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenRecord: (entity: EntityRef) => void
}) {
  const [question, setQuestion] = useState('What needs my decision?')
  const [answer, setAnswer] = useState<CeoAnswer | null>(null)
  const ask = useMutation({
    mutationFn: () => api.askCeo(question),
    onSuccess: setAnswer,
  })
  const suggestions = [
    'What needs my decision?',
    "Explain this project's risk.",
    "Draft today's priorities.",
    'Show leads that have no next step.',
  ]
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Ask CEO Agent</h2>
          <p className="text-xs text-muted-foreground">Focused briefing, not a chatbot. Answers cite records and provenance.</p>
        </div>
        <div className="space-y-3 overflow-auto p-4">
          <div className="flex flex-wrap gap-1">
            {suggestions.map((item) => (
              <Button key={item} size="sm" variant={question === item ? 'default' : 'outline'} onClick={() => setQuestion(item)}>
                {item}
              </Button>
            ))}
          </div>
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Button disabled={ask.isPending} onClick={() => ask.mutate()}>
            Ask
          </Button>
          {answer ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm leading-6">{answer.answer}</p>
              <p className="text-xs text-muted-foreground">
                Generated <Timestamp value={answer.generated_at} />
              </p>
              <p className="text-xs font-medium">Linked records</p>
              {answer.linked_records.map((r) => (
                <EntityLink key={r.id} entity={r} onOpen={onOpenRecord} />
              ))}
              <p className="text-xs font-medium">Provenance</p>
              {answer.provenance.map((r) => (
                <EntityLink key={r.id} entity={r} onOpen={onOpenRecord} />
              ))}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
