import type { ReactNode } from 'react'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getAuth, hasDomainAdmin } from '@/lib/auth'

// Cadastro de usuários é exclusivo de administradores; o backend também confere o perfil.
const RegisterLayout = async ({ children }: Readonly<{ children: ReactNode }>) => {
  const session = await getAuth().api.getSession({ headers: await headers() })

  if (!session) redirect('/login')
  if (!await hasDomainAdmin(session.user.id)) redirect('/')

  return <>{children}</>
}

export default RegisterLayout
