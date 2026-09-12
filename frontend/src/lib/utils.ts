import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isDemoMode() {
  return (import.meta.env.VITE_DATA_MODE ?? 'demo') !== 'api'
}

export function apiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
}
