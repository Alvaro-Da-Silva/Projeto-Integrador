'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { CalendarIcon, EyeIcon, EyeOffIcon, LockKeyholeIcon, MailIcon, MedalIcon, PhoneIcon, ShieldCheckIcon, UserIcon, UsersIcon } from 'lucide-react'

import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { toast } from "sonner"

import type { RegisterFormData } from "@/lib/schemas/login";
import { registerSchema } from "@/lib/schemas/login";

import { createUser } from '@/controllers/UsersController'

import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PATENTES } from '@/lib/patentes'


import { Spinner } from '@/components/ui/spinner'

const PERFIS = [
  { value: 'cotista', label: 'Cotista' },
  { value: 'admin', label: 'Administrador' },
] as const

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
      perfil: "cotista",
      patent: undefined,
      telefone: "",
      dataNascimento: "",
      password: "",
      confirmPassword: "",
    },
  })

  const isCotista = useWatch({ control: form.control, name: 'perfil' }) === 'cotista'

  const onSubmit = async (values: RegisterFormData) => {
    try {
      await createUser({
        nome: values.name,
        email: values.email,
        senha: values.password,
        patente: values.patent,
        perfil: values.perfil,
        ...(values.perfil === 'cotista' && {
          telefone: values.telefone,
          dataNascimento: values.dataNascimento,
        }),
      })
      toast.success("Conta criada com sucesso!")
      form.reset()
      router.push("/users")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar conta, tente novamente")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className='gap-5'>
        <Controller
          name='name'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='gap-2'>
              <FieldLabel className='leading-5 font-semibold' htmlFor='username'>
                Nome
              </FieldLabel>
              <InputGroup className='h-11 rounded-lg bg-background'>
                <InputGroupAddon align='inline-start' className='pl-3'>
                  <UserIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type='text'
                  id='username'
                  placeholder='Digite o nome'
                  {...field}
                  aria-invalid={!!fieldState.error} />
              </InputGroup>
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
              <FieldLabel className='leading-5 font-semibold' htmlFor='userEmail'>
                Email
              </FieldLabel>
              <InputGroup className='h-11 rounded-lg bg-background'>
                <InputGroupAddon align='inline-start' className='pl-3'>
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type='email'
                  id='userEmail'
                  placeholder='Digite o email'
                  {...field}
                  aria-invalid={!!fieldState.error} />
              </InputGroup>
              {fieldState.error && (
                <p className='text-sm text-destructive'>{fieldState.error.message}</p>
              )}
            </Field>
          )}
        />
        <Controller
          name='patent'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='gap-2'>
              <FieldLabel className='leading-5 font-semibold' htmlFor='userPatent'>
                Patente
              </FieldLabel>
              <Select
                value={field.value ?? null}
                onValueChange={(value: string | null) => value && field.onChange(value)}
              >
                <SelectTrigger
                  id='userPatent'
                  className='h-11! w-full rounded-lg bg-background'
                  aria-invalid={!!fieldState.error}
                  onBlur={field.onBlur}
                >
                  <MedalIcon className='text-muted-foreground' />
                  <SelectValue placeholder='Selecione a patente' />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {PATENTES.map(patente => (
                      <SelectItem key={patente} value={patente}>
                        {patente}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.error && (
                <p className='text-sm text-destructive'>{fieldState.error.message}</p>
              )}
            </Field>
          )}
        />
        <Controller
          name='perfil'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='gap-2'>
              <FieldLabel className='leading-5 font-semibold' htmlFor='userPerfil'>
                Perfil
              </FieldLabel>
              <Select
                value={field.value ?? null}
                onValueChange={(value: string | null) => value && field.onChange(value)}
              >
                <SelectTrigger
                  id='userPerfil'
                  className='h-11! w-full rounded-lg bg-background'
                  aria-invalid={!!fieldState.error}
                  onBlur={field.onBlur}
                >
                  <UsersIcon className='text-muted-foreground' />
                  <SelectValue placeholder='Selecione o perfil'>
                    {(value: string | null) => PERFIS.find(p => p.value === value)?.label ?? 'Selecione o perfil'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {PERFIS.map(perfil => (
                      <SelectItem key={perfil.value} value={perfil.value}>
                        {perfil.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.error && (
                <p className='text-sm text-destructive'>{fieldState.error.message}</p>
              )}
            </Field>
          )}
        />
        {isCotista && (
          <>
            <Controller
              name='telefone'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field className='gap-2'>
                  <FieldLabel className='leading-5 font-semibold' htmlFor='userTelefone'>
                    Telefone
                  </FieldLabel>
                  <InputGroup className='h-11 rounded-lg bg-background'>
                    <InputGroupAddon align='inline-start' className='pl-3'>
                      <PhoneIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      type='tel'
                      id='userTelefone'
                      placeholder='(48) 99999-0000'
                      autoComplete='tel'
                      {...field}
                      aria-invalid={!!fieldState.error} />
                  </InputGroup>
                  {fieldState.error && (
                    <p className='text-sm text-destructive'>{fieldState.error.message}</p>
                  )}
                </Field>
              )}
            />
            <Controller
              name='dataNascimento'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field className='gap-2'>
                  <FieldLabel className='leading-5 font-semibold' htmlFor='userNascimento'>
                    Data de nascimento
                  </FieldLabel>
                  <InputGroup className='h-11 rounded-lg bg-background'>
                    <InputGroupAddon align='inline-start' className='pl-3'>
                      <CalendarIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      type='date'
                      id='userNascimento'
                      max={new Date().toISOString().slice(0, 10)}
                      {...field}
                      aria-invalid={!!fieldState.error} />
                  </InputGroup>
                  {fieldState.error && (
                    <p className='text-sm text-destructive'>{fieldState.error.message}</p>
                  )}
                </Field>
              )}
            />
          </>
        )}
        <Controller
          name='password'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field className='w-full gap-2'>
              <FieldLabel className='leading-5 font-semibold' htmlFor='password'>
                Senha
              </FieldLabel>
              <InputGroup className='h-11 rounded-lg bg-background'>
                <InputGroupAddon align='inline-start' className='pl-3'>
                  <LockKeyholeIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id='password'
                  type={isPasswordVisible ? 'text' : 'password'}
                  placeholder='Digite a senha '
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
              <FieldLabel className='leading-5 font-semibold' htmlFor='confirmPassword'>
                Confirmar Senha
              </FieldLabel>
              <InputGroup className='h-11 rounded-lg bg-background'>
                <InputGroupAddon align='inline-start' className='pl-3'>
                  <ShieldCheckIcon />
                </InputGroupAddon>
                <InputGroupInput
              id='confirmPassword'
              type={isConfirmPasswordVisible ? 'text' : 'password'}
              placeholder='Confirme a senha '
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
              'Registrar'
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default RegisterForm
