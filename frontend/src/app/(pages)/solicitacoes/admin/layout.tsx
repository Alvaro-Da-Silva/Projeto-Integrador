import type { ReactNode } from 'react'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'

const isAdmin = (role?: string | null) => (role ?? '').split(',').map(r => r.trim()).includes('admin')

const SolicitacoesAdminLayout = async ({ children }: Readonly<{ children: ReactNode }>) => {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect('/login')
  if (!isAdmin(session.user.role)) redirect('/solicitacoes')

  return <>{children}</>
}

export default SolicitacoesAdminLayout
