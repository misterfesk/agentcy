import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { AgentIdentity, HealthBadge, StatusBadge } from '@/components/ops'
import { ConfirmAction } from '@/components/inspector'
import { ErrorState, LoadingState } from '@/components/states'
import { PageHeader } from '@/components/shell'
import { useAgents, useEmployees, useInspect } from '@/hooks/queries'
import { api, queryKeys } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'

export function PeoplePage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'employees'
  const employees = useEmployees()
  const agents = useAgents()
  const { open } = useInspect()
  const queryClient = useQueryClient()

  if (employees.isLoading || agents.isLoading) return <LoadingState />
  if (employees.error) return <ErrorState message={(employees.error as Error).message} />

  return (
    <div>
      <PageHeader title="Team + Agents" description="Can the team and agents deliver the work?" />
      <Tabs
        value={tab}
        onValueChange={(next) => {
          const copy = new URLSearchParams(params)
          copy.set('tab', next)
          setParams(copy)
        }}
      >
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>
        <TabsContent value="employees" className="pt-4">
          <div className="overflow-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  {['Person', 'Availability', 'Active', 'Blocked', 'Workload', 'Coverage'].map((h) => (
                    <th key={h} className="border-b border-border px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.data?.data.map((person) => (
                  <tr key={person.id} className="border-b border-border">
                    <td className="px-3 py-2">
                      <button type="button" className="font-medium hover:underline" onClick={() => open({ type: 'employee', id: person.id, label: person.name })}>
                        {person.name}
                      </button>
                      <p className="text-xs text-muted-foreground">{person.role}</p>
                    </td>
                    <td className="px-3 py-2">
                      <HealthBadge value={person.availability} reason={person.availability_note ?? person.workload_reason} />
                    </td>
                    <td className="tabular px-3 py-2">{person.active_task_count}</td>
                    <td className="tabular px-3 py-2">{person.blocked_task_count}</td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        label={person.workload.replace('_', ' ')}
                        tone={person.workload === 'over_capacity' ? 'red' : person.workload === 'heavy' ? 'amber' : 'emerald'}
                      />
                      <p className="text-xs text-muted-foreground">{person.workload_reason}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">{person.coverage.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="agents" className="grid gap-3 pt-4 md:grid-cols-2">
          {agents.data?.data.map((agent) => (
            <article key={agent.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="text-left" onClick={() => open({ type: 'agent', id: agent.id, label: agent.name })}>
                  <AgentIdentity name={agent.name} purpose={agent.purpose} />
                </button>
                <HealthBadge value={agent.status} reason={agent.health_reason} />
              </div>
              <p className="mt-2 text-sm">{agent.health_reason}</p>
              <p className="text-xs text-muted-foreground">Current: {agent.current_action ?? 'Idle'}</p>
              <p className="text-xs text-muted-foreground">Last: {agent.last_action ?? '—'}</p>
              <p className="tabular text-xs">Queue {agent.queue_depth}</p>
              <p className="text-[11px] text-muted-foreground">Tools: {agent.permitted_tools.join(', ')}</p>
              <div className="mt-2 flex gap-2">
                <ConfirmAction
                  title={`Pause ${agent.name}?`}
                  description="Pause stops new runs from starting. Queued runs remain queued. Currently running work is not killed from this control. The backend records an audit event."
                  onConfirm={async () => {
                    await api.patchAgent(agent.id, { pause: true })
                    await queryClient.invalidateQueries({ queryKey: queryKeys.agents })
                  }}
                >
                  Pause new runs
                </ConfirmAction>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await api.patchAgent(agent.id, { resume: true })
                    await queryClient.invalidateQueries({ queryKey: queryKeys.agents })
                  }}
                >
                  Resume
                </Button>
              </div>
            </article>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
