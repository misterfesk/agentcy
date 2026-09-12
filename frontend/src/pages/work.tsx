import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/primitives'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { Sheet, SheetContent } from '@/components/ui/dialog'
import { api, queryKeys } from '@/api/client'
import { EntityLink, HealthBadge, OwnerAssignee, PriorityBadge, StatusBadge } from '@/components/ops'
import { ApprovalCard } from '@/components/inspector'
import { EmptyState, ErrorState, InlineError, LoadingState } from '@/components/states'
import { PageHeader } from '@/components/shell'
import { OpsTable } from '@/components/data-table'
import { useAgents, useApprovals, useEmployees, useInspect, useProjects, useTasks, useTodos } from '@/hooks/queries'
import { dueStateLabel } from '@/lib/dates'
import { projectRef, taskRef } from '@/lib/entity'
import { ApiError } from '@/demo/store'
import type { Task, TodoGroup } from '@/types/domain'

const todoGroups: { id: TodoGroup; label: string }[] = [
  { id: 'needs_my_action', label: 'Needs my action' },
  { id: 'today', label: 'Today' },
  { id: 'delegated', label: 'Delegated' },
  { id: 'waiting_on_client', label: 'Waiting on client' },
  { id: 'later', label: 'Later' },
]

const kanbanColumns = ['backlog', 'ready', 'in_progress', 'blocked', 'in_review', 'done'] as const

export function WorkPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'todos'
  const view = params.get('view') ?? 'table'
  const setTab = (next: string) => {
    const copy = new URLSearchParams(params)
    copy.set('tab', next)
    setParams(copy)
  }
  const setView = (next: string) => {
    const copy = new URLSearchParams(params)
    copy.set('view', next)
    setParams(copy)
  }

  return (
    <div>
      <PageHeader
        title="Work"
        description="What is being done, blocked, or awaiting approval."
        actions={<Button variant="outline" onClick={() => setTab('approvals')}>Review approvals</Button>}
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todos">Live Todos</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>
        <TabsContent value="todos" className="pt-4">
          <TodosPane />
        </TabsContent>
        <TabsContent value="tasks" className="pt-4">
          <div className="mb-3 flex gap-2">
            <Button size="sm" variant={view === 'table' ? 'default' : 'outline'} onClick={() => setView('table')}>
              Table
            </Button>
            <Button size="sm" variant={view === 'kanban' ? 'default' : 'outline'} onClick={() => setView('kanban')}>
              Kanban
            </Button>
          </div>
          {view === 'kanban' ? <TaskKanban /> : <TaskTable />}
        </TabsContent>
        <TabsContent value="projects" className="pt-4">
          <ProjectTable />
        </TabsContent>
        <TabsContent value="approvals" className="pt-4">
          <ApprovalsPane />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TodosPane() {
  const todos = useTodos()
  const { open } = useInspect()
  const queryClient = useQueryClient()
  const [blockId, setBlockId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const complete = useMutation({
    mutationFn: (id: string) => api.patchTodo(id, { completed: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.todos })
    },
  })
  if (todos.isLoading) return <LoadingState />
  if (todos.error) return <ErrorState message={(todos.error as Error).message} onRetry={() => todos.refetch()} />
  const items = todos.data?.data ?? []
  return (
    <div className="space-y-4">
      {todoGroups.map((group) => {
        const rows = items.filter((t) => t.group === group.id && !t.completed)
        return (
          <section key={group.id} className="rounded-lg border border-border bg-card">
            <h2 className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h2>
            {rows.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Nothing in this group.</p>
            ) : (
              <ul>
                {rows.map((todo) => (
                  <li key={todo.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{todo.title}</p>
                      <p className="text-xs text-muted-foreground">{todo.rationale}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <PriorityBadge value={todo.priority} />
                        <OwnerAssignee entity={todo.assignee} />
                        {todo.project ? <EntityLink entity={todo.project} onOpen={open} /> : null}
                        <span className="text-[11px] text-muted-foreground">{dueStateLabel(todo.due_at)}</span>
                        {todo.agent_owned ? <StatusBadge label="agent-owned" tone="indigo" /> : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {todo.completable ? (
                        <Button size="sm" variant="outline" onClick={() => complete.mutate(todo.id)}>
                          Complete
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => open({ type: 'todo', id: todo.task_id ?? todo.id, label: todo.title })}>
                          Open
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setBlockId(todo.id)}>
                        Mark blocked
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      <Sheet open={Boolean(blockId)} onOpenChange={() => setBlockId(null)}>
        <SheetContent>
          <form
            className="space-y-3 p-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (!blockId || !reason) return
              await api.patchTodo(blockId, { blocker_reason: reason })
              await queryClient.invalidateQueries({ queryKey: queryKeys.todos })
              setBlockId(null)
              setReason('')
            }}
          >
            <h2 className="text-sm font-semibold">Block this item</h2>
            <Label htmlFor="reason">Reason (required)</Label>
            <Textarea id="reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button type="submit">Save blocker</Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function TaskTable() {
  const tasks = useTasks()
  const { open } = useInspect()
  const [delegate, setDelegate] = useState<Task | null>(null)
  if (tasks.isLoading) return <LoadingState />
  if (tasks.error) return <ErrorState message={(tasks.error as Error).message} />
  const rows = tasks.data?.data ?? []
  return (
    <>
      <OpsTable
        data={rows}
        minWidth="880px"
        columns={[
          {
            id: 'task',
            header: 'Task',
            cell: (task) => (
              <button type="button" className="font-medium hover:underline" onClick={() => open(taskRef(task))}>
                {task.title}
              </button>
            ),
          },
          { id: 'project', header: 'Project', cell: (task) => task.project.label },
          { id: 'owner', header: 'Owner', cell: (task) => task.owner.label },
          { id: 'assignee', header: 'Assignee', cell: (task) => <OwnerAssignee entity={task.assignee} /> },
          {
            id: 'status',
            header: 'Status',
            cell: (task) => <StatusBadge label={task.status.replace('_', ' ')} tone={task.status === 'blocked' ? 'red' : 'slate'} />,
          },
          { id: 'priority', header: 'Priority', cell: (task) => <PriorityBadge value={task.priority} /> },
          { id: 'due', header: 'Due', cell: (task) => <span className="text-xs">{dueStateLabel(task.due_at)}</span> },
          { id: 'latest', header: 'Latest', cell: (task) => <span className="text-xs">{task.latest_activity}</span> },
          {
            id: 'kind',
            header: 'Kind',
            cell: (task) => (
              <div className="flex gap-1">
                <StatusBadge label={task.assignee_kind} />
                <Button size="sm" variant="outline" onClick={() => setDelegate(task)}>
                  Delegate
                </Button>
              </div>
            ),
          },
        ]}
      />
      <DelegateSheet task={delegate} onClose={() => setDelegate(null)} />
    </>
  )
}

function TaskKanban() {
  const tasks = useTasks()
  const queryClient = useQueryClient()
  const { open } = useInspect()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  if (tasks.isLoading) return <LoadingState />
  const rows = tasks.data?.data ?? []
  const onDragEnd = async (event: DragEndEvent) => {
    const status = event.over?.id
    const id = event.active.id
    if (typeof status === 'string' && typeof id === 'string' && kanbanColumns.includes(status as (typeof kanbanColumns)[number])) {
      const task = rows.find((t) => t.id === id)
      await api.patchTask(String(id), { status: status as Task['status'], version: task?.version })
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Drag is optional. Use the status select on each card for keyboard access.</p>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kanbanColumns.map((column) => (
            <div key={column} id={column} className="rounded-lg border border-border bg-card p-2">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{column.replace('_', ' ')}</h3>
              <ul className="space-y-2">
                {rows
                  .filter((t) => t.status === column)
                  .map((task) => (
                    <li key={task.id} className="rounded-md border border-border p-2">
                      <button type="button" className="text-left text-sm font-medium" onClick={() => open(taskRef(task))}>
                        {task.title}
                      </button>
                      <label className="mt-2 block text-[11px] text-muted-foreground">
                        Status
                        <select
                          className="mt-1 w-full rounded-md border border-input bg-card p-1 text-xs"
                          value={task.status}
                          onChange={async (e) => {
                            await api.patchTask(task.id, { status: e.target.value as Task['status'], version: task.version })
                            await queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
                          }}
                        >
                          {kanbanColumns.map((item) => (
                            <option key={item} value={item}>
                              {item.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  )
}

function DelegateSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const employees = useEmployees()
  const agents = useAgents()
  const [error, setError] = useState<string | null>(null)
  return (
    <Sheet open={Boolean(task)} onOpenChange={onClose}>
      <SheetContent>
        {task ? (
          <form
            className="space-y-3 p-4"
            onSubmit={async (event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const kind = String(form.get('kind'))
              const assigneeId = String(form.get('assignee'))
              const person = employees.data?.data.find((e) => e.id === assigneeId)
              const agent = agents.data?.data.find((a) => a.id === assigneeId)
              const assignee =
                kind === 'agent' && agent
                  ? { type: 'agent' as const, id: agent.id, label: agent.name }
                  : person
                    ? { type: 'employee' as const, id: person.id, label: person.name }
                    : null
              if (!assignee) {
                setError('Choose an assignee.')
                return
              }
              try {
                await api.delegateTask(task.id, {
                  version: task.version,
                  assignee,
                  expected_result: String(form.get('result')),
                  due_at: new Date(String(form.get('due'))).toISOString(),
                  requires_approval: form.get('approval') === 'on',
                })
                await queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
                await queryClient.invalidateQueries({ queryKey: queryKeys.runs })
                onClose()
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Delegation failed')
              }
            }}
          >
            <h2 className="text-sm font-semibold">Delegate {task.title}</h2>
            <p className="text-xs text-muted-foreground">Submit creates a linked agent run. It does not mark the work complete.</p>
            <Label htmlFor="kind">Assignee kind</Label>
            <select id="kind" name="kind" defaultValue="agent" className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
              <option value="human">Human</option>
              <option value="agent">Eligible agent</option>
            </select>
            <Label htmlFor="assignee">Assignee</Label>
            <select id="assignee" name="assignee" required className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm">
              <optgroup label="People">
                {employees.data?.data.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Agents">
                {agents.data?.data.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <Label htmlFor="result">Expected result</Label>
            <Textarea id="result" name="result" required />
            <Label htmlFor="due">Due</Label>
            <Input id="due" name="due" type="datetime-local" required />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="approval" /> Requires approval before external action
            </label>
            {error ? <InlineError message={error} /> : null}
            <Button type="submit">Create linked run</Button>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ProjectTable() {
  const projects = useProjects()
  const { open } = useInspect()
  if (projects.isLoading) return <LoadingState />
  return (
    <OpsTable
      data={projects.data?.data ?? []}
      columns={[
        {
          id: 'project',
          header: 'Project',
          cell: (project) => (
            <button type="button" className="font-medium hover:underline" onClick={() => open(projectRef(project))}>
              {project.name}
            </button>
          ),
        },
        { id: 'client', header: 'Client', cell: (project) => project.client.label },
        { id: 'health', header: 'Health', cell: (project) => <HealthBadge value={project.health} reason={project.health_reason} /> },
        { id: 'phase', header: 'Phase', cell: (project) => project.phase },
        { id: 'completion', header: 'Completion', cell: (project) => project.completion_label },
        { id: 'milestone', header: 'Milestone', cell: (project) => project.next_milestone },
        { id: 'owner', header: 'Owner', cell: (project) => project.owner.label },
        { id: 'blocker', header: 'Blocker', cell: (project) => <span className="text-xs">{project.latest_blocker ?? '—'}</span> },
      ]}
    />
  )
}

function ApprovalsPane() {
  const approvals = useApprovals()
  const { open } = useInspect()
  if (approvals.isLoading) return <LoadingState />
  const waiting = approvals.data?.data.filter((a) => a.status === 'requested') ?? []
  const history = approvals.data?.data.filter((a) => a.status !== 'requested') ?? []
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Waiting</h2>
        {waiting.length === 0 ? <EmptyState title="No waiting approvals" description="Inbound agent actions will appear here." /> : waiting.map((a) => <ApprovalCard key={a.id} approval={a} onOpen={open} />)}
      </section>
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">History</h2>
        {history.map((a) => (
          <ApprovalCard key={a.id} approval={a} onOpen={open} />
        ))}
      </section>
    </div>
  )
}
