'use client'

import { useState } from 'react'

import { UpdateEmailFormSchema, updateEmailSchema } from '@/lib/schemas/user-configs'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sendEmail } from '@/lib/email'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'


const ChangeEmail = () => {

  const form = useForm<UpdateEmailFormSchema>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      newEmail: ""
    }
  })

  const onSubmit = async (values: UpdateEmailFormSchema) => {
    const { data, error } = await authClient.changeEmail({
      newEmail: values.newEmail,
    }, {
      onSuccess: () => {
        toast.success("Email Enviado para confirmação!")
        form.reset()
      },
      onError: (ctx) => {
        if (ctx.error.message === "Invalid email") {
          toast.error("Email inválido")
        } else {
          toast.error("Erro ao alterar o email")
          console.error(ctx.error)
        }
      }
    })
  }


  return (
    <div className='grid grid-cols-1 gap-10 w-full'>
      <h1 className='text-lg font-semibold'>Troca de email do usuário</h1>

      <div className='w-full'>
        <form className='w-full space-y-6' onSubmit={form.handleSubmit(onSubmit)}>
          <div className='w-full space-y-2'>
            <Controller
              name='newEmail'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field className='gap-2'>
                  <FieldLabel htmlFor='email' className='leading-5'>
                    Novo email
                  </FieldLabel>
                  <Input
                    {...field}
                    type='email'
                    id='email'
                    placeholder='Digite seu novo email'
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <p className='text-sm text-destructive'>{fieldState.error.message}</p>
                  )}
                </Field>
              )}
            />
            <p className='text-foreground text-sm font-medium'>Aviso:</p>
            <p>O email será redefinido definitivamente após a confirmação do novo email.</p>
          </div>

          <div className='mt-6 flex justify-end'>
            <Button type='submit' className='max-sm:w-full' disabled={form.formState.isSubmitting || !form.formState.isValid}>
              {form.formState.isSubmitting ? (
                <span className='flex items-center gap-2'>
                  <Spinner className='size-4' />
                </span>
              ) : (
                'Alterar Email'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangeEmail
