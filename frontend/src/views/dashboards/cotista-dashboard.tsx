'use client'

import { useEffect, useState } from 'react'

import { ClockIcon, TargetIcon } from 'lucide-react'

import type { ApiError } from '@/controllers/CotasController'
import type { DashboardCotista } from '@/types/apps/dashboard-types'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateKey } from '@/views/apps/calendar/cotas-utils'
import { comoApiError, DashboardErro, formatarHoras, IconeCard } from './dashboard-shared'

import { getDashboardCotista } from '@/controllers/DashboardController'

type Resultado = { versao: number; dados: DashboardCotista | null; erro: ApiError | null }

function CarregandoCards() {
  return (
    <div className='grid gap-6 md:grid-cols-2' aria-busy='true' aria-label='Carregando'>
      {[0, 1].map(i => (
        <Card key={i}>
          <CardHeader className='gap-3'>
            <Skeleton className='h-5 w-48' />
            <Skeleton className='h-4 w-32' />
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            <Skeleton className='h-10 w-24' />
            <Skeleton className='h-2 w-full' />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function CotistaDashboard() {
  const [versao, setVersao] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    let ativo = true

    getDashboardCotista()
      .then(dados => ativo && setResultado({ versao, dados, erro: null }))
      .catch(error => ativo && setResultado({ versao, dados: null, erro: comoApiError(error, 'Erro ao carregar o dashboard.') }))

    return () => {
      ativo = false
    }
  }, [versao])

  if (!resultado || resultado.versao !== versao) return <CarregandoCards />

  if (resultado.erro || !resultado.dados) {
    const erro = resultado.erro ?? comoApiError(null, 'Erro ao carregar o dashboard.')

    return <DashboardErro erro={erro} onRetry={() => setVersao(v => v + 1)} />
  }

  const { horasConquistadas, metaHoras, horasFaltantes, semestre } = resultado.dados
  const percentual = metaHoras > 0 ? Math.min(100, Math.round((horasConquistadas / metaHoras) * 100)) : 0
  const periodo = `${semestre.numero}º semestre de ${semestre.ano} · ${formatDateKey(semestre.inicio)} a ${formatDateKey(semestre.fim)}`

  return (
    <div className='grid gap-6 md:grid-cols-2'>
      <Card>
        <CardHeader className='flex items-center gap-3'>
          <IconeCard>
            <ClockIcon className='size-4' />
          </IconeCard>
          <div className='flex flex-col gap-0.5'>
            <CardTitle className='text-base font-semibold'>Horas definitivas</CardTitle>
            <CardDescription>{periodo}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-1'>
          <span className='text-4xl font-semibold tabular-nums'>{formatarHoras(horasConquistadas)}</span>
          <span className='text-muted-foreground text-sm'>
            {horasConquistadas > 0
              ? 'Soma das cotas definitivas publicadas neste semestre.'
              : 'Você ainda não tem cotas definitivas neste semestre.'}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex items-center gap-3'>
          <IconeCard>
            <TargetIcon className='size-4' />
          </IconeCard>
          <div className='flex flex-col gap-0.5'>
            <CardTitle className='text-base font-semibold'>Faltam para a meta</CardTitle>
            <CardDescription>Meta de {formatarHoras(metaHoras)} no semestre</CardDescription>
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <span className='text-4xl font-semibold tabular-nums'>{formatarHoras(horasFaltantes)}</span>
          <Progress value={percentual} aria-label='Progresso da meta de horas' />
          <span className='text-muted-foreground text-sm'>
            {horasFaltantes === 0
              ? 'Meta do semestre atingida.'
              : `${formatarHoras(horasConquistadas)} de ${formatarHoras(metaHoras)} (${percentual}%)`}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
