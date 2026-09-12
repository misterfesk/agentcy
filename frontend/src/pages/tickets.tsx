import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/primitives'
import { OwnerAssignee, PriorityBadge, SlaCountdown, StatusBadge, Timestamp } from '@/components/ops'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { PageHeader } from '@/components/shell'
import { useInspect, useTickets } from '@/hooks/queries'
import type { TicketQueue } from '@/types/domain'
import { cn } from '@/lib/utils'

const queues: { id: TicketQueue; label: string }[] = [
  { id: 'mine', label: 'Mine' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'vip', label: 'VIP / strategic' },
  { id: 'awaiting_customer', label: 'Awaiting customer' },
  { id: 'awaiting_internal', label: 'Awaiting internal response' },
  { id: 'sla_risk', label: 'SLA risk' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'resolved', label: 'Resolved' },
]

export function TicketsPage() {
  const tickets = useTickets()
  const { open, inspect } = useInspect()
  const [params, setParams] = useSearchParams()
  const queue = (params.get('queue') as TicketQueue | null) ?? 'mine'
  const q = params.get('q') ?? ''

  const rows = useMemo(
    () =>
      (tickets.data?.data ?? []).filter((ticket) => {
        const inQueue = ticket.queues.includes(queue)
        const matches =
          !q ||
          `${ticket.number} ${ticket.subject} ${ticket.client.label} ${ticket.contact_name}`.toLowerCase().includes(q.toLowerCase())
        return inQueue && matches
      }),
    [tickets.data, queue, q],
  )

  if (tickets.isLoading) return <LoadingState />
  if (tickets.error) return <ErrorState message={(tickets.error as Error).message} />

  return (
    <div>
      <PageHeader
        title="Client Desk"
        description="Which customer requests need a response? Drafts are never implied sent."
        updatedAt={tickets.dataUpdatedAt ? new Date(tickets.dataUpdatedAt).toISOString() : undefined}
        filters={
          <Input
            value={q}
            placeholder="Filter number, subject, or client"
            className="max-w-xs"
            onChange={(e) => {
              const copy = new URLSearchParams(params)
              copy.set('q', e.target.value)
              setParams(copy)
            }}
          />
        }
      />
      <div className="grid gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-card p-2">
          <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Queues</h2>
          <ul>
            {queues.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn('w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted', queue === item.id && 'bg-muted font-medium')}
                  onClick={() => {
                    const copy = new URLSearchParams(params)
                    copy.set('queue', item.id)
                    setParams(copy)
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="rounded-lg border border-border bg-card">
          {rows.length === 0 ? (
            <EmptyState title="No tickets in this queue" description="Saved queues are server-shaped filters, not a second inbox." />
          ) : (
            <ul>
              {rows.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => open({ type: 'ticket', id: ticket.id, label: `${ticket.number} ${ticket.subject}` })}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 border-b border-border px-4 py-3 text-left hover:bg-muted',
                      inspect?.id === ticket.id && 'bg-muted',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge value={ticket.priority} />
                        <SlaCountdown deadline={ticket.sla_deadline_at} reason={ticket.sla_reason} />
                        <span className="text-xs text-muted-foreground">{ticket.number}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.client.label} · {ticket.contact_name}
                      </p>
                      <p className="truncate text-xs">{ticket.latest_preview}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ticket.tags.map((tag) => (
                          <StatusBadge key={tag} label={tag} />
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <OwnerAssignee entity={ticket.assignee} />
                      <Timestamp value={ticket.updated_at} className="text-[11px]" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
