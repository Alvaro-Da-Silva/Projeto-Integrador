'use client'

import { useState } from 'react'

import { AddEditUserSheet } from '@/views/apps/users/dialogs/add-edit-user-sheet'
import { UserViewLeftPanel } from './user-view-left-panel'
import { UserViewTabs } from './user-view-tabs'

import type { AppUser } from '@/types/apps/user-types'

const STATIC_USER: AppUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
  plan: 'Enterprise',
  status: 'Ativo',
  billing: 'Auto Debit',
  company: 'Acme Corp',
  country: 'USA',
  contact: '+1 234 567 8900',
  joinedDate: '2023-01-01T00:00:00.000Z'
}

const UserViewApp = () => {
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  return (
    <>
      <div className='relative grid grid-cols-1 gap-6 lg:grid-cols-[350px_minmax(0,1fr)]'>
        <UserViewLeftPanel user={STATIC_USER} onEdit={() => setIsEditSheetOpen(true)} />
        <UserViewTabs user={STATIC_USER} />
      </div>

      <AddEditUserSheet
        mode={isEditSheetOpen ? 'edit' : null}
        user={STATIC_USER}
        onClose={() => setIsEditSheetOpen(false)}
        onAdd={() => {}}
        onEdit={() => setIsEditSheetOpen(false)}
      />
    </>
  )
}

export default UserViewApp
