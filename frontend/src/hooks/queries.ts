import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, queryKeys } from '@/api/client'
import { demoStore } from '@/demo/store'
import { isDemoMode } from '@/lib/utils'
import type { EntityRef, EntityType, LiveEvent } from '@/types/domain'

export function useInspect() {
  const [params, setParams] = useSearchParams()
  const inspect = params.get('inspect')
  const parsed = useMemo(() => {
    if (!inspect) return null
    const [type, ...rest] = inspect.split(':')
    return { type: type as EntityType, id: rest.join(':') }
  }, [inspect])

  const open = (entity: EntityRef | { type: EntityType; id: string }) => {
    const next = new URLSearchParams(params)
    next.set('inspect', `${entity.type}:${entity.id}`)
    setParams(next, { replace: false })
  }
  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('inspect')
    setParams(next, { replace: true })
  }
  return { inspect: parsed, open, close }
}

export function useConnectionState() {
  const [state, setState] = useState<'live' | 'reconnecting' | 'paused'>(isDemoMode() ? 'live' : 'paused')

  useEffect(() => {
    if (!isDemoMode()) {
      setState('paused')
      return
    }
    setState('live')
    const interval = window.setInterval(() => demoStore.tickLive(), 8000)
    return () => window.clearInterval(interval)
  }, [])

  return { state, setState }
}

export function useLiveEvents(onEvent?: (event: LiveEvent) => void) {
  const queryClient = useQueryClient()
  const stable = useCallback(
    (event: LiveEvent) => {
      onEvent?.(event)
    },
    [onEvent],
  )
  useEffect(() => {
    if (!isDemoMode()) return
    return demoStore.subscribe((event) => {
      stable(event)
      if (event.entity.type === 'agent_run') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.runs })
        void queryClient.invalidateQueries({ queryKey: queryKeys.briefing })
      }
      if (event.entity.type === 'ticket') void queryClient.invalidateQueries({ queryKey: queryKeys.tickets })
      if (event.entity.type === 'lead') void queryClient.invalidateQueries({ queryKey: queryKeys.leads })
      if (event.entity.type === 'approval') void queryClient.invalidateQueries({ queryKey: queryKeys.approvals })
      if (event.entity.type === 'report') void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      if (event.entity.type === 'task') void queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      if (event.entity.type === 'agent') void queryClient.invalidateQueries({ queryKey: queryKeys.agents })
    })
  }, [stable, queryClient])
}

export function useBriefing() {
  return useQuery({ queryKey: queryKeys.briefing, queryFn: api.briefing })
}

export function useTodos() {
  return useQuery({ queryKey: queryKeys.todos, queryFn: api.todos })
}
export function useTasks() {
  return useQuery({ queryKey: queryKeys.tasks, queryFn: api.tasks })
}
export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: api.projects })
}
export function useLeads() {
  return useQuery({ queryKey: queryKeys.leads, queryFn: api.leads })
}
export function useTickets() {
  return useQuery({ queryKey: queryKeys.tickets, queryFn: api.tickets })
}
export function useEmployees() {
  return useQuery({ queryKey: queryKeys.employees, queryFn: api.employees })
}
export function useAgents() {
  return useQuery({ queryKey: queryKeys.agents, queryFn: api.agents })
}
export function useRuns() {
  return useQuery({ queryKey: queryKeys.runs, queryFn: api.runs })
}
export function useReports() {
  return useQuery({ queryKey: queryKeys.reports, queryFn: api.reports })
}
export function useApprovals() {
  return useQuery({ queryKey: queryKeys.approvals, queryFn: api.approvals })
}
export function useNotifications() {
  return useQuery({ queryKey: queryKeys.notifications, queryFn: api.notifications })
}
export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.me })
}

export function useDecideApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, version }: { id: string; decision: 'approved' | 'rejected'; version?: number }) =>
      api.decideApproval(id, decision, version),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals }),
        queryClient.invalidateQueries({ queryKey: queryKeys.briefing }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tickets }),
      ])
    },
  })
}
