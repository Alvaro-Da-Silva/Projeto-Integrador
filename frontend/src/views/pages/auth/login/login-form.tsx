'use client'

// Rect Import
import { useState } from 'react'

// Next Imports
import Link from 'next/link'

// Router Imports
import { useRouter } from 'next/navigation'

// Icons Imports
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon, MailIcon } from 'lucide-react'

//Zod Imports
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { toast } from "sonner"

import type { LoginFormData } from "@/lib/schemas/login";
import { loginSchema } from "@/lib/schemas/login";

//Auth Imports
import { authClient } from '@/lib/auth-client'

// Components Import
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'


import { Spinner } from '@/components/ui/spinner'

const LoginForm = () => {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    },
  })

  const onSubmit = async (values: LoginFormData) => {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
    })

    if (error) {
      toast.error(error.status === 401 ? 'E-mail ou senha inválidos.' : 'Não foi possível entrar.')

      return
    }

    const identity = await fetch('/api/me', { cache: 'no-store' })

    if (!identity.ok) {
      await authClient.signOut()
      toast.error(identity.status === 403 ? 'Sua conta ainda não está vinculada ao SISCOTA.' : 'Não foi possível validar seu acesso.')

      return
    }

    router.replace('/')
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className='gap-5'>
        <Controller
          name='email'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='gap-2'>
              <FieldLabel htmlFor='email' className='leading-5 font-semibold'>
                Email
              </FieldLabel>
              <InputGroup className='h-11 rounded-lg bg-background'>
                <InputGroupAddon align='inline-start' className='pl-3'>
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  type='email'
                  id='email'
                  placeholder='Digite seu email'
                  autoComplete='email'
                  aria-invalid={!!fieldState.error}
                />
              </InputGroup>
              {fieldState.error && (
                <p className='text-sm text-destructive'>{fieldState.error.message}</p>
              )}
            </Field>
          )}
        />

        <Controller
          name='password'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='w-full gap-2'>
              <FieldLabel htmlFor='password' className='leading-5 font-semibold'>
                Senha
              </FieldLabel>
              <InputGroup className='h-11 rounded-lg bg-background'>
                <InputGroupAddon align='inline-start' className='pl-3'>
                  <LockKeyholeIcon />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id='password'
                  type={isVisible ? 'text' : 'password'}
                  placeholder='Digite sua senha'
                  autoComplete='current-password'
                  aria-invalid={!!fieldState.error}
                />
                <InputGroupAddon align='inline-end' className='pr-1.5'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => setIsVisible(prev => !prev)}
                    className='text-muted-foreground rounded-l-none hover:bg-transparent'
                  >
                    {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                    <span className='sr-only'>{isVisible ? 'Esconder senha' : 'Mostrar senha'}</span>
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              {fieldState.error && (
                <p className='text-sm text-destructive'>{fieldState.error.message}</p>
              )}
            </Field>
          )}
        />

        <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2'>
          <Controller
            name='rememberMe'
            control={form.control}
            render={({ field }) => (
              <Field orientation='horizontal' className='flex w-auto items-center gap-2'>
                <Checkbox
                  id='rememberMe'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
                <FieldLabel htmlFor='rememberMe' className='text-muted-foreground'>
                  Lembrar-me
                </FieldLabel>
              </Field>
            )}
          />
          <Link href='/forgot_password' className='text-sm font-semibold text-nowrap text-(--auth-accent) hover:underline'>
            Esqueci minha senha
          </Link>
        </div>

        <Field className='pt-1'>
          <Button
            className='group h-11 w-full rounded-lg text-base font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90'
            type='submit'
            disabled={form.formState.isSubmitting || !form.formState.isValid}
          >
            {form.formState.isSubmitting ? (
              <span className='flex items-center gap-2'>
                <Spinner className='size-4' />
              </span>
            ) : (
              <>
                Entrar
                <ArrowRightIcon className='transition-transform duration-200 group-hover:translate-x-0.5' />
              </>
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default LoginForm