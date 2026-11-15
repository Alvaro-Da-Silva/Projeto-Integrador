'use client'

import { Suspense, type ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { SidebarInset } from '@/components/ui/sidebar'

const AUTH_ROUTES = ['/login', '/register', '/forgot_password', '/reset_password']

const AppLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname?.startsWith(`${route}/`))

  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <div className='flex h-full w-full min-w-0'>
      <Suspense>
        <Sidebar />
      </Suspense>
      <SidebarInset className='flex flex-1 flex-col'>
        <Header />
        <main className='mx-auto size-full max-w-360 flex-1 px-4 py-6 sm:px-6'>{children}</main>
        <Footer />
      </SidebarInset>
    </div>
  )
}

export default AppLayout
