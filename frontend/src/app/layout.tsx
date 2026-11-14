import type { ReactNode } from 'react'

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { NuqsAdapter } from 'nuqs/adapters/next/app'

import Providers from '@/components/Providers'
import AppLayout from '@/components/layout/AppLayout'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

import { cn } from '@/lib/utils'

import './globals.css'
import ScrollToTop from '@/components/layout/ScrollToTop'


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'SISCOTA',
}

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <html
      lang='en'
      className={cn(geistSans.variable, geistMono.variable, 'flex min-h-full w-full antialiased')}
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
