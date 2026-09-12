import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'flex min-h-20 w-full rounded-md border border-input bg-card px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('text-xs font-medium text-foreground', className)} {...props} />
}

export function Separator({ className, orientation = 'horizontal' }: { className?: string; orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      role="separator"
      className={cn(
        'bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'span'> & { variant?: 'default' | 'secondary' | 'outline' | 'healthy' | 'attention' | 'urgent' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none',
        variant === 'default' && 'border-transparent bg-primary text-primary-foreground',
        variant === 'secondary' && 'border-transparent bg-secondary text-secondary-foreground',
        variant === 'outline' && 'border-border text-foreground',
        variant === 'healthy' && 'border-healthy/30 bg-healthy/10 text-healthy-foreground',
        variant === 'attention' && 'border-attention/40 bg-attention/15 text-attention-foreground',
        variant === 'urgent' && 'border-urgent/30 bg-urgent/10 text-urgent-foreground',
        className,
      )}
      {...props}
    />
  )
}
