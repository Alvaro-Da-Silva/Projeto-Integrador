// Next Imports
import Link from 'next/link'

// Components Import
import Logo from '@/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import LoginForm from '@/views/pages/auth/login/login-form'

const Login = () => {
  return (
    <div className='flex-1 flex h-auto min-h-screen items-center justify-center px-1 py-1 sm:px-6 lg:px-8'>
      <Card className='z-1 w-full gap-6 py-6 sm:max-w-lg'>
        <CardHeader className='gap-6 px-6'>
          <Link href='/'>
            <Logo className='gap-3' />
          </Link>

          <div>
            <CardTitle className='mb-2 text-2xl font-semibold'>SISCOTA</CardTitle>
            <CardDescription className='text-base'>Acesse sua conta para continuar</CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          <div className='space-y-4'>
            <LoginForm />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
