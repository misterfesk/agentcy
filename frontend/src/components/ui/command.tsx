import { Command as CommandPrimitive } from 'cmdk'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const Command = CommandPrimitive

export function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="border-b border-border px-3">
      <CommandPrimitive.Input
        className={cn('flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground', className)}
        {...props}
      />
    </div>
  )
}

export const CommandList = CommandPrimitive.List
export const CommandEmpty = CommandPrimitive.Empty
export const CommandGroup = CommandPrimitive.Group
export function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[selected=true]:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
