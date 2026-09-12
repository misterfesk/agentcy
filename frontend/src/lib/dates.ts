import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow } from 'date-fns'

export function parseUtc(value: string) {
  return new Date(value)
}

export function formatAbsolute(value: string) {
  return format(parseUtc(value), 'MMM d, yyyy HH:mm:ss')
}

export function formatShort(value: string) {
  return format(parseUtc(value), 'MMM d, HH:mm')
}

export function formatRelative(value: string) {
  return formatDistanceToNowStrict(parseUtc(value), { addSuffix: true })
}

export function dueStateLabel(value: string | null | undefined) {
  if (!value) return 'No due date'
  const date = parseUtc(value)
  if (isPast(date) && !isToday(date)) return 'Overdue'
  if (isToday(date)) return 'Due today'
  if (isTomorrow(date)) return 'Due tomorrow'
  return `Due ${format(date, 'MMM d')}`
}

export function formatDurationMs(ms: number | null | undefined) {
  if (ms == null) return '—'
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function remainingLabel(deadline: string) {
  const ms = parseUtc(deadline).getTime() - Date.now()
  if (ms <= 0) return 'Breached'
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0 && minutes <= 30) return 'Due soon'
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

export function slaKind(deadline: string): 'ok' | 'soon' | 'breached' {
  const ms = parseUtc(deadline).getTime() - Date.now()
  if (ms <= 0) return 'breached'
  if (ms <= 30 * 60 * 1000) return 'soon'
  return 'ok'
}
