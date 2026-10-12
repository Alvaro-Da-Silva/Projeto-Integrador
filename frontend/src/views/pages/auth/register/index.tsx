// Next Imports
import Link from 'next/link'

// Component Import
import Logo from '@/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RegisterForm from '@/views/pages/auth/register/register-form'


const Register = () => {
  return (
    <div className='flex-1 flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <Card className='z-1 w-full gap-6 py-6 sm:max-w-lg'>
        <CardHeader className='gap-6 px-6'>
          <Link href='/'>
            <Logo className='gap-3' />
          </Link>

          <div>
            <CardTitle className='mb-2 text-2xl font-semibold'>Cadastre-se no SISCOTA</CardTitle>
            <CardDescription className='text-base'>Crie sua conta para continuar</CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          <div className='space-y-4'>
            <RegisterForm />
            <p className='text-muted-foreground text-center'>
              Já tem uma conta?{' '}
              <Link href='/login' className='text-card-foreground hover:underline'>
                Faça login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Register
