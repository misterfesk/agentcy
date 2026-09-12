import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Lock, RefreshCw, SearchX, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

export function LoadingState({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
          <Skeleton className="size-6" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
      <Inbox className="size-5 text-muted-foreground" />
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}

export function NoSearchResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <SearchX className="size-5 text-muted-foreground" />
      <p className="text-sm">No results for “{query}”.</p>
    </div>
  )
}

export function ErrorState({
  message,
  requestId,
  onRetry,
}: {
  message: string
  requestId?: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-lg border border-urgent/30 bg-card p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 text-urgent" />
        <div className="space-y-1">
          <p className="text-sm font-medium">The request did not complete</p>
          <p className="text-sm text-muted-foreground">{message}</p>
          {requestId ? <p className="tabular text-xs text-muted-foreground">Request ID {requestId}</p> : null}
          {onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="size-3.5" /> Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function PermissionDeniedState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card py-12 text-center">
      <Lock className="size-5 text-muted-foreground" />
      <h2 className="text-sm font-semibold">You do not have access</h2>
      <p className="text-sm text-muted-foreground">This workspace record is hidden by server-side authorization.</p>
    </div>
  )
}

export function OfflineNotice() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-attention/40 bg-attention/10 px-3 py-2 text-sm">
      <WifiOff className="size-4" /> Live updates are paused. High-priority queues will poll until the stream recovers.
    </div>
  )
}

export function ConflictResolutionNotice({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-attention/40 bg-attention/10 p-3 text-sm">
      <p>This record changed on the server. Refresh to compare, then retry. The UI will not overwrite it silently.</p>
      <Button size="sm" variant="outline" onClick={onRefresh}>
        Refresh
      </Button>
    </div>
  )
}

export function InlineError({ message }: { message: string }) {
  return <p className="text-xs text-urgent">{message}</p>
}
