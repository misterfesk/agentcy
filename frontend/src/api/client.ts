import { z } from 'zod'
import {
  agentRunSchema,
  agentSchema,
  approvalSchema,
  briefingSchema,
  ceoAnswerSchema,
  currentUserSchema,
  employeeSchema,
  leadSchema,
  mutationResultSchema,
  notificationSchema,
  projectSchema,
  reportSchema,
  searchResponseSchema,
  taskSchema,
  ticketSchema,
  todoSchema,
} from './schemas'
import { apiBaseUrl, isDemoMode } from '@/lib/utils'
import { ApiError, demoStore } from '@/demo/store'
import { apiErrorSchema } from './schemas'
import type { EntityRef, Lead, Task, Todo } from '@/types/domain'

export { ApiError }

const delay = (ms = 90) => new Promise((resolve) => setTimeout(resolve, ms))

type Method = 'GET' | 'POST' | 'PATCH'

async function liveRequest<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json)
    if (parsed.success) {
      throw new ApiError(response.status, parsed.data.error)
    }
    throw new ApiError(response.status, {
      code: 'UNKNOWN',
      message: 'The server returned an error without a usable payload.',
      request_id: 'req_unknown',
    })
  }
  return schema.parse(json)
}

async function demoRequest<T>(method: Method, path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  await delay(method === 'GET' ? 80 : 140)
  const payload = routeDemo(method, path, body)
  return schema.parse(payload)
}

function routeDemo(method: Method, path: string, body: unknown): unknown {
  const [resource, id, extra] = path.replace(/^\//, '').split('/')
  const query = new URLSearchParams(path.includes('?') ? path.slice(path.indexOf('?') + 1) : '')
  const cleanResource = resource.split('?')[0]

  if (method === 'GET' && path.startsWith('/me')) return demoStore.user()
  if (method === 'GET' && path.startsWith('/dashboard/briefing')) return demoStore.briefing()
  if (method === 'GET' && cleanResource === 'search') return demoStore.search(query.get('q') ?? '')
  if (method === 'GET' && cleanResource === 'notifications') {
    return { data: demoStore.notifications, meta: { next_cursor: null, has_more: false } }
  }
  if (method === 'POST' && path.startsWith('/ceo/ask')) {
    const question = (body as { question: string }).question
    return demoStore.askCeo(question)
  }

  if (cleanResource === 'todos') {
    if (method === 'GET' && !id) return { data: demoStore.todos, meta: { next_cursor: null, has_more: false } }
    if (method === 'PATCH' && id) return demoStore.patchTodo(id, body as Partial<Todo>)
  }
  if (cleanResource === 'tasks') {
    if (method === 'GET' && !id) return { data: demoStore.tasks, meta: { next_cursor: null, has_more: false } }
    if (method === 'GET' && id) return demoStore.tasks.find((t) => t.id === id)
    if (method === 'PATCH' && extra === 'delegate') return demoStore.delegateTask(id, body as never)
    if (method === 'PATCH' && id) return demoStore.patchTask(id, body as Partial<Task>)
  }
  if (cleanResource === 'projects') {
    if (method === 'GET' && !id) return { data: demoStore.projects, meta: { next_cursor: null, has_more: false } }
    if (method === 'GET' && id) return demoStore.projects.find((p) => p.id === id)
  }
  if (cleanResource === 'leads') {
    if (method === 'GET' && !id) return { data: demoStore.leads, meta: { next_cursor: null, has_more: false } }
    if (method === 'GET' && id) return demoStore.leads.find((l) => l.id === id)
    if (method === 'PATCH' && id) return demoStore.patchLead(id, body as Partial<Lead>)
  }
  if (cleanResource === 'tickets') {
    if (method === 'GET' && !id) return { data: demoStore.tickets, meta: { next_cursor: null, has_more: false } }
    if (method === 'GET' && id) return demoStore.tickets.find((t) => t.id === id)
    if (method === 'POST' && extra === 'messages') return demoStore.postTicketMessage(id, body as never)
    if (method === 'PATCH' && id) return demoStore.patchTicket(id, body as never)
  }
  if (cleanResource === 'employees') {
    if (method === 'GET' && extra === 'workload') return demoStore.employees.find((e) => e.id === id)
    if (method === 'GET' && !id) return { data: demoStore.employees, meta: { next_cursor: null, has_more: false } }
    if (method === 'GET' && id) return demoStore.employees.find((e) => e.id === id)
  }
  if (cleanResource === 'agents') {
    if (method === 'GET' && !id) return { data: demoStore.agents, meta: { next_cursor: null, has_more: false } }
    if (method === 'GET' && id) return demoStore.agents.find((a) => a.id === id)
    if (method === 'PATCH' && id) return demoStore.patchAgent(id, body as never)
  }
  if (cleanResource === 'agent-runs') {
    if (method === 'GET' && !id) return { data: demoStore.runs, meta: { next_cursor: null, has_more: false } }
    if (method === 'GET' && id) return demoStore.runs.find((r) => r.id === id)
    if (method === 'POST' && extra === 'retry') return demoStore.retryRun(id)
  }
  if (cleanResource === 'reports') {
    if (method === 'GET' && !id) return { data: demoStore.reports, meta: { next_cursor: null, has_more: false } }
    if (method === 'GET' && id) return demoStore.reports.find((r) => r.id === id)
    if (method === 'POST' && extra === 'regenerate') return demoStore.regenerateReport(id)
  }
  if (cleanResource === 'approvals') {
    if (method === 'GET' && !id) return { data: demoStore.approvals, meta: { next_cursor: null, has_more: false } }
    if (method === 'POST' && extra === 'decide') {
      const decision = (body as { decision: 'approved' | 'rejected'; version?: number })
      return demoStore.decideApproval(id, decision.decision, decision.version)
    }
  }

  throw new ApiError(404, {
    code: 'NOT_FOUND',
    message: `Demo adapter has no handler for ${method} ${path}.`,
    request_id: 'req_demo_missing',
  })
}

export async function apiGet<T>(path: string, schema: z.ZodType<T>) {
  if (isDemoMode()) return demoRequest('GET', path, schema)
  return liveRequest(path, schema)
}

export async function apiSend<T>(method: 'POST' | 'PATCH', path: string, schema: z.ZodType<T>, body?: unknown) {
  if (isDemoMode()) return demoRequest(method, path, schema, body)
  return liveRequest(path, schema, { method, body: body == null ? undefined : JSON.stringify(body) })
}

const listWrap = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    meta: z.object({ next_cursor: z.string().nullable(), has_more: z.boolean() }),
  })

export const api = {
  me: () => apiGet('/me', currentUserSchema),
  briefing: () => apiGet('/dashboard/briefing', briefingSchema),
  search: (q: string) => apiGet(`/search?q=${encodeURIComponent(q)}`, searchResponseSchema),
  notifications: () => apiGet('/notifications', listWrap(notificationSchema)),
  askCeo: (question: string) => apiSend('POST', '/ceo/ask', ceoAnswerSchema, { question }),
  todos: () => apiGet('/todos', listWrap(todoSchema)),
  patchTodo: (id: string, body: Partial<Todo>) => apiSend('PATCH', `/todos/${id}`, mutationResultSchema(todoSchema), body),
  tasks: () => apiGet('/tasks', listWrap(taskSchema)),
  task: (id: string) => apiGet(`/tasks/${id}`, taskSchema),
  patchTask: (id: string, body: Partial<Task>) => apiSend('PATCH', `/tasks/${id}`, mutationResultSchema(taskSchema), body),
  delegateTask: (id: string, body: unknown) =>
    apiSend(
      'PATCH',
      `/tasks/${id}/delegate`,
      z.object({
        data: z.object({ task: taskSchema, run: agentRunSchema }),
        activity_event: z.object({ id: z.string(), at: z.string(), summary: z.string() }).nullable(),
      }),
      body,
    ),
  projects: () => apiGet('/projects', listWrap(projectSchema)),
  project: (id: string) => apiGet(`/projects/${id}`, projectSchema),
  leads: () => apiGet('/leads', listWrap(leadSchema)),
  lead: (id: string) => apiGet(`/leads/${id}`, leadSchema),
  patchLead: (id: string, body: unknown) => apiSend('PATCH', `/leads/${id}`, mutationResultSchema(leadSchema), body),
  tickets: () => apiGet('/tickets', listWrap(ticketSchema)),
  ticket: (id: string) => apiGet(`/tickets/${id}`, ticketSchema),
  patchTicket: (id: string, body: unknown) => apiSend('PATCH', `/tickets/${id}`, mutationResultSchema(ticketSchema), body),
  postTicketMessage: (id: string, body: unknown) =>
    apiSend('POST', `/tickets/${id}/messages`, mutationResultSchema(ticketSchema), body),
  employees: () => apiGet('/employees', listWrap(employeeSchema)),
  employee: (id: string) => apiGet(`/employees/${id}`, employeeSchema),
  agents: () => apiGet('/agents', listWrap(agentSchema)),
  patchAgent: (id: string, body: unknown) => apiSend('PATCH', `/agents/${id}`, mutationResultSchema(agentSchema), body),
  runs: () => apiGet('/agent-runs', listWrap(agentRunSchema)),
  run: (id: string) => apiGet(`/agent-runs/${id}`, agentRunSchema),
  retryRun: (id: string) => apiSend('POST', `/agent-runs/${id}/retry`, mutationResultSchema(agentRunSchema)),
  reports: () => apiGet('/reports', listWrap(reportSchema)),
  report: (id: string) => apiGet(`/reports/${id}`, reportSchema),
  regenerateReport: (id: string) =>
    apiSend('POST', `/reports/${id}/regenerate`, mutationResultSchema(reportSchema)),
  approvals: () => apiGet('/approvals', listWrap(approvalSchema)),
  decideApproval: (id: string, decision: 'approved' | 'rejected', version?: number) =>
    apiSend('POST', `/approvals/${id}/decide`, mutationResultSchema(approvalSchema), { decision, version }),
}

export const queryKeys = {
  me: ['me'] as const,
  briefing: ['dashboard', 'briefing'] as const,
  todos: ['todos'] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  leads: ['leads'] as const,
  lead: (id: string) => ['leads', id] as const,
  tickets: ['tickets'] as const,
  ticket: (id: string) => ['tickets', id] as const,
  employees: ['employees'] as const,
  agents: ['agents'] as const,
  runs: ['agent-runs'] as const,
  run: (id: string) => ['agent-runs', id] as const,
  reports: ['reports'] as const,
  report: (id: string) => ['reports', id] as const,
  approvals: ['approvals'] as const,
  notifications: ['notifications'] as const,
  search: (q: string) => ['search', q] as const,
}

export type AssigneeInput = EntityRef
