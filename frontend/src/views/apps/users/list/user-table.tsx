'use client'

// Third-party Imports
import type { SortingState, Updater } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

// Type Imports
import type { AppUser, UserSorting } from '@/types/apps/user-types'

// Component Imports
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Util Imports
import { cn } from '@/lib/utils'
import { userTableColumns, type UserTableColumnHandlers } from './user-table-columns'

export interface UserTableProps {
  paginatedUsers: AppUser[]
  totalPages: number
  sorting: UserSorting | null
  onSortingChange: (sorting: UserSorting | null) => void
  isLoading?: boolean
  errorMessage?: string | null
  onBan: UserTableColumnHandlers['onBan']
  onUnban: UserTableColumnHandlers['onUnban']
  onEdit: UserTableColumnHandlers['onEdit']
  onSave: UserTableColumnHandlers['onSave']
  onCancelEdit: UserTableColumnHandlers['onCancelEdit']
  editingUserId: UserTableColumnHandlers['editingUserId']
  editingState: UserTableColumnHandlers['editingState']
  onEditingStateChange: UserTableColumnHandlers['onEditingStateChange']
}

export function UserTable({
  paginatedUsers,
  totalPages,
  sorting,
  onSortingChange,
  isLoading = false,
  errorMessage = null,
  onBan,
  onUnban,
  onEdit,
  onSave,
  onCancelEdit,
  editingUserId,
  editingState,
  onEditingStateChange
}: UserTableProps) {
  const sortingState: SortingState = sorting ? [sorting] : []

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const nextSorting = typeof updater === 'function' ? updater(sortingState) : updater

    if (nextSorting.length === 0) {
      onSortingChange(null)

      return
    }

    onSortingChange({
      id: nextSorting[0].id as UserSorting['id'],
      desc: nextSorting[0].desc
    })
  }

  const table = useReactTable({
    data: paginatedUsers,
    columns: userTableColumns,
    meta: {
      onBan,
      onUnban,
      onEdit,
      onSave,
      onCancelEdit,
      editingUserId,
      editingState,
      onEditingStateChange
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    pageCount: totalPages,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
    enableRowSelection: false,
    enableSortingRemoval: false,
    state: {
      sorting: sortingState
    },
    onSortingChange: handleSortingChange
  })

  const rows = table.getRowModel().rows

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id} className='h-14 border-t'>
            {headerGroup.headers.map(header => (
              <TableHead
                key={header.id}
                style={{ width: `${header.getSize()}px` }}
                className='text-muted-foreground first:pl-4 last:px-4 last:text-center'
              >
                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                  <div
                    className={cn(
                      header.column.getCanSort() &&
                        'flex h-full cursor-pointer items-center justify-between gap-2 select-none'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={event => {
                      if (header.column.getCanSort() && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault()
                        header.column.getToggleSortingHandler()?.(event)
                      }
                    }}
                    tabIndex={header.column.getCanSort() ? 0 : undefined}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: <ChevronUpIcon className='size-4 shrink-0 opacity-60' aria-hidden='true' />,
                      desc: <ChevronDownIcon className='size-4 shrink-0 opacity-60' aria-hidden='true' />
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className={cn(isLoading && 'opacity-60 transition-opacity')}>
        {errorMessage ? (
          <TableRow>
            <TableCell colSpan={userTableColumns.length} className='text-destructive h-24 text-center'>
              {errorMessage}
            </TableCell>
          </TableRow>
        ) : rows.length ? (
          rows.map(row => (
            <TableRow key={row.id} className={cn(editingUserId === row.id && 'bg-muted/40')}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className='h-14 first:w-12.5 first:pl-4 last:w-29 last:px-4'>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={userTableColumns.length} className='h-24 text-center'>
              {isLoading ? 'Carregando usuários…' : 'Nenhum usuário encontrado.'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}