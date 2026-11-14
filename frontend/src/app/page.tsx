'use client'

import { useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { Spinner } from '@/components/ui/spinner'
import { CoordenadorDashboard } from '@/views/dashboards/coordenador-dashboard'
import { CotistaDashboard } from '@/views/dashboards/cotista-dashboard'

import { authClient } from '@/lib/auth-client'

const isAdmin = (role?: string | null) => (role ?? '').split(',').map(r => r.trim()).includes('admin')

const DashboardPage = () => {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) router.replace('/login')
  }, [session, isPending, router])

  if (isPending || !session) {
    return (
      <div className='flex flex-1 items-center justify-center py-20'>
        <Spinner className='text-muted-foreground size-6' />
      </div>
    )
  }

  return isAdmin(session.user.role) ? <CoordenadorDashboard /> : <CotistaDashboard />
}

export default DashboardPage
