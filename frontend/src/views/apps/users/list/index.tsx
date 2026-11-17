'use client'

import { useCallback, useEffect, useState } from 'react'

import type { AppUser, UserFilters, UserRole, UserSorting } from '@/types/apps/user-types'

import { getUsers, banUser, unbanUser, updateUser } from '@/controllers/UsersController'
import type { EditingUserState } from './user-table-columns'

import { Card } from '@/components/ui/card'
import { UserPagination } from './user-pagination'
import { UserTable } from './user-table'
import { UserTableFilters } from './user-table-filters'
import { UserTableToolbar } from './user-table-toolbar'
import { toast } from 'sonner'

const DEFAULT_FILTERS: UserFilters = {
  role: 'all',
  plan: 'all',
  status: 'all',
  search: ''
}

const UserListApp = () => {
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [sorting, setSorting] = useState<UserSorting | null>(null)

  const [users, setUsers] = useState<AppUser[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<EditingUserState | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchUsers = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const result = await getUsers(filters, sorting, currentPage, rowsPerPage)

        if (!cancelled) {
          setUsers(result.users)
          setTotal(result.total)
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Erro ao buscar usuários')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      cancelled = true
    }
  }, [filters, sorting, currentPage, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage))
  const showingFrom = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1
  const showingTo = Math.min(currentPage * rowsPerPage, total)

  const handleFilterChange = (newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1)
  }

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search }))
    setCurrentPage(1)
  }

  const handleRowsPerPageChange = (n: number) => {
    setRowsPerPage(n)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSortingChange = (newSorting: UserSorting | null) => {
    setSorting(newSorting)
    setCurrentPage(1)
  }

  const handleBan = useCallback(async (userId: string) => {
    try {
      const updated = await banUser(userId)
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
      toast.success('Usuário suspenso com sucesso.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao suspender usuário.')
    }
  }, [])

  const handleUnban = useCallback(async (userId: string) => {
    try {
      const updated = await unbanUser(userId)
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
      toast.success('Usuário ativado com sucesso.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao ativar usuário.')
    }
  }, [])

  const handleEdit = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    setEditingUserId(userId)
    setEditingState({
      name: user.name,
      patent: user.patent ?? '',
      role: user.role as UserRole
    })
  }, [users])

  const handleCancelEdit = useCallback(() => {
    setEditingUserId(null)
    setEditingState(null)
  }, [])

  const handleSave = useCallback(async (userId: string, data: EditingUserState) => {
    if (isSaving) return
    setIsSaving(true)

    try {
      const user = users.find(u => u.id === userId)
      const payload: { name?: string; patent?: string | null; role?: UserRole } = {}

      if (user?.name !== data.name) payload.name = data.name
      if ((user?.patent ?? '') !== data.patent) payload.patent = data.patent || null
      if (user?.role !== data.role) payload.role = data.role

      if (Object.keys(payload).length === 0) {
        toast.info('Nenhuma alteração detectada.')
        setEditingUserId(null)
        setEditingState(null)
        return
      }

      const updated = await updateUser(userId, payload)
      setUsers(prev => prev.map(u => u.id === userId ? updated : u))
      setEditingUserId(null)
      setEditingState(null)
      toast.success('Usuário atualizado com sucesso.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar usuário.')
    } finally {
      setIsSaving(false)
    }
  }, [users, isSaving])

  return (
    <div className='flex flex-col gap-3 lg:gap-6'>
      <Card className='py-0 shadow-none'>
        <div className='w-full'>
          <div className='border-b'>
            <UserTableFilters filters={filters} onFilterChange={handleFilterChange} />
            <UserTableToolbar
              search={filters.search}
              rowsPerPage={rowsPerPage}
              onSearch={handleSearchChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
            <UserTable
              paginatedUsers={users}
              totalPages={totalPages}
              sorting={sorting}
              onSortingChange={handleSortingChange}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onBan={handleBan}
              onUnban={handleUnban}
              onEdit={handleEdit}
              onSave={handleSave}
              onCancelEdit={handleCancelEdit}
              editingUserId={editingUserId}
              editingState={editingState}
              onEditingStateChange={setEditingState}
            />
          </div>

          <UserPagination
            showingFrom={showingFrom}
            showingTo={showingTo}
            total={total}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </Card>
    </div>
  )
}

export default UserListApp
