import type { ReactNode } from 'react'

import type { Metadata } from 'next'

import { NuqsAdapter } from 'nuqs/adapters/next/app'

import Providers from '@/components/Providers'
import AppLayout from '@/components/layout/AppLayout'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

import { cn } from '@/lib/utils'

import './fonts/roboto.css'
import './globals.css'
import ScrollToTop from '@/components/layout/ScrollToTop'


export const metadata: Metadata = {
  title: 'SISCOTA',
}

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <html
      lang='en'
      className={cn('flex min-h-full w-full antialiased')}
      data-scroll-behavior='smooth'
      suppressHydrationWarning
    >
      <body className='flex min-h-full w-full flex-auto flex-col'>
        <NuqsAdapter>
          <Providers sidebarDefaultOpen={true}>
            <TooltipProvider>
              <AppLayout>{children}</AppLayout>
            </TooltipProvider>
            <Toaster richColors position='top-center' />
          </Providers>
        </NuqsAdapter>

        <ScrollToTop />

      </body>
    </html>
  )
}

export default RootLayout
