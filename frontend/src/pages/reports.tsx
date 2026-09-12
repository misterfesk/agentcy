import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { EntityLink, StatusBadge, Timestamp } from '@/components/ops'
import { ConfirmAction } from '@/components/inspector'
import { ErrorState, LoadingState } from '@/components/states'
import { PageHeader } from '@/components/shell'
import { useInspect, useReports } from '@/hooks/queries'
import { api, queryKeys } from '@/api/client'
import { cn } from '@/lib/utils'
import type { Report } from '@/types/domain'

const types: Report['type'][] = [
  'daily_operations',
  'weekly_delivery',
  'client_health',
  'pipeline_review',
  'project_status',
  'ceo_briefing',
]

export function ReportsPage() {
  const reports = useReports()
  const { open, inspect } = useInspect()
  const [params, setParams] = useSearchParams()
  const type = params.get('type') ?? ''
  const status = params.get('status') ?? ''
  const queryClient = useQueryClient()
  const selectedId = params.get('id') ?? inspect?.id
  const selected = reports.data?.data.find((r) => r.id === selectedId) ?? reports.data?.data.find((r) => r.status !== 'superseded')

  const rows = useMemo(
    () =>
      (reports.data?.data ?? []).filter((report) => {
        const typeOk = type ? report.type === type : true
        const statusOk = status ? report.status === status : true
        return typeOk && statusOk
      }),
    [reports.data, type, status],
  )

  if (reports.isLoading) return <LoadingState />
  if (reports.error) return <ErrorState message={(reports.error as Error).message} />

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Readable documents with revision history. Regenerate creates a new revision."
        filters={
          <div className="flex flex-wrap gap-2">
            <select
              className="h-8 rounded-md border border-input bg-card px-2 text-sm"
              value={type}
              onChange={(e) => {
                const copy = new URLSearchParams(params)
                copy.set('type', e.target.value)
                setParams(copy)
              }}
            >
              <option value="">All types</option>
              {types.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-md border border-input bg-card px-2 text-sm"
              value={status}
              onChange={(e) => {
                const copy = new URLSearchParams(params)
                copy.set('status', e.target.value)
                setParams(copy)
              }}
            >
              <option value="">All statuses</option>
              <option value="ready">Ready</option>
              <option value="queued">Queued</option>
              <option value="generating">Generating</option>
              <option value="failed">Failed</option>
              <option value="superseded">Superseded</option>
            </select>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <ul className="rounded-lg border border-border bg-card">
          {rows.map((report) => (
            <li key={report.id}>
              <button
                type="button"
                onClick={() => {
                  const copy = new URLSearchParams(params)
                  copy.set('id', report.id)
                  setParams(copy)
                }}
                className={cn('w-full border-b border-border px-3 py-2 text-left hover:bg-muted', selected?.id === report.id && 'bg-muted')}
              >
                <p className="text-sm font-medium">{report.title}</p>
                <p className="text-xs text-muted-foreground">
                  {report.period_label} · r{report.revision}
                </p>
                <StatusBadge label={report.status} tone={report.status === 'failed' ? 'red' : report.status === 'ready' ? 'emerald' : 'amber'} />
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <article className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {selected.period_label} · {selected.author.label} · {selected.scope} · {selected.freshness}
                </p>
                {selected.generated_at ? (
                  <p className="text-xs text-muted-foreground">
                    Generated <Timestamp value={selected.generated_at} />
                  </p>
                ) : null}
              </div>
              <ConfirmAction
                title="Regenerate as a new revision?"
                description="This queues an immutable new revision. The current document stays in history as superseded."
                onConfirm={async () => {
                  await api.regenerateReport(selected.id)
                  await queryClient.invalidateQueries({ queryKey: queryKeys.reports })
                }}
              >
                Regenerate
              </ConfirmAction>
            </div>
            <div className="max-w-3xl whitespace-pre-wrap text-sm leading-7">{selected.body}</div>
            <div className="mt-4 space-y-1">
              {selected.linked_records.map((record) => (
                <EntityLink key={record.id} entity={record} onOpen={open} />
              ))}
            </div>
          </article>
        ) : (
          <p className="text-sm text-muted-foreground">Select a report.</p>
        )}
      </div>
    </div>
  )
}
