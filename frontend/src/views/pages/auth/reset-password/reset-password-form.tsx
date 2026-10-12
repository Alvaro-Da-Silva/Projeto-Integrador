'use client'

// React imports
import { useState } from 'react'
import { useRouter,useSearchParams } from "next/navigation";

// Icon Imports
import { EyeIcon, EyeOffIcon } from 'lucide-react'

// Zod Imports
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/schemas/login";

// Lib Imports
import { authClient } from "@/lib/auth-client";

// Component Imports
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { toast } from "sonner";
import { Spinner } from '@/components/ui/spinner'


const ResetPasswordForm = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');

  const form = useForm<ResetPasswordFormData>({  
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: ""
    },
  });

  if (!token) {
    return (
      <div className='text-center space-y-4'>
        <p className='text-sm text-destructive'>
          Link inválido ou expirado. Solicite um novo e-mail de redefinição.
        </p>
        <Button onClick={() => router.push('/forgot_password')}>
          Solicitar novo link
        </Button>
      </div>
    )
  }

  const onSubmit = async (values: ResetPasswordFormData) => {
    const { data, error } = await authClient.resetPassword({
      token,
      newPassword: values.password,
    },{
      onSuccess: () => {
        toast.success("Senha alterada com sucesso!")
        form.reset()
        router.push("/login")
      },
      onError: (ctx) => {
        toast.error("Erro ao alterar senha, tente novamente")
        form.reset()
      },
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className='gap-4'>

        <Controller
        name="password"
        control={form.control}
        render={({field,fieldState}) => (
        <Field>
          <FieldLabel className='leading-5' htmlFor='password'>
            Nova Senha
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='password'
              type={isPasswordVisible ? 'text' : 'password'}
              placeholder='Digite sua nova senha'
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
                <span className='sr-only'>{isPasswordVisible ? 'Esconder senha' : 'Mostrar senha'}</span>
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
        name="confirmPassword"
        control={form.control}
        render={({field,fieldState}) => (
        <Field>
          <FieldLabel className='leading-5' htmlFor='confirmPassword'>
            Confirmar Senha
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='confirmPassword'
              type={isConfirmPasswordVisible ? 'text' : 'password'}
              placeholder='Digite sua nova senha novamente'
              {...field}
              aria-invalid={!!fieldState.error}
            />
            <InputGroupAddon align='inline-end' className='pr-1.5'>
              <Button
                type='button'
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
              "Definir Nova Senha"
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default ResetPasswordForm
