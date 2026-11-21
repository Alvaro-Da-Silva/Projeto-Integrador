import { PlusIcon, SearchIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

const ROWS_PER_PAGE_ITEMS = ROWS_PER_PAGE_OPTIONS.map(option => ({
  label: String(option),
  value: String(option)
}))

export interface UserTableToolbarProps {
  search: string
  rowsPerPage: number
  onSearch: (search: string) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
}

export function UserTableToolbar({ search, rowsPerPage, onSearch, onRowsPerPageChange }: UserTableToolbarProps) {
  const router = useRouter()

  return (
    <div className='flex gap-4 p-4 max-sm:flex-col sm:items-center sm:justify-between sm:p-6'>
      <div className='w-full sm:max-w-2xs'>
        <Label htmlFor='search-user' className='sr-only'>
          Pesquisar usuário
        </Label>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            id='search-user'
            value={search}
            onChange={event => onSearch(event.target.value)}
            placeholder='Pesquisar usuário'
            type='text'
          />
        </InputGroup>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Label htmlFor='rows-per-page' className='sr-only'>
            Mostrar
          </Label>
          <Select
            items={ROWS_PER_PAGE_ITEMS}
            value={String(rowsPerPage)}
            onValueChange={(value: string | null) => {
              if (value) {
                onRowsPerPageChange(Number(value))
              }
            }}
          >
            <SelectTrigger id='rows-per-page' className='w-fit whitespace-nowrap'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ROWS_PER_PAGE_OPTIONS.map(option => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => router.push('/register')}>
          <PlusIcon />
          <span className='lg:hidden'>Novo usuário</span>
          <span className='max-lg:hidden'>Adicionar Novo Usuário</span>
        </Button>
      </div>
    </div>
  )
}
