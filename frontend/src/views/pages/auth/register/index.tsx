'use client'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Component Import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import RegisterForm from '@/views/pages/auth/register/register-form'
import { ArrowLeft } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'


const Register = () => {
  const router = useRouter()

  return (
    <div className='flex-1 flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <Card className='z-1 w-full gap-6 py-6 sm:max-w-lg'>
        <CardHeader className='gap-6 px-6'>
          <div className='cursor-pointer' onClick={() => router.back()}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label='Voltar'
                    onClick={() => router.back()}
                  />
                }
              >
                <ArrowLeft className='size-7 text-primary' />
              </TooltipTrigger>
              <TooltipContent>
                <p>Voltar</p>
              </TooltipContent>
            </Tooltip>
          </div>

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
