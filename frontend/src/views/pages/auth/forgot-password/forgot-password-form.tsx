'use client'

import { useState } from 'react'
import { useRouter,useSearchParams } from "next/navigation";

import { EyeIcon, EyeOffIcon, MailIcon, SendIcon } from 'lucide-react'

import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/schemas/login";

import { authClient } from "@/lib/auth-client";

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
      <FieldGroup className='gap-5'>

        <Controller
        name="email"
        control={form.control}
        render={({field,fieldState}) => (
        <Field>
          <FieldLabel className='leading-5 font-semibold' htmlFor='email'>
            Email
          </FieldLabel>
          <InputGroup className='h-11 rounded-lg bg-background'>
            <InputGroupAddon align='inline-start' className='pl-3'>
              <MailIcon />
            </InputGroupAddon>
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
          <Button
            className='h-11 w-full rounded-lg text-base font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90'
            type='submit'
            disabled={form.formState.isSubmitting || !form.formState.isValid}
          >
            {form.formState.isSubmitting ? (
              <span className='flex items-center gap-2'>
                <Spinner className='size-4' />
              </span>
            ) : (
              <>
                <SendIcon />
                Enviar Link de Redefinição
              </>
            )}
          </Button>
        </Field>

      </FieldGroup>
    </form>
  )
}

export default ForgotPasswordForm
