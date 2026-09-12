import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-4 shadow-lg',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-3 space-y-1', className)} {...props} />
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold', className)} {...props} />
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger

export function AlertDialogContent({ className, children, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/30" />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[min(480px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-4',
          className,
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  )
}

export function AlertDialogHeader(props: React.ComponentProps<'div'>) {
  return <div className="mb-3 space-y-1" {...props} />
}
export const AlertDialogTitle = AlertDialogPrimitive.Title
export const AlertDialogDescription = AlertDialogPrimitive.Description
export function AlertDialogFooter(props: React.ComponentProps<'div'>) {
  return <div className="mt-4 flex justify-end gap-2" {...props} />
}
export const AlertDialogCancel = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof AlertDialogPrimitive.Cancel>>(
  function AlertDialogCancel({ className, ...props }, ref) {
    return (
      <AlertDialogPrimitive.Cancel asChild>
        <Button ref={ref} variant="outline" className={className} {...props} />
      </AlertDialogPrimitive.Cancel>
    )
  },
)
export const AlertDialogAction = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof AlertDialogPrimitive.Action>>(
  function AlertDialogAction({ className, ...props }, ref) {
    return (
      <AlertDialogPrimitive.Action asChild>
        <Button ref={ref} className={className} {...props} />
      </AlertDialogPrimitive.Action>
    )
  },
)

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: 'right' | 'left' }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex h-full w-[min(560px,100%)] flex-col border-border bg-card shadow-lg',
          side === 'right' ? 'top-0 right-0 border-l' : 'top-0 left-0 border-r',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
