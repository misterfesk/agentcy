import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/primitives'
import { Sheet, SheetContent } from '@/components/ui/dialog'
import { api, queryKeys } from '@/api/client'
import { OwnerAssignee } from '@/components/ops'
import { EmptyState, ErrorState, InlineError, LoadingState } from '@/components/states'
import { PageHeader } from '@/components/shell'
import { useInspect, useLeads } from '@/hooks/queries'
import { dueStateLabel } from '@/lib/dates'
import { ApiError } from '@/demo/store'
import type { Lead, LeadStage } from '@/types/domain'

const stages: LeadStage[] = ['new', 'qualified', 'discovery', 'proposal', 'negotiation', 'won', 'lost', 'nurture']

export function LeadsPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') ?? 'board'
  const q = params.get('q') ?? ''
  const leads = useLeads()
  const { open } = useInspect()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [lost, setLost] = useState<Lead | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const setView = (next: string) => {
    const copy = new URLSearchParams(params)
    copy.set('view', next)
    setParams(copy)
  }

  const move = async (lead: Lead, stage: LeadStage, extra?: { lost_reason?: string }) => {
    try {
      setError(null)
      await api.patchLead(lead.id, { stage, version: lead.version, ...extra })
      await queryClient.invalidateQueries({ queryKey: queryKeys.leads })
    } catch (err) {
      setError(err instanceof ApiError ? `${err.message}${err.fields ? ' ' + Object.values(err.fields).join(' ') : ''}` : 'Move failed')
    }
  }

  if (leads.isLoading) return <LoadingState />
  if (leads.error) return <ErrorState message={(leads.error as Error).message} />
  const rows = (leads.data?.data ?? []).filter((lead) =>
    `${lead.organization} ${lead.contact_name} ${lead.service_fit}`.toLowerCase().includes(q.toLowerCase()),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const stage = event.over?.id
    const id = event.active.id
    const lead = rows.find((item) => item.id === id)
    if (!lead || typeof stage !== 'string') return
    if (stage === 'lost') {
      setLost(lead)
      return
    }
    void move(lead, stage as LeadStage)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pipeline"
        description="Which opportunities need a next step?"
        filters={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={view === 'board' ? 'default' : 'outline'} onClick={() => setView('board')}>
              Board
            </Button>
            <Button size="sm" variant={view === 'table' ? 'default' : 'outline'} onClick={() => setView('table')}>
              Table
            </Button>
            <Input
              value={q}
              placeholder="Filter"
              className="max-w-xs"
              onChange={(e) => {
                const copy = new URLSearchParams(params)
                copy.set('q', e.target.value)
                setParams(copy)
              }}
            />
          </div>
        }
      />
      {error ? <InlineError message={error} /> : null}
      {view === 'table' ? (
        <div className="overflow-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                {['Organization', 'Fit', 'Owner', 'Source', 'Next step', 'Health', 'Stage'].map((h) => (
                  <th key={h} className="border-b border-border px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id} className="border-b border-border">
                  <td className="px-3 py-2">
                    <button type="button" className="font-medium hover:underline" onClick={() => open({ type: 'lead', id: lead.id, label: lead.organization })}>
                      {lead.organization}
                    </button>
                    <p className="text-xs text-muted-foreground">{lead.contact_name}</p>
                  </td>
                  <td className="px-3 py-2">{lead.service_fit}</td>
                  <td className="px-3 py-2">
                    <OwnerAssignee entity={lead.owner} />
                  </td>
                  <td className="px-3 py-2">{lead.source}</td>
                  <td className="px-3 py-2 text-xs">
                    {lead.next_step ?? '—'} · {dueStateLabel(lead.next_step_at)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {lead.health_reasons.length ? lead.health_reasons.join(' · ') : 'No risk flags'}
                  </td>
                  <td className="px-3 py-2">
                    <label className="sr-only" htmlFor={`stage-${lead.id}`}>
                      Stage
                    </label>
                    <select
                      id={`stage-${lead.id}`}
                      className="rounded-md border border-input bg-card p-1 text-xs"
                      value={lead.stage}
                      onChange={(e) => {
                        const stage = e.target.value as LeadStage
                        if (stage === 'lost') setLost(lead)
                        else if (stage === 'won') void move(lead, 'won')
                        else void move(lead, stage)
                      }}
                    >
                      {stages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            {stages.map((stage) => (
              <section key={stage} id={stage} className="rounded-lg border border-border bg-card p-2">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage}</h2>
                <ul className="space-y-2">
                  {rows
                    .filter((lead) => lead.stage === stage)
                    .map((lead) => (
                      <li key={lead.id} className="rounded-md border border-border p-2">
                        <button type="button" className="text-left text-sm font-medium" onClick={() => open({ type: 'lead', id: lead.id, label: lead.organization })}>
                          {lead.organization}
                        </button>
                        <p className="text-xs text-muted-foreground">{lead.service_fit}</p>
                        <OwnerAssignee entity={lead.owner} />
                        <p className="text-[11px] text-muted-foreground">{lead.next_step ?? 'No next step'}</p>
                        {lead.health_reasons.map((reason) => (
                          <p key={reason} className="text-[11px] text-attention-foreground">
                            {reason}
                          </p>
                        ))}
                        {lead.deal_value != null ? <p className="tabular text-[11px]">${lead.deal_value.toLocaleString()}</p> : null}
                        <label className="mt-1 block text-[11px]">
                          Move
                          <select
                            className="mt-1 w-full rounded border border-input p-1"
                            value={lead.stage}
                            onChange={(e) => {
                              const next = e.target.value as LeadStage
                              if (next === 'lost') setLost(lead)
                              else void move(lead, next)
                            }}
                          >
                            {stages.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </label>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        </DndContext>
      )}
      {rows.length === 0 ? <EmptyState title="No leads match" description="Adjust the filter or load a workspace with pipeline records." /> : null}

      <Sheet open={Boolean(lost)} onOpenChange={() => setLost(null)}>
        <SheetContent>
          {lost ? (
            <form
              className="space-y-3 p-4"
              onSubmit={async (event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                await move(lost, 'lost', { lost_reason: `${form.get('reason')}: ${form.get('note')}` })
                setLost(null)
              }}
            >
              <h2 className="text-sm font-semibold">Mark {lost.organization} lost</h2>
              <Label htmlFor="reason">Reason</Label>
              <select id="reason" name="reason" required className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
                <option value="timing">Timing</option>
                <option value="budget">Budget</option>
                <option value="fit">Fit</option>
                <option value="competitor">Competitor</option>
              </select>
              <Label htmlFor="note">Note</Label>
              <Textarea id="note" name="note" />
              <Button type="submit">Record lost</Button>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
