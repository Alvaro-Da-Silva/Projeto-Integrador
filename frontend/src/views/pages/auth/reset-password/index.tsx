import Link from 'next/link'

import { ChevronLeftIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import AuthLayout from '@/views/pages/auth/auth-layout'
import ResetPasswordForm from '@/views/pages/auth/reset-password/reset-password-form'


const ResetPassword = () => {
  return (
    <AuthLayout
      eyebrow='Recuperação de acesso'
      title='Resete sua senha'
      description='Escolha uma nova senha para atualizar a segurança da sua conta.'
    >
      <div className='space-y-4'>
        <ResetPasswordForm />

        <Button
          variant='ghost'
          className='group h-11 w-full text-muted-foreground hover:text-foreground'
          render={<Link href='/login' />}
          nativeButton={false}
        >
          <ChevronLeftIcon className='size-5 transition-transform duration-200 group-hover:-translate-x-0.5' />
          Voltar para o login
        </Button>
      </div>
    </AuthLayout>
  )
}

export default ResetPassword
