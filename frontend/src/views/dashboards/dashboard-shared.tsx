'use client'

import type { ReactNode } from 'react'

import { useRouter } from 'next/navigation'

import { AlertCircleIcon, LogInIcon, RotateCwIcon, ShieldAlertIcon, WifiOffIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import { ApiError } from '@/controllers/CotasController'

const FUSO_HORARIO = 'America/Sao_Paulo'

export function mesAtual(): string {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: FUSO_HORARIO, year: 'numeric', month: '2-digit' })
    .formatToParts(new Date())

  const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? ''

  return `${valor('year')}-${valor('month')}`
}

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export const formatarNumero = (valor: number) => numero.format(valor)

export const formatarHoras = (valor: number) => `${numero.format(valor)} h`

export const IconeCard = ({ children }: { children: ReactNode }) => (
  <div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-sm'>{children}</div>
)

type DashboardErroProps = {
  erro: ApiError
  onRetry: () => void
}

export function DashboardErro({ erro, onRetry }: DashboardErroProps) {
  const router = useRouter()

  if (erro.status === 401) {
    return (
      <Alert variant='destructive'>
        <AlertCircleIcon />
        <AlertTitle>Sessão expirada</AlertTitle>
        <AlertDescription className='flex flex-wrap items-center gap-x-3 gap-y-2'>
          <span>{erro.message}</span>
          <Button type='button' variant='outline' size='sm' onClick={() => router.push('/login')}>
            <LogInIcon className='size-3.5' aria-hidden='true' />
            Entrar novamente
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (erro.status === 403) {
    return (
      <Alert variant='destructive'>
        <ShieldAlertIcon />
        <AlertTitle>Acesso não permitido</AlertTitle>
        <AlertDescription>{erro.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant='destructive'>
      {erro.status === 0 ? <WifiOffIcon /> : <AlertCircleIcon />}
      <AlertTitle>{erro.status === 0 ? 'Sem conexão com o servidor' : 'Não foi possível carregar o dashboard'}</AlertTitle>
      <AlertDescription className='flex flex-wrap items-center gap-x-3 gap-y-2'>
        <span>{erro.message}</span>
        <Button type='button' variant='outline' size='sm' onClick={onRetry}>
          <RotateCwIcon className='size-3.5' aria-hidden='true' />
          Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export const comoApiError = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error : new ApiError(500, fallback)
