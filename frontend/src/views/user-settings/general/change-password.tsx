'use client'

import { useMemo, useState } from 'react'

import { CheckIcon, EyeIcon, EyeOffIcon, XIcon } from 'lucide-react'

import { useForm, useWatch, Controller } from 'react-hook-form'

import { zodResolver } from '@hookform/resolvers/zod'

import { toast } from 'sonner'

import type { UpdatePasswordFormSchema } from '@/lib/schemas/user-configs';
import { updatePasswordSchema } from '@/lib/schemas/user-configs'


import { authClient } from '@/lib/auth-client'

import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'


import { Spinner } from '@/components/ui/spinner'

import { cn } from '@/lib/utils'
import { Field } from '@/components/ui/field'


const requirements = [
  { regex: /.{12,}/, text: 'At least 12 characters' },
  { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
  { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
  { regex: /[0-9]/, text: 'At least 1 number' },
  {
    regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/,
    text: 'At least 1 special character'
  }
]

const ChangePassword = () => {
  const [isVisible, setIsVisible] = useState(false)

  const form = useForm<UpdatePasswordFormSchema>({
    resolver: zodResolver(updatePasswordSchema),
    mode: "onChange",
    defaultValues: {
      oldPassword: "",
      newPassword: "",
    },
  });

  const onSubmit = async (values: UpdatePasswordFormSchema) => {
    await authClient.changePassword({
      currentPassword: values.oldPassword,
      newPassword: values.newPassword
    }, {
      onSuccess: () => {
        toast.success("Senha alterada com sucesso!")
        form.reset()
      },
      onError: (ctx) => {
        if(ctx.error.message == "Invalid password"){
          toast.error("Senha atual inválida!")
          form.reset()
        }else{
          toast.error("Erro ao alterar senha")
          console.log("Deu erro na troca de senha:", ctx.error)
        }
      }
    })
  }

  const password = useWatch({ control: form.control, name: 'newPassword' }) ?? ''

  const strength = requirements.map(req => ({
    met: req.regex.test(password),
    text: req.text
  }))

  const strengthScore = useMemo(() => {
    return strength.filter(req => req.met).length
  }, [strength])

  const getColor = (score: number) => {
    if (score === 0) return 'bg-border'
    if (score <= 1) return 'bg-destructive'
    if (score <= 2) return 'bg-orange-500 '
    if (score <= 3) return 'bg-amber-500'
    if (score === 4) return 'bg-yellow-400'

    return 'bg-green-500'
  }

  const getText = (score: number) => {
    if (score === 0) return 'Digite uma senha'
    if (score <= 2) return 'Senha fraca'
    if (score <= 3) return 'Senha média'
    if (score === 4) return 'Senha forte'

    return 'Senha muito forte'
  }

  return (
    <div className='grid grid-cols-1 gap-10 w-full'>
      <h1 className='text-lg font-semibold'>Troca de senha do usuário</h1>

      <div className='w-full'>
        <form onSubmit={form.handleSubmit(onSubmit)} className='w-full space-y-6'>
          <div className='w-full space-y-2'>
            <Controller
              name='oldPassword'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field className='w-full gap-2'>
                  <Label htmlFor='old-password' className='gap-1'>
                    Senha Atual<span className='text-destructive'>*</span>
                  </Label>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id='current-password'
                      type={isVisible ? 'text' : 'password'}
                      placeholder='digite sua senha atual'
                      aria-invalid={!!fieldState.error}
                      required
                    />
                    <InputGroupAddon align='inline-end' className='pr-1.5'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => setIsVisible(prevState => !prevState)}
                        className='text-muted-foreground focus-visible:ring-ring/50 rounded-l-none hover:bg-transparent'
                      >
                        {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                        <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
                      </Button>
                    </InputGroupAddon>
                  </InputGroup>
                  {fieldState.error && (
                    <p className='text-sm text-destructive'>{fieldState.error.message}</p>
                  )}
                </Field>
              )}
            />
          </div>
          <div className='w-full space-y-2'>
            <Controller
              name='newPassword'
              control={form.control}
              render={({ field, fieldState }) => {
                return (
                  <Field className='gap-2'>
                    <Label htmlFor='new-password' className='gap-1'>
                      Nova Senha<span className='text-destructive'>*</span>
                    </Label>
                    <InputGroup className='mb-3'>
                      <InputGroupInput
                        {...field}
                        id='new-password'
                        type={isVisible ? 'text' : 'password'}
                        placeholder='digite sua nova senha'
                        aria-invalid={!!fieldState.error}
                        required
                      />
                      <InputGroupAddon align='inline-end' className='pr-1.5'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => setIsVisible(prevState => !prevState)}
                          className='text-muted-foreground focus-visible:ring-ring/50 rounded-l-none hover:bg-transparent'
                        >
                          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                          <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.error && (
                      <p className='text-sm text-destructive'>{fieldState.error.message}</p>
                    )}
                  </Field>
                )
              }}
            />


            <div className='mb-4 flex h-1 w-full gap-1'>
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-full flex-1 rounded-full transition-all duration-500 ease-out',
                    index < strengthScore ? getColor(strengthScore) : 'bg-border'
                  )}
                />
              ))}
            </div>

            <p className='text-foreground text-sm font-medium'>{getText(strengthScore)}. Deve conter:</p>

            <ul className='mb-4 space-y-1.5'>
              {strength.map((req, index) => (
                <li key={index} className='flex items-center gap-2'>
                  {req.met ? (
                    <CheckIcon className='size-4 text-green-600 dark:text-green-400' />
                  ) : (
                    <XIcon className='text-muted-foreground size-4' />
                  )}
                  <span
                    className={cn('text-xs', req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}
                  >
                    {req.text}
                    <span className='sr-only'>{req.met ? ' - Requirement met' : ' - Requirement not met'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className='mt-6 flex justify-end'>
            <Button type='submit' className='max-sm:w-full' disabled={form.formState.isSubmitting || !form.formState.isValid}>
              {form.formState.isSubmitting ? (
                <span className='flex items-center gap-2'>
                  <Spinner className='size-4' />
                </span>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePassword
