// Next Imports
import Link from 'next/link'

// Third-party Imports
import { ChevronLeftIcon } from 'lucide-react'

// Component Import
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ForgotPasswordForm from '@/views/pages/auth/forgot-password/forgot-password-form'


const ForgotPassword = () => {
  return (
    <div className='flex-1 flex h-auto min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8'>
      <Card className='z-1 w-full gap-6 py-6 sm:max-w-md'>
        <CardHeader className='gap-6 px-6'>

          <div>
            <CardTitle className='mb-1.5 text-2xl font-semibold'>Esqueci minha senha</CardTitle>
            <CardDescription className='text-base'>
              Digite seu email cadastrado e enviaremos instruções para redefinir sua senha
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='space-y-4 px-6'>
          <ForgotPasswordForm />

          <Button
            variant='ghost'
            className='group w-full'
            render={<Link href='/login' />}
            nativeButton={false}
          >
            <ChevronLeftIcon className='size-5 transition-transform duration-200 group-hover:-translate-x-0.5' />
            Voltar para página de login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPassword
