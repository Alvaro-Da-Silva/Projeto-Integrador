'use client'

// Next Imports
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Component Import
import AuthLayout from '@/views/pages/auth/auth-layout'
import RegisterForm from '@/views/pages/auth/register/register-form'
import { ArrowLeft } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'


const Register = () => {
  const router = useRouter()

  return (
    <AuthLayout
      eyebrow='Novo cadastro'
      title='Cadastre-se no SISCOTA'
      description='Crie sua conta para continuar'
      topSlot={
        <div className='mb-6'>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  size='icon-lg'
                  aria-label='Voltar'
                  className='rounded-full'
                  onClick={() => router.back()}
                />
              }
            >
              <ArrowLeft className='size-5 text-(--auth-accent)' />
            </TooltipTrigger>
            <TooltipContent>
              <p>Voltar</p>
            </TooltipContent>
          </Tooltip>
        </div>
      }
    >
      <div className='space-y-6'>
        <RegisterForm />
        <p className='text-center text-muted-foreground'>
          Já tem uma conta?{' '}
          <Link href='/login' className='font-semibold text-(--auth-accent) hover:underline'>
            Faça login
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

export default Register
