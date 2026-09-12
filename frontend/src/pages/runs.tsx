import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/primitives'
import { AgentIdentity, RunStatusBadge, StatusBadge, Timestamp } from '@/components/ops'
import { ErrorState, LoadingState } from '@/components/states'
import { PageHeader } from '@/components/shell'
import { OpsTable } from '@/components/data-table'
import { useInspect, useRuns } from '@/hooks/queries'
import { formatDurationMs } from '@/lib/dates'
import { runRef } from '@/lib/entity'
import type { RunStatus } from '@/types/domain'

const statuses: RunStatus[] = ['queued', 'running', 'awaiting_input', 'awaiting_approval', 'succeeded', 'failed', 'cancelled']

export function RunsPage() {
  const runs = useRuns()
  const { open, inspect } = useInspect()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const q = params.get('q') ?? ''

  const rows = useMemo(() => {
    return (runs.data?.data ?? []).filter((run) => {
      const matchesStatus = status ? run.status === status : true
      const matchesQ = `${run.action_label} ${run.agent.label} ${run.goal}`.toLowerCase().includes(q.toLowerCase())
      return matchesStatus && matchesQ
    })
  }, [runs.data, status, q])

  if (runs.isLoading) return <LoadingState />
  if (runs.error) return <ErrorState message={(runs.error as Error).message} />

  return (
    <div>
      <PageHeader
        title="Agent Activity"
        description="What agents did, decided, or failed to do — in product language."
        filters={
          <div className="flex flex-wrap gap-2">
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
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
            <Input
              value={q}
              placeholder="Filter goal or agent"
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
      <OpsTable
        data={rows}
        minWidth="960px"
        rowClassName={(run) => (inspect?.id === run.id ? 'bg-muted' : undefined)}
        columns={[
          { id: 'when', header: 'When', cell: (run) => <Timestamp value={run.started_at} /> },
          { id: 'agent', header: 'Agent', cell: (run) => <AgentIdentity name={run.agent.label} /> },
          {
            id: 'action',
            header: 'Action',
            cell: (run) => (
              <div>
                <button type="button" className="font-medium hover:underline" onClick={() => open(runRef(run))}>
                  {run.action_label}
                </button>
                <p className="text-xs text-muted-foreground">{run.goal}</p>
              </div>
            ),
          },
          { id: 'related', header: 'Related', cell: (run) => <span className="text-xs">{run.related?.label ?? '—'}</span> },
          { id: 'status', header: 'Status', cell: (run) => <RunStatusBadge value={run.status} /> },
          { id: 'duration', header: 'Duration', cell: (run) => <span className="tabular">{formatDurationMs(run.duration_ms)}</span> },
          { id: 'tokens', header: 'Tokens', cell: (run) => <span className="tabular">{run.cost_tokens ?? '—'}</span> },
          { id: 'approval', header: 'Approval', cell: (run) => <StatusBadge label={run.approval_state} /> },
          { id: 'outcome', header: 'Outcome', cell: (run) => <span className="text-xs">{run.outcome_summary}</span> },
        ]}
      />
    </div>
  )
}
