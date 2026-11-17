'use client'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { Spinner } from '@/components/ui/spinner'
import { AdminDefinitivaCalendar } from '@/views/apps/calendar/admin-definitiva-calendar'
import { CotistaDefinitivaCalendar } from '@/views/apps/calendar/cotista-definitiva-calendar'

import { authClient } from '@/lib/auth-client'

const isAdmin = (role?: string | null) => (role ?? '').split(',').map(r => r.trim()).includes('admin')


const DefinitivaPage = () => {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) router.replace('/login')
  }, [session, isPending, router])

  if (isPending || !session) {
    return (
      <div className='flex flex-1 items-center justify-center py-20'>
        <Spinner className='size-6 text-muted-foreground' />
      </div>
    )
  }

  return isAdmin(session.user.role) ? <AdminDefinitivaCalendar /> : <CotistaDefinitivaCalendar />
}

export default DefinitivaPage
