// Next Imports
import Link from 'next/link'

// Third-party Imports
import { ChevronLeftIcon } from 'lucide-react'

// Component Import
import { Button } from '@/components/ui/button'
import AuthLayout from '@/views/pages/auth/auth-layout'
import ForgotPasswordForm from '@/views/pages/auth/forgot-password/forgot-password-form'


const ForgotPassword = () => {
  return (
    <AuthLayout
      eyebrow='Recuperação de acesso'
      title='Esqueci minha senha'
      description='Digite seu email cadastrado e enviaremos instruções para redefinir sua senha'
    >
      <div className='space-y-4'>
        <ForgotPasswordForm />

        <Button
          variant='ghost'
          className='group h-11 w-full text-muted-foreground hover:text-foreground'
          render={<Link href='/login' />}
          nativeButton={false}
        >
          <ChevronLeftIcon className='size-5 transition-transform duration-200 group-hover:-translate-x-0.5' />
          Voltar para página de login
        </Button>
      </div>
    </AuthLayout>
  )
}

export default ForgotPassword
