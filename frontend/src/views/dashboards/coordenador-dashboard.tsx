'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { addMonths, format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarCheckIcon, CalendarRangeIcon, InfoIcon, InboxIcon, UserMinusIcon, UserPlusIcon } from 'lucide-react'

import type { ApiError } from '@/controllers/CotasController'
import type { AtribuicaoManualRegistro, DashboardCoordenador, DesistenciaRegistro } from '@/types/apps/dashboard-types'
import type { EscalaStatus } from '@/types/apps/cotas-types'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { comoApiError, DashboardErro, formatarNumero, IconeCard, mesAtual } from './dashboard-shared'
import { formatDateKey } from '@/views/apps/calendar/cotas-utils'

import { getDashboardCoordenador } from '@/controllers/DashboardController'

const MESES_ANTERIORES = 12
const MESES_POSTERIORES = 6

const STATUS_ESCALA: Record<EscalaStatus, string> = {
  aberta: 'aberta (distribuição ainda não confirmada)',
  fechada: 'fechada (distribuição confirmada)',
  encerrada: 'encerrada'
}

type Resultado = { chave: string; dados: DashboardCoordenador | null; erro: ApiError | null }

const parseMes = (mes: string) => parse(mes, 'yyyy-MM', new Date())

const nomeDoMes = (mes: string) => {
  const nome = format(parseMes(mes), "MMMM 'de' yyyy", { locale: ptBR })

  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function opcoesDeMes(atual: string) {
  const base = parseMes(atual)

  return Array.from({ length: MESES_ANTERIORES + MESES_POSTERIORES + 1 }, (_, i) => {
    const value = format(addMonths(base, MESES_POSTERIORES - i), 'yyyy-MM')

    return { value, label: nomeDoMes(value) }
  })
}

type IndicadorProps = {
  icone: ReactNode
  titulo: string
  valor: number
  descricao: string
}

function Indicador({ icone, titulo, valor, descricao }: IndicadorProps) {
  return (
    <Card className='border-t-primary border-t-[3px]'>
      <CardHeader className='flex items-center gap-3'>
        <IconeCard>{icone}</IconeCard>
        <CardTitle className='text-base font-semibold'>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-1'>
        <span className='text-4xl font-bold tabular-nums'>{formatarNumero(valor)}</span>
        <CardDescription>{descricao}</CardDescription>
      </CardContent>
    </Card>
  )
}

function ListaDesistencias({ mes, itens }: { mes: string; itens: DesistenciaRegistro[] }) {
  return (
    <Card>
      <CardHeader className='flex items-center gap-3'>
        <IconeCard>
          <UserMinusIcon className='size-4' />
        </IconeCard>
        <div className='flex flex-col gap-0.5'>
          <CardTitle className='text-base font-semibold'>Desistências de {nomeDoMes(mes)}</CardTitle>
          <CardDescription>Motivo registrado pelo coordenador ao liberar a vaga.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className='text-muted-foreground text-sm'>Nenhuma desistência registrada neste mês.</p>
        ) : (
          <ul className='flex flex-col divide-y rounded-md border text-sm'>
            {itens.map(item => (
              <li key={item.id} className='flex flex-col gap-1 px-3 py-2.5'>
                <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                  <span className='font-medium'>{item.cotistaNome ?? 'Cotista removido'}</span>
                  {item.codigo && item.data && (
                    <Badge variant='outline'>
                      {item.codigo} · {formatDateKey(item.data)}
                    </Badge>
                  )}
                  <span className='text-muted-foreground'>
                    {item.acao === 'substituicao'
                      ? `substituído por ${item.substitutoNome ?? '?'}`
                      : 'vaga liberada'}
                  </span>
                </div>
                <span>
                  <span className='text-muted-foreground'>Motivo: </span>
                  {item.justificativa ? `“${item.justificativa}”` : 'não informado'}
                </span>
                <span className='text-muted-foreground text-xs'>
                  {format(new Date(item.realizadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {item.registradoPor && ` · registrado por ${item.registradoPor}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ListaAtribuicoes({ mes, itens }: { mes: string; itens: AtribuicaoManualRegistro[] }) {
  return (
    <Card>
      <CardHeader className='flex items-center gap-3'>
        <IconeCard>
          <UserPlusIcon className='size-4' />
        </IconeCard>
        <div className='flex flex-col gap-0.5'>
          <CardTitle className='flex flex-wrap items-center gap-2 text-base font-semibold'>
            Atribuições manuais de {nomeDoMes(mes)}
          </CardTitle>
          <CardDescription>Justificativa registrada pelo coordenador ao atribuir ou substituir um cotista.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className='text-muted-foreground text-sm'>Nenhuma atribuição manual registrada neste mês.</p>
        ) : (
          <ul className='flex flex-col divide-y rounded-md border text-sm'>
            {itens.map(item => (
              <li key={item.id} className='flex flex-col gap-1 px-3 py-2.5'>
                <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                  <span className='font-medium'>{item.cotistaNome ?? 'Cotista removido'}</span>
                  {item.codigo && item.data && (
                    <Badge variant='outline'>
                      {item.codigo} · {formatDateKey(item.data)}
                    </Badge>
                  )}
                  <span className='text-muted-foreground'>
                    {item.acao === 'substituicao'
                      ? `no lugar de ${item.anteriorNome ?? '?'}`
                      : 'atribuído manualmente'}
                  </span>
                </div>
                <span>
                  <span className='text-muted-foreground'>Justificativa: </span>
                  {item.justificativa ? `“${item.justificativa}”` : 'não informada'}
                </span>
                <span className='text-muted-foreground text-xs'>
                  {format(new Date(item.realizadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {item.registradoPor && ` · registrado por ${item.registradoPor}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function CarregandoCards() {
  return (
    <div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-4' aria-busy='true' aria-label='Carregando'>
      {[0, 1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader className='flex items-center gap-3'>
            <Skeleton className='size-8' />
            <Skeleton className='h-5 w-32' />
          </CardHeader>
          <CardContent className='flex flex-col gap-2'>
            <Skeleton className='h-10 w-20' />
            <Skeleton className='h-4 w-full' />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function CoordenadorDashboard() {
  const [atual] = useState(mesAtual)
  const [mes, setMes] = useState(atual)
  const [versao, setVersao] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const meses = useMemo(() => opcoesDeMes(atual), [atual])
  const chave = `${mes}-${versao}`

  useEffect(() => {
    let ativo = true

    getDashboardCoordenador(mes)
      .then(dados => ativo && setResultado({ chave, dados, erro: null }))
      .catch(error => ativo && setResultado({ chave, dados: null, erro: comoApiError(error, 'Erro ao carregar o dashboard.') }))

    return () => {
      ativo = false
    }
  }, [mes, chave])

  const carregando = !resultado || resultado.chave !== chave
  const dados = carregando ? null : resultado.dados

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-col gap-0.5'>
          <h1 className='cbmsc-titulo text-xl'>Indicadores do mês</h1>
          <span className='text-muted-foreground text-sm'>Cotas, solicitações, distribuição e desistências.</span>
        </div>
        <Select items={meses} value={mes} onValueChange={(value: string | null) => value && setMes(value)}>
          <SelectTrigger className='w-full sm:w-56' aria-label='Mês'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {meses.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {carregando && <CarregandoCards />}

      {!carregando && resultado.erro && <DashboardErro erro={resultado.erro} onRetry={() => setVersao(v => v + 1)} />}

      {dados && (
        <>
          {!dados.escala && (
            <Alert>
              <InfoIcon />
              <AlertTitle>Nenhuma escala cadastrada para {nomeDoMes(dados.mes)}</AlertTitle>
              <AlertDescription>
                O total de cotas é uma estimativa pelos dias do mês; não há solicitações nem distribuição.
              </AlertDescription>
            </Alert>
          )}

          <div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-4'>
            <Indicador
              icone={<CalendarRangeIcon className='size-4' />}
              titulo='Cotas do mês'
              valor={dados.totalCotas}
              descricao={
                dados.totalCotasEstimado
                  ? 'Estimativa: dias do mês × cotas por dia.'
                  : 'Dias com plantão × cotas por dia da escala.'
              }
            />
            <Indicador
              icone={<InboxIcon className='size-4' />}
              titulo='Escalas solicitadas'
              valor={dados.solicitadas}
              descricao='Turnos solicitados pelos BCs no mês.'
            />
            <Indicador
              icone={<CalendarCheckIcon className='size-4' />}
              titulo='Escalas distribuídas'
              valor={dados.distribuidas}
              descricao={
                dados.escala ? `Cotas definitivas. Escala ${STATUS_ESCALA[dados.escala.status]}.` : 'Cotas definitivas.'
              }
            />
            <Indicador
              icone={<UserMinusIcon className='size-4' />}
              titulo='Desistências'
              valor={dados.desistencias}
              descricao={
                dados.desistenciasDisponivel
                  ? 'Cotas definitivas liberadas por desistência do BC.'
                  : 'Registro de desistência pendente (migração 007 não aplicada).'
              }
            />
          </div>

          {dados.desistenciasDisponivel && <ListaDesistencias mes={dados.mes} itens={dados.desistenciasLista ?? []} />}

          <ListaAtribuicoes mes={dados.mes} itens={dados.atribuicoesManuaisLista ?? []} />
        </>
      )}
    </div>
  )
}
