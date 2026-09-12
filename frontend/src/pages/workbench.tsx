import { PageHeader } from '@/components/shell'
import { AgentIdentity, HealthBadge, PriorityBadge, RunStatusBadge, SlaCountdown, StatusBadge } from '@/components/ops'
import { EmptyState, ErrorState, LoadingState, PermissionDeniedState } from '@/components/states'
import { Button } from '@/components/ui/button'
import { nowOffset } from '@/demo/seed'

export function WorkbenchPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Component workbench" description="Semantic variants used across the operations console." />
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Status / priority / health</h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="queued" />
          <RunStatusBadge value="awaiting_approval" />
          <RunStatusBadge value="succeeded" />
          <RunStatusBadge value="failed" />
          <PriorityBadge value="urgent" />
          <HealthBadge value="at_risk" reason="Scope creep on Helios homepage revision #4." />
          <SlaCountdown deadline={nowOffset(135)} reason="Strategic incident SLA" />
        </div>
      </section>
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Agent identity</h2>
        <AgentIdentity name="Support Agent" purpose="Telegram intake and unsent drafts" />
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        <LoadingState rows={2} />
        <EmptyState title="Empty queue" description="Nothing waiting on a human in this filter." action={<Button size="sm">Clear filters</Button>} />
        <ErrorState message="CRM rejected next_touch_at." requestId="req_demo_19" onRetry={() => undefined} />
        <PermissionDeniedState />
      </section>
    </div>
  )
}
