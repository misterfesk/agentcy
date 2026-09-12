import { useMemo, type ReactNode } from 'react'
import { tableFeatures, useTable } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

const features = tableFeatures({})

export type OpsColumn<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

export function OpsTable<T extends { id: string }>({
  data,
  columns,
  minWidth = '720px',
  rowClassName,
  empty,
}: {
  data: T[]
  columns: OpsColumn<T>[]
  minWidth?: string
  rowClassName?: (row: T) => string | undefined
  empty?: ReactNode
}) {
  const columnDefs = useMemo(
    () =>
      columns.map((col) => ({
        id: col.id,
        header: col.header,
        cell: ({ row }: { row: { original: T } }) => col.cell(row.original),
      })),
    [columns],
  )

  const table = useTable({
    features,
    data,
    columns: columnDefs,
    getRowId: (row) => row.id,
  })

  if (data.length === 0) return empty ?? null

  return (
    <div className="overflow-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} className="border-b border-border px-3 py-2 font-medium">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className={cn('border-b border-border last:border-0', rowClassName?.(row.original))}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 align-top">
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
