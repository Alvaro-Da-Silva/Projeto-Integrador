import type { UserFilters, UserRole, UserStatus } from '@/types/apps/user-types'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ROLES: UserRole[] = ['admin', 'user']
const STATUSES: UserStatus[] = ['Ativo', 'Suspenso']

const ROLE_ITEMS = [{ label: 'Todas', value: 'all' }, ...ROLES.map(role => ({ label: role, value: role }))]
const STATUS_ITEMS = [{ label: 'Todos', value: 'all' }, ...STATUSES.map(status => ({ label: status, value: status }))]

export interface UserTableFiltersProps {
  filters: UserFilters
  onFilterChange: (filters: Partial<UserFilters>) => void
}

export function UserTableFilters({ filters, onFilterChange }: UserTableFiltersProps) {
  return (
    <div className='flex flex-col gap-4 border-b p-6'>
      <div className='grid grid-cols-1 gap-6 max-md:*:last:col-span-full sm:grid-cols-2 md:grid-cols-3'>
        <div className='flex w-full flex-col gap-2'>
          <Label htmlFor='filter-role'>Função</Label>
          <Select
            items={ROLE_ITEMS}
            value={filters.role}
            onValueChange={(value: string | null) => {
              if (value) {
                onFilterChange({ role: value as UserFilters['role'] })
              }
            }}
          >
            <SelectTrigger id='filter-role' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='all'>Todas</SelectItem>
                {ROLES.map(role => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>


        <div className='flex w-full flex-col gap-2'>
          <Label htmlFor='filter-status'>Status</Label>
          <Select
            items={STATUS_ITEMS}
            value={filters.status}
            onValueChange={(value: string | null) => {
              if (value) {
                onFilterChange({ status: value as UserFilters['status'] })
              }
            }}
          >
            <SelectTrigger id='filter-status' className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='all'>Todos</SelectItem>
                {STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
