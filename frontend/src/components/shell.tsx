import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  Bot,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeft,
  Search,
  Settings,
  Sun,
  Ticket,
  Users,
  Workflow,
  Kanban,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlays'
import { Badge } from '@/components/ui/primitives'
import { ConnectionStatus, EntityAvatar } from '@/components/ops'
import { api } from '@/api/client'
import { isDemoMode } from '@/lib/utils'
import { useConnectionState, useInspect, useLiveEvents, useMe, useNotifications } from '@/hooks/queries'
import { Timestamp } from '@/components/ops'
import type { SearchHit } from '@/types/domain'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard, end: true },
  { to: '/work', label: 'Work', icon: Workflow },
  { to: '/leads', label: 'Pipeline', icon: Kanban },
  { to: '/tickets', label: 'Client Desk', icon: Ticket },
  { to: '/people', label: 'Team + Agents', icon: Users },
  { to: '/runs', label: 'Agent Activity', icon: Bot },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const { state } = useConnectionState()
  const me = useMe()
  const notifications = useNotifications()
  const { open } = useInspect()
  const unread = notifications.data?.data.filter((n) => !n.read).length ?? 0

  useLiveEvents()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return (window.localStorage.getItem('agentcy-theme') as 'light' | 'dark') ?? 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('agentcy-theme', theme)
  }, [theme])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full bg-background">
      <aside
        className={cn(
          'hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className="flex h-12 items-center gap-2 border-b border-sidebar-border px-3">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            A
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Agentcy</p>
              <p className="truncate text-[11px] text-muted-foreground">Operations console</p>
            </div>
          ) : null}
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className="mt-auto border-t border-sidebar-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setCollapsed((v) => !v)}>
            <PanelLeft className="size-4" />
            {!collapsed ? 'Collapse' : <span className="sr-only">Expand navigation</span>}
          </Button>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-foreground/30" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="relative flex h-full w-60 flex-col bg-sidebar">
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="size-4" />
          </Button>
          <Button variant="outline" className="min-w-0 flex-1 justify-start gap-2 text-muted-foreground md:max-w-md" onClick={() => setCommandOpen(true)}>
            <Search className="size-3.5" />
            <span className="truncate text-xs">Search leads, tickets, work, runs…</span>
            <kbd className="ml-auto hidden rounded border border-border px-1 text-[10px] md:inline">⌘K</kbd>
          </Button>
          <ConnectionStatus state={state} />
          {isDemoMode() ? <Badge variant="attention">Demo workspace</Badge> : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actionable notifications">
                <span className="relative">
                  <Bell className="size-4" />
                  {unread > 0 ? <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-urgent" /> : null}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0">
              <div className="border-b border-border px-3 py-2">
                <p className="text-sm font-medium">Needs action</p>
                <p className="text-xs text-muted-foreground">Approvals, SLA, failures, blockers — not an activity firehose.</p>
              </div>
              <ul className="max-h-80 overflow-auto">
                {notifications.data?.data.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full border-b border-border px-3 py-2 text-left hover:bg-muted"
                      onClick={() => open(item.related)}
                    >
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.body}</p>
                      <Timestamp value={item.occurred_at} className="text-[11px]" />
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <EntityAvatar entity={{ type: 'employee', id: me.data?.id ?? 'me', label: me.data?.name ?? 'Maya Chen' }} />
            <div className="hidden leading-tight sm:block">
              <p className="text-xs font-medium">{me.data?.name ?? 'Maya Chen'}</p>
              <p className="text-[11px] text-muted-foreground">{me.data?.workspace ?? 'Northline Studio'}</p>
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1440px] p-4 md:p-6">{children}</div>
        </div>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-0.5 p-2" aria-label="Primary">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent',
              isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
              collapsed && 'justify-center px-0',
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          {!collapsed ? item.label : <span className="sr-only">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const navigate = useNavigate()
  const { open: inspect } = useInspect()

  useEffect(() => {
    if (!open) return
    const handle = window.setTimeout(() => {
      void api.search(q).then((res) => setHits(res.data))
    }, 120)
    return () => window.clearTimeout(handle)
  }, [q, open])

  const go = (hit: SearchHit) => {
    inspect({ type: hit.type, id: hit.id, label: hit.label })
    if (hit.type === 'ticket') navigate(`/tickets?inspect=${hit.type}:${hit.id}`)
    else if (hit.type === 'lead') navigate(`/leads?inspect=${hit.type}:${hit.id}`)
    else if (hit.type === 'agent_run') navigate(`/runs?inspect=${hit.type}:${hit.id}`)
    else if (hit.type === 'report') navigate(`/reports?inspect=${hit.type}:${hit.id}`)
    onOpenChange(false)
  }

  const destinations = useMemo(
    () => [
      { label: 'Command Center', to: '/' },
      { label: 'Work', to: '/work' },
      { label: 'Pipeline', to: '/leads' },
      { label: 'Client Desk', to: '/tickets' },
      { label: 'Team + Agents', to: '/people' },
      { label: 'Agent Activity', to: '/runs' },
      { label: 'Reports', to: '/reports' },
      { label: 'Component workbench', to: '/workbench' },
    ],
    [],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Search the workspace" />
          <CommandList className="max-h-80 overflow-auto p-1">
            <CommandEmpty>No matching records.</CommandEmpty>
            <CommandGroup heading="Go to">
              {destinations.map((item) => (
                <CommandItem key={item.to} onSelect={() => { navigate(item.to); onOpenChange(false) }}>
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Records">
              {hits.map((hit) => (
                <CommandItem key={`${hit.type}:${hit.id}`} onSelect={() => go(hit)}>
                  <Badge variant="outline">{hit.type.replace('_', ' ')}</Badge>
                  <span className="min-w-0">
                    <span className="block truncate">{hit.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{hit.context}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

export function PageHeader({
  title,
  description,
  updatedAt,
  actions,
  filters,
}: {
  title: string
  description?: string
  updatedAt?: string
  actions?: ReactNode
  filters?: ReactNode
}) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {updatedAt ? (
            <p className="text-xs text-muted-foreground">
              Last updated <Timestamp value={updatedAt} />
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {filters}
    </div>
  )
}

export function MetricStrip({
  items,
}: {
  items: { label: string; value: number; hint: string }[]
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {items.map((item) => (
        <li key={item.label} className="rounded-md border border-border bg-card px-3 py-2">
          <p className="text-[11px] text-muted-foreground">{item.label}</p>
          <p className="tabular text-xl font-semibold">{item.value}</p>
          <p className="text-[11px] text-muted-foreground">{item.hint}</p>
        </li>
      ))}
    </ul>
  )
}
