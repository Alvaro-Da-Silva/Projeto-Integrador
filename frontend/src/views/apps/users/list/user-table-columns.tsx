'use client'

// Third-party Imports
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import {
  CheckIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  UserCheck,
  UserX,
  XIcon
} from 'lucide-react'

// Type Imports
import type { AppUser, UserRole, UserStatus } from '@/types/apps/user-types'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Config Imports
import { getInitialsFromName } from '@/configs/mailConfig'

// Util Imports
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<UserStatus, string> = {
  Ativo:
    'bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40 [a&]:hover:bg-green-600/5 dark:[a&]:hover:bg-green-400/5',
  Suspenso:
    'bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive',
  Inativo:
    'bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive'
}

export interface EditingUserState {
  name: string
  patent: string
  role: UserRole
}

export interface UserTableColumnHandlers {
  onBan: (userId: string) => void
  onUnban: (userId: string) => void
  onEdit: (userId: string) => void
  onSave: (userId: string, data: EditingUserState) => void
  onCancelEdit: (userId: string) => void
  editingUserId: string | null
  editingState: EditingUserState | null
  onEditingStateChange: (state: EditingUserState) => void
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData> extends Partial<UserTableColumnHandlers> {}
}

function UserRowActions({
  user,
  meta
}: {
  user: AppUser
  meta?: Partial<UserTableColumnHandlers>
}) {
  const isSuspended = user.status === 'Suspenso'
  const isEditing = meta?.editingUserId === user.id

  if (isEditing && meta?.editingState) {
    const editingState = meta.editingState

    return (
      <div className='flex items-center justify-center gap-1'>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant='ghost'
                size='icon'
                aria-label='Salvar edição'
                onClick={() => meta.onSave?.(user.id, editingState)}
              />
            }
          >
            <CheckIcon className='size-4.5 text-green-500' />
          </TooltipTrigger>
          <TooltipContent>
            <p>Salvar</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant='ghost'
                size='icon'
                aria-label='Cancelar edição'
                onClick={() => meta.onCancelEdit?.(user.id)}
              />
            }
          >
            <XIcon className='size-4.5 text-destructive' />
          </TooltipTrigger>
          <TooltipContent>
            <p>Cancelar</p>
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className='flex items-center justify-center gap-1'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon'
              aria-label='Edit user'
              onClick={() => meta?.onEdit?.(user.id)}
            />
          }
        >
          <PencilIcon className='size-4.5 text-primary' />
        </TooltipTrigger>
        <TooltipContent>
          <p>Editar</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size='icon' variant='ghost' aria-label='Open actions' />}>
          <EllipsisVerticalIcon className='size-4.5' aria-hidden='true' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            {isSuspended ? (
              <DropdownMenuItem onClick={() => meta?.onUnban?.(user.id)}>
                <UserCheck className='size-4' />
                Ativar
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant='destructive' onClick={() => meta?.onBan?.(user.id)}>
                  <UserX className='size-4' />
                  Desativar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export const userTableColumns: ColumnDef<AppUser>[] = [
  {
    id: 'user',
    header: 'Usuário',
    accessorKey: 'name',
    cell: ({ row, table }) => {
      const meta = table.options.meta
      const isEditing = meta?.editingUserId === row.original.id
      const editingState = meta?.editingState

      return (
        <div className='flex items-center gap-2'>
          <Avatar className='size-9 shrink-0'>
            {row.original.avatar ? <AvatarImage src={row.original.avatar} alt={row.original.name} /> : null}
            <AvatarFallback className='text-xs'>{getInitialsFromName(row.original.name)}</AvatarFallback>
          </Avatar>
          <div className='flex flex-col gap-0.5 min-w-0'>
            {isEditing && editingState ? (
              <Input
                className='h-7 text-sm py-0 px-2 w-full min-w-28'
                value={editingState.name}
                onChange={e => meta?.onEditingStateChange?.({ ...editingState, name: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    meta?.onSave?.(row.original.id, editingState)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    meta?.onCancelEdit?.(row.original.id)
                  }
                }}
                placeholder='Nome'
                autoFocus
              />
            ) : (
              <span className='font-medium truncate'>{row.original.name}</span>
            )}
            <span className='text-muted-foreground text-xs truncate'>{row.original.email}</span>
          </div>
        </div>
      )
    },
    size: 360,
    enableSorting: true
  },
  {
    id: 'role',
    header: 'Função',
    accessorKey: 'role',
    cell: ({ row, table }) => {
      const meta = table.options.meta
      const isEditing = meta?.editingUserId === row.original.id
      const editingState = meta?.editingState
      const role = row.original.role

      if (isEditing && editingState) {
        return (
          <Select
            value={editingState.role}
            onValueChange={val => meta?.onEditingStateChange?.({ ...editingState, role: val as UserRole })}
          >
            <SelectTrigger className='h-7 text-sm w-28'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='user'>User</SelectItem>
              <SelectItem value='admin'>Admin</SelectItem>
            </SelectContent>
          </Select>
        )
      }

      return (
        <div className='flex items-center gap-2'>
          <span className='capitalize'>{role}</span>
        </div>
      )
    },
    enableSorting: true
  },
  {
    id: 'patent',
    header: 'Patente',
    accessorKey: 'patent',
    cell: ({ row, table }) => {
      const meta = table.options.meta
      const isEditing = meta?.editingUserId === row.original.id
      const editingState = meta?.editingState
      const patent = row.original.patent

      if (isEditing && editingState) {
        return (
          <Input
            className='h-7 text-sm py-0 px-2 w-28'
            value={editingState.patent}
            onChange={e => meta?.onEditingStateChange?.({ ...editingState, patent: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                meta?.onSave?.(row.original.id, editingState)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                meta?.onCancelEdit?.(row.original.id)
              }
            }}
            placeholder='Patente'
          />
        )
      }

      return (
        <div className='flex items-center gap-2'>
          <span className='capitalize'>{patent}</span>
        </div>
      )
    },
    enableSorting: true
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: ({ row }) => {
      const status = row.original.status

      return (
        <Badge
          className={cn('h-auto rounded-sm border-none capitalize focus-visible:outline-none', STATUS_STYLES[status])}
        >
          {status}
        </Badge>
      )
    },
    enableSorting: true
  },
  {
    id: 'joinedDate',
    header: 'Data de Registro',
    accessorKey: 'joinedDate',
    cell: ({ row }) => <span>{format(new Date(row.original.joinedDate), 'dd/MM/yyyy')}</span>,
    enableSorting: true
  },
  {
    id: 'actions',
    header: () => 'Ações',
    cell: ({ row, table }) => <UserRowActions user={row.original} meta={table.options.meta} />,
    enableHiding: false,
    enableSorting: false
  }
]

export function getUserTableColumns(_handlers?: Partial<UserTableColumnHandlers>): ColumnDef<AppUser>[] {
  return userTableColumns
}
