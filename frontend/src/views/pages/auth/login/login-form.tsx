'use client'

// Rect Import
import { useState } from 'react'

// Next Imports
import Link from 'next/link'

// Router Imports
import { useRouter } from 'next/navigation'

// Icons Imports
import { EyeIcon, EyeOffIcon } from 'lucide-react'

//Zod Imports
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, LoginFormData } from "@/lib/schemas/login";

//Auth Imports
import { authClient } from '@/lib/auth-client'

// Components Import
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { toast } from "sonner"
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
    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
    },{
      onSuccess: () => {
        router.push('/dashboard/orders')
      },
      onError: (ctx) => {
        if(ctx.error.message == "Invalid email or password"){
          toast.error("Email ou senha inválidos, tente novamente!")
          form.reset()
        }else{
          toast.error("Erro ao logar")
          console.log("Deu erro no login:",ctx.error)
        }
      },
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className='gap-4'>
        <Controller
          name='email'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='gap-2'>
              <FieldLabel htmlFor='email' className='leading-5'>
                Email
              </FieldLabel>
              <Input
                {...field}
                type='email'
                id='email'
                placeholder='Digite seu email'
                aria-invalid={!!fieldState.error}
              />
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
              <FieldLabel htmlFor='password' className='leading-5'>
                Senha
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  {...field}
                  id='password'
                  type={isVisible ? 'text' : 'password'}
                  placeholder='Digite sua senha'
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

        <div className='flex items-center justify-between gap-y-2'>
          <Controller
            name='rememberMe'
            control={form.control}
            render={({ field }) => (
              <Field orientation='horizontal' className='flex items-center gap-2'>
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
          <Link href='/forgot_password' className='text-base text-nowrap hover:underline'>
            Esqueci minha senha
          </Link>
        </div>

        <Field>
          <Button className='w-full' type='submit' disabled={form.formState.isSubmitting || !form.formState.isValid}>
            {form.formState.isSubmitting ? (
              <span className='flex items-center gap-2'>
                <Spinner className='size-4' />
              </span>
            ) : (
              'Entrar'
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default LoginForm