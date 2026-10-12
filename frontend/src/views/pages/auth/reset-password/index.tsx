// Next Imports
import Link from 'next/link'

// Third-party imports
import { ChevronLeftIcon } from 'lucide-react'

// Component Imports
import Logo from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ResetPasswordForm from '@/views/pages/auth/reset-password/reset-password-form'


const ResetPassword = () => {
  return (
    <div className='flex-1 flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>

      <Card className='z-1 w-full gap-6 py-6 sm:max-w-md'>
        <CardHeader className='gap-6 px-6'>

          <div>
            <CardTitle className='mb-2 text-2xl font-semibold'>Resete sua senha</CardTitle>
            <CardDescription className='text-base'>
              Por favor, insira seu email cadastrado e escolha uma nova senha para atualizar a segurança da sua conta.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='space-y-4 px-6'>
          <ResetPasswordForm />

          <Button
            variant='ghost'
            className='group w-full'
            render={<Link href='/login' />}
            nativeButton={false}
          >
            <ChevronLeftIcon className='size-5 transition-transform duration-200 group-hover:-translate-x-0.5' />
            Voltar para o login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPassword
