'use client'

import { Button } from '@base-ui/react'
import Link from 'next/link'
import { useState } from 'react'
import CreditModal from '../modals/CreditModal'

const Footer = () => {
  const [creditosAberto, setCreditosAberto] = useState(false)

  return (
    <footer className='bg-cbmsc-vermelho text-white'>
      <div className='mx-auto flex size-full max-w-360 items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 max-sm:flex-col sm:px-6'>
        <p className='text-xs font-bold tracking-wider text-balance uppercase max-sm:text-center'>
          {`©${new Date().getFullYear()}`}{' '}
          <Link href='/' target='_blank' className='text-white hover:underline'>
            SISCOTA
          </Link>{' '}
          <span className='font-medium text-white/85'>· Corpo de Bombeiros Militar de Santa Catarina</span>
        </p>
        <div className='flex items-center gap-5 max-sm:hidden'>
          <Button
            onClick={() => setCreditosAberto(true)}
            className='text-xs font-medium text-white/80 transition duration-300 hover:text-white'
          >
            Créditos
          </Button>
        </div>
      </div>
      <CreditModal open={creditosAberto} onOpenChange={setCreditosAberto} />
    </footer>

  )
}

export default Footer
