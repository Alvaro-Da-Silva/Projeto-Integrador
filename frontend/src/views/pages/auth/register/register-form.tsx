'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { EyeIcon, EyeOffIcon } from 'lucide-react'

// Zod Imports
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, RegisterFormData } from "@/lib/schemas/login";

// Auth Imports
import { authClient } from "@/lib/auth-client";

// Components Imports
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { toast } from "sonner"
import { Spinner } from '@/components/ui/spinner'

const RegisterForm = () => {
  const router = useRouter()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (values: RegisterFormData) => {
    const { data, error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    },{
      onSuccess: () => {
        toast.success("Conta criada com sucesso!")
        form.reset()
        router.push("/login")
      },
      onError: (ctx) => {
        toast.error("Erro ao cadastrar conta, tente novamente")
        console.log("Deu erro no cadastro:", ctx.error)
        form.reset()
      },
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className='gap-4'>
        <Controller
          name='name'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='gap-2'>
              <FieldLabel className='leading-5' htmlFor='username'>
                Nome
              </FieldLabel>
              <Input
                type='text'
                id='username'
                placeholder='Digite seu nome'
                {...field}
                aria-invalid={!!fieldState.error} />
              {fieldState.error && (
                <p className='text-sm text-destructive'>{fieldState.error.message}</p>
              )}
            </Field>
          )}
        />
        <Controller
          name='email'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='gap-2'>
              <FieldLabel className='leading-5' htmlFor='userEmail'>
                Email
              </FieldLabel>
              <Input
                type='email'
                id='userEmail'
                placeholder='Digite seu email'
                {...field}
                aria-invalid={!!fieldState.error} />
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
              <FieldLabel className='leading-5' htmlFor='password'>
                Senha
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id='password'
                  type={isPasswordVisible ? 'text' : 'password'}
                  placeholder='Digite sua senha '
                  {...field}
                  aria-invalid={!!fieldState.error}
                />
                <InputGroupAddon align='inline-end' className='pr-1.5'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => setIsPasswordVisible(prevState => !prevState)}
                    className='text-muted-foreground rounded-l-none hover:bg-transparent'
                  >
                    {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                    <span className='sr-only'>{isPasswordVisible ? 'Hide password' : 'Show password'}</span>
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              {fieldState.error && (
                <p className='text-sm text-destructive'>{fieldState.error.message}</p>
              )}
            </Field>
          )}
        />
        <Controller
          name='confirmPassword'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='w-full gap-2'>
              <FieldLabel className='leading-5' htmlFor='confirmPassword'>
                Confirmar Senha
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
              id='confirmPassword'
              type={isConfirmPasswordVisible ? 'text' : 'password'}
              placeholder='Confirme sua senha '
              {...field}
              aria-invalid={!!fieldState.error}
            />
            <InputGroupAddon align='inline-end' className='pr-1.5'>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setIsConfirmPasswordVisible(prevState => !prevState)}
                className='text-muted-foreground rounded-l-none hover:bg-transparent'
              >
                {isConfirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                <span className='sr-only'>{isConfirmPasswordVisible ? 'Esconder senha' : 'Mostrar senha'}</span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
          {fieldState.error && (
            <p className='text-sm text-destructive'>{fieldState.error.message}</p>
          )}
        </Field>
        )}
        />
       <Field>
          <Button className='w-full' type='submit' disabled={form.formState.isSubmitting || !form.formState.isValid}>
            {form.formState.isSubmitting ? (
              <span className='flex items-center gap-2'>
                <Spinner className='size-4' />
              </span>
            ) : (
              'Registrar'
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default RegisterForm
