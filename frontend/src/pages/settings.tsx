import { isDemoMode } from '@/lib/utils'
import { PageHeader } from '@/components/shell'
import { Badge } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/ops'

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Integrations, team mapping, and notification rules. Controls that the backend does not support stay read-only." />
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Data source</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isDemoMode()
            ? 'This session is a labelled demo workspace. Fixture data is isolated. Set VITE_DATA_MODE=api to point the typed client at FastAPI /api/v1.'
            : 'This session is using the live /api/v1 client. Responses are Zod-validated. The UI does not invent business state.'}
        </p>
        <div className="mt-2">
          <Badge variant={isDemoMode() ? 'attention' : 'healthy'}>{isDemoMode() ? 'Demo workspace' : 'API workspace'}</Badge>
        </div>
      </section>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Integrations</h2>
        <ul className="mt-2 space-y-2 text-sm">
          <li className="flex items-center justify-between">
            Telegram intake <StatusBadge label={isDemoMode() ? 'demo fixture' : 'read-only until API confirms'} tone={isDemoMode() ? 'amber' : 'slate'} />
          </li>
          <li className="flex items-center justify-between">
            Discord employee map <StatusBadge label={isDemoMode() ? 'demo fixture' : 'read-only until API confirms'} tone={isDemoMode() ? 'amber' : 'slate'} />
          </li>
          <li className="flex items-center justify-between">
            Meta campaigns <StatusBadge label="not in this build" tone="slate" />
          </li>
        </ul>
      </section>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          The inbox only shows approvals, SLA risk, failed runs, blocked work, expiring follow-ups, and mentions.
        </p>
      </section>
    </div>
  )
}
