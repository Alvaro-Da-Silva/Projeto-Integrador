'use client'

import { useState } from 'react'

// Type Imports
import type { AppUser, UserFilters, UserSorting } from '@/types/apps/user-types'

// Component Imports
import { Card } from '@/components/ui/card'
import { UserPagination } from './user-pagination'
import { UserTable } from './user-table'
import { UserTableFilters } from './user-table-filters'
import { UserTableToolbar } from './user-table-toolbar'

const mockUsers: AppUser[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin',
    plan: 'Enterprise',
    status: 'Active',
    billing: 'Auto Debit',
    company: 'Acme Corp',
    country: 'USA',
    contact: '+1 234 567 8900',
    joinedDate: '2023-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'Editor',
    plan: 'Team',
    status: 'Pending',
    billing: 'Manual',
    company: 'Beta LLC',
    country: 'Canada',
    contact: '+1 987 654 3210',
    joinedDate: '2023-02-15T00:00:00.000Z'
  }
]

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

  const handleFilterChange = (newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search }))
  }

  const handleRowsPerPageChange = (n: number) => {
    setRowsPerPage(n)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSortingChange = (newSorting: UserSorting | null) => {
    setSorting(newSorting)
  }

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
              paginatedUsers={mockUsers}
              totalPages={1}
              sorting={sorting}
              onSortingChange={handleSortingChange}
            />
          </div>

          <UserPagination
            showingFrom={1}
            showingTo={mockUsers.length}
            total={mockUsers.length}
            currentPage={currentPage}
            totalPages={1}
            onPageChange={handlePageChange}
          />
        </div>
      </Card>
    </div>
  )
}

export default UserListApp
