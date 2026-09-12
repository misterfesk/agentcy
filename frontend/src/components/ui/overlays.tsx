import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export function DropdownMenuContent({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        className={cn('z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-md', className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}
export function DropdownMenuItem({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn('flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted', className)}
      {...props}
    />
  )
}
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator
export const DropdownMenuLabel = DropdownMenuPrimitive.Label

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value
export function SelectTrigger({ className, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-2.5 text-sm',
        className,
      )}
      {...props}
    >
      {props.children}
      <ChevronDown className="size-3.5 opacity-60" />
    </SelectPrimitive.Trigger>
  )
}
export function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className={cn('z-50 overflow-hidden rounded-md border border-border bg-popover shadow-md', className)} {...props}>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}
export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn('relative flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted', className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export const Tabs = TabsPrimitive.Root
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('inline-flex h-8 items-center gap-1 rounded-md bg-muted p-0.5', className)} {...props} />
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-7 items-center rounded-sm px-2.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    />
  )
}
export const TabsContent = TabsPrimitive.Content

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
export function TooltipContent({ className, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn('z-50 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md', className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export function PopoverContent({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        className={cn('z-50 w-80 rounded-md border border-border bg-popover p-3 shadow-md', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'flex size-4 items-center justify-center rounded border border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export function ScrollArea({ className, children, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root className={cn('overflow-hidden', className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full">{children}</ScrollAreaPrimitive.Viewport>
    </ScrollAreaPrimitive.Root>
  )
}

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative h-5 w-9 rounded-full bg-input data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-card transition data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  )
}
