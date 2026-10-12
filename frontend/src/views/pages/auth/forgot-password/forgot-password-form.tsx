'use client'

// React imports
import { useState } from 'react'
import { useRouter,useSearchParams } from "next/navigation";

// Icon Imports
import { EyeIcon, EyeOffIcon } from 'lucide-react'

// Zod Imports
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/schemas/login";

// Lib Imports
import { authClient } from "@/lib/auth-client";

// Component Import
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { toast } from "sonner";
import { Spinner } from '@/components/ui/spinner'


const ForgotPasswordForm = () => {
  const router = useRouter();
  
  
  const form = useForm<ForgotPasswordFormData>({  
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: {
      email: ""
    },
  });
  
  const onSubmit = async (values: ForgotPasswordFormData) => {

      const { data, error } = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: `${process.env.NEXT_PUBLIC_BASEPATH}/reset_password`
      },{
        onSuccess: () => {
          toast.success("Email de redefinição enviado com sucesso!")
          form.reset()
          router.push("/login")
        },
        onError: (ctx) => {
          toast.error("Erro ao enviar email, tente novamente")
          form.reset()
        },
      })
    }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className='gap-4'>

        <Controller
        name="email"
        control={form.control}
        render={({field,fieldState}) => (
        <Field>
          <FieldLabel className='leading-5' htmlFor='email'>
            Email
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='email'
              type='email'
              placeholder='Digite seu email cadastrado'
              {...field}
              aria-invalid={!!fieldState.error}
            />
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
              "Enviar Link de Redefinição"
            )}
          </Button>
        </Field>

      </FieldGroup>
    </form>
  )
}

export default ForgotPasswordForm
