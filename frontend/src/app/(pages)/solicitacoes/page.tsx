'use client'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { Spinner } from '@/components/ui/spinner'
import { CotistaCalendar } from '@/views/apps/calendar/cotista-calendar'

import { authClient } from '@/lib/auth-client'

const isAdmin = (role?: string | null) => (role ?? '').split(',').map(r => r.trim()).includes('admin')

const SolicitacoesPage = () => {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()
  const admin = isAdmin(session?.user.role)

  useEffect(() => {
    if (isPending) return
    if (!session) router.replace('/login')
    else if (admin) router.replace('/solicitacoes/admin')
  }, [session, isPending, admin, router])

  if (isPending || !session || admin) {
    return (
      <div className='flex flex-1 items-center justify-center py-20'>
        <Spinner className='size-6 text-muted-foreground' />
      </div>
    )
  }

  return <CotistaCalendar />
}

export default SolicitacoesPage
