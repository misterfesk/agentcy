import type {
  Agent,
  AgentRun,
  EntityRef,
  Lead,
  Project,
  Report,
  Task,
  Ticket,
  Todo,
} from '@/types/domain'

export function taskRef(task: Task): EntityRef {
  return { type: 'task', id: task.id, label: task.title, status: task.status }
}

export function ticketRef(ticket: Ticket): EntityRef {
  return { type: 'ticket', id: ticket.id, label: `${ticket.number} ${ticket.subject}`, status: ticket.status }
}

export function leadRef(lead: Lead): EntityRef {
  return { type: 'lead', id: lead.id, label: lead.organization, status: lead.stage }
}

export function projectRef(project: Project): EntityRef {
  return { type: 'project', id: project.id, label: project.name, status: project.health }
}

export function runRef(run: AgentRun): EntityRef {
  return { type: 'agent_run', id: run.id, label: run.action_label, status: run.status }
}

export function reportRef(report: Report): EntityRef {
  return { type: 'report', id: report.id, label: report.title, status: report.status }
}

export function todoRef(todo: Todo): EntityRef {
  return { type: 'todo', id: todo.task_id ?? todo.id, label: todo.title, status: todo.group }
}

export function agentRecordRef(agent: Agent): EntityRef {
  return { type: 'agent', id: agent.id, label: agent.name, status: agent.status }
}
