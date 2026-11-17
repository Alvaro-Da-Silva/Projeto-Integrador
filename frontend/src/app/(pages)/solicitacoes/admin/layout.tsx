import type { ReactNode } from 'react'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getAuth, hasDomainAdmin } from '@/lib/auth'


const SolicitacoesAdminLayout = async ({ children }: Readonly<{ children: ReactNode }>) => {
  const requestHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: requestHeaders })

  if (!session) redirect('/login')
  if (!await hasDomainAdmin(session.user.id)) redirect('/solicitacoes')

  return <>{children}</>
}

export default SolicitacoesAdminLayout
