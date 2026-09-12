import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDashed,
  Clock,
  Minus,
  Pause,
  ShieldAlert,
  Timer,
  User,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatAbsolute, formatRelative, remainingLabel, slaKind } from '@/lib/dates'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/overlays'
import type {
  EntityRef,
  EntityType,
  MessageDeliveryState,
  Priority,
  ProjectHealth,
  RunStatus,
} from '@/types/domain'

export function Timestamp({ value, className }: { value: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={value} className={cn('tabular text-muted-foreground', className)}>
          {formatRelative(value)}
          <span className="sr-only"> ({formatAbsolute(value)})</span>
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatAbsolute(value)} local</TooltipContent>
    </Tooltip>
  )
}

export function StatusBadge({
  label,
  tone = 'slate',
  icon,
}: {
  label: string
  tone?: 'emerald' | 'amber' | 'red' | 'slate' | 'indigo'
  icon?: ReactNode
}) {
  const map = {
    emerald: 'border-healthy/30 bg-healthy/10 text-healthy-foreground',
    amber: 'border-attention/40 bg-attention/15 text-attention-foreground',
    red: 'border-urgent/30 bg-urgent/10 text-urgent-foreground',
    slate: 'border-border bg-muted text-muted-foreground',
    indigo: 'border-primary/20 bg-accent text-accent-foreground',
  } as const
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium', map[tone])}>
      {icon}
      {label}
    </span>
  )
}

export function PriorityBadge({ value }: { value: Priority }) {
  const map: Record<Priority, { tone: 'slate' | 'indigo' | 'amber' | 'red'; icon: ReactNode }> = {
    low: { tone: 'slate', icon: <Minus className="size-3" /> },
    medium: { tone: 'indigo', icon: <Circle className="size-3" /> },
    high: { tone: 'amber', icon: <AlertTriangle className="size-3" /> },
    urgent: { tone: 'red', icon: <ShieldAlert className="size-3" /> },
  }
  const item = map[value]
  return <StatusBadge label={value.replace('_', ' ')} tone={item.tone} icon={item.icon} />
}

export function HealthBadge({
  value,
  reason,
}: {
  value: ProjectHealth | 'stable' | 'attention' | 'at_risk' | 'available' | 'busy' | 'degraded' | 'offline' | 'awaiting_approval' | 'away' | 'unavailable'
  reason?: string
}) {
  const tone =
    value === 'on_track' || value === 'complete' || value === 'stable' || value === 'available'
      ? 'emerald'
      : value === 'needs_attention' || value === 'attention' || value === 'busy' || value === 'awaiting_approval' || value === 'paused' || value === 'away'
        ? 'amber'
        : value === 'offline' || value === 'unavailable'
          ? 'slate'
          : 'red'
  const icon =
    tone === 'emerald' ? <CheckCircle2 className="size-3" /> : tone === 'amber' ? <CircleAlert className="size-3" /> : tone === 'slate' ? <Pause className="size-3" /> : <XCircle className="size-3" />
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <StatusBadge label={value.replaceAll('_', ' ')} tone={tone} icon={icon} />
        </span>
      </TooltipTrigger>
      {reason ? <TooltipContent className="max-w-xs">{reason}</TooltipContent> : null}
    </Tooltip>
  )
}

export function DeliveryBadge({ value }: { value: MessageDeliveryState }) {
  const map: Record<MessageDeliveryState, { tone: 'slate' | 'indigo' | 'amber' | 'emerald' | 'red'; label: string }> = {
    draft: { tone: 'slate', label: 'Draft — not sent' },
    awaiting_approval: { tone: 'amber', label: 'Awaiting approval — not sent' },
    approved: { tone: 'indigo', label: 'Approved / queued — not sent' },
    queued: { tone: 'indigo', label: 'Queued — not sent' },
    sent: { tone: 'emerald', label: 'Sent' },
    failed: { tone: 'red', label: 'Failed' },
  }
  const item = map[value]
  return <StatusBadge label={item.label} tone={item.tone} />
}

export function RunStatusBadge({ value }: { value: RunStatus }) {
  const map: Record<RunStatus, { tone: 'slate' | 'indigo' | 'amber' | 'emerald' | 'red'; icon: ReactNode }> = {
    queued: { tone: 'slate', icon: <CircleDashed className="size-3" /> },
    running: { tone: 'indigo', icon: <Timer className="size-3" /> },
    awaiting_input: { tone: 'amber', icon: <CircleAlert className="size-3" /> },
    awaiting_approval: { tone: 'amber', icon: <CircleAlert className="size-3" /> },
    succeeded: { tone: 'emerald', icon: <CheckCircle2 className="size-3" /> },
    failed: { tone: 'red', icon: <XCircle className="size-3" /> },
    cancelled: { tone: 'slate', icon: <Pause className="size-3" /> },
  }
  const item = map[value]
  return <StatusBadge label={value.replaceAll('_', ' ')} tone={item.tone} icon={item.icon} />
}

export function SlaCountdown({ deadline, reason }: { deadline: string; reason?: string }) {
  const kind = slaKind(deadline)
  const tone = kind === 'ok' ? 'emerald' : kind === 'soon' ? 'amber' : 'red'
  const icon = kind === 'breached' ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <StatusBadge label={remainingLabel(deadline)} tone={tone} icon={icon} />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {reason ?? 'Server-authoritative SLA'} · {formatAbsolute(deadline)}
      </TooltipContent>
    </Tooltip>
  )
}

export function EntityAvatar({ entity, className }: { entity: EntityRef; className?: string }) {
  const initials = entity.label
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  const isAgent = entity.type === 'agent' || entity.type === 'agent_run'
  return (
    <span
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-semibold',
        className,
      )}
      aria-hidden
    >
      {isAgent ? <Bot className="size-3.5" /> : entity.type === 'employee' ? initials : initials}
    </span>
  )
}

export function AgentIdentity({ name, purpose }: { name: string; purpose?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex size-6 items-center justify-center rounded-md border border-primary/20 bg-accent text-accent-foreground">
        <Bot className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        {purpose ? <span className="block truncate text-[11px] text-muted-foreground">{purpose}</span> : null}
      </span>
    </span>
  )
}

export function OwnerAssignee({ entity }: { entity: EntityRef | null }) {
  if (!entity) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <User className="size-3.5" /> Unassigned
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <EntityAvatar entity={entity} className="size-5" />
      {entity.label}
      {entity.type === 'agent' ? <StatusBadge label="agent" tone="indigo" /> : null}
    </span>
  )
}

const typeLabel: Record<EntityType, string> = {
  client: 'Client',
  project: 'Project',
  task: 'Task',
  todo: 'Todo',
  lead: 'Lead',
  ticket: 'Ticket',
  employee: 'Person',
  agent: 'Agent',
  agent_run: 'Run',
  report: 'Report',
  approval: 'Approval',
  message: 'Message',
}

export function EntityLink({
  entity,
  onOpen,
  className,
}: {
  entity: EntityRef
  onOpen?: (entity: EntityRef) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(entity)}
      className={cn('inline-flex max-w-full items-center gap-1.5 rounded-md text-left hover:bg-muted px-1 py-0.5', className)}
    >
      <EntityAvatar entity={entity} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{entity.label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {typeLabel[entity.type]}
          {entity.subtitle ? ` · ${entity.subtitle}` : ''}
          {entity.status ? ` · ${entity.status}` : ''}
        </span>
      </span>
    </button>
  )
}

export function LiveIndicator({ state }: { state: 'live' | 'reconnecting' | 'paused' }) {
  const label = state === 'live' ? 'Live' : state === 'reconnecting' ? 'Reconnecting' : 'Updates paused'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          'size-1.5 rounded-full',
          state === 'live' && 'bg-healthy',
          state === 'reconnecting' && 'bg-attention',
          state === 'paused' && 'bg-muted-foreground',
        )}
      />
      {label}
    </span>
  )
}

export function ConnectionStatus({ state }: { state: 'live' | 'reconnecting' | 'paused' }) {
  return <LiveIndicator state={state} />
}
