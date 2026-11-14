'use client'

import { useEffect, useMemo, useState } from 'react'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import type { CalendarioMensal, Cota, Cotista, EscalaStatus } from '@/types/apps/cotas-types'

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EventCalendar } from './index'
import { StatusAlert, cotaToEvent, toDateKey } from './cotas-utils'
import { DiaAdminDialog, LiberarDiasDialog, NovaEscalaDialog } from './admin-escala-dialogs'

import {
  ApiError,
  PendenciaBackendError,
  alterarStatusEscala,
  getCalendario,
  getCotasAdmin,
  getCotistas
} from '@/controllers/CotasController'

const TODOS = 'all'

const STATUS_ITEMS: { label: string; value: EscalaStatus }[] = [
  { label: 'Aberta', value: 'aberta' },
  { label: 'Fechada', value: 'fechada' },
  { label: 'Encerrada', value: 'encerrada' }
]

type MesCarregado = {
  chave: string
  mesChave: string
  calendario: CalendarioMensal | null
  cotas: Cota[]
  erroCalendario: ApiError | null
  erroCotas: ApiError | null
}

const toApiError = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error : new ApiError(500, fallback)

async function carregarMes(
  ano: number,
  mes: number,
  cotistaId?: string
): Promise<Omit<MesCarregado, 'chave' | 'mesChave'>> {
  let calendario: CalendarioMensal | null = null

  try {
    calendario = await getCalendario(ano, mes)
  } catch (error) {
    return { calendario: null, cotas: [], erroCalendario: toApiError(error, 'Erro ao carregar o calendário.'), erroCotas: null }
  }

  if (!calendario) return { calendario, cotas: [], erroCalendario: null, erroCotas: null }

  try {
    const cotas = await getCotasAdmin(calendario.escala.id, cotistaId)

    return { calendario, cotas, erroCalendario: null, erroCotas: null }
  } catch (error) {
    return { calendario, cotas: [], erroCalendario: null, erroCotas: toApiError(error, 'Erro ao carregar as cotas.') }
  }
}

export function AdminCotasCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [versao, setVersao] = useState(0)
  const [cotistaId, setCotistaId] = useState<string>(TODOS)
  const [resultado, setResultado] = useState<MesCarregado | null>(null)
  const [cotistas, setCotistas] = useState<Cotista[]>([])
  const [erroCotistas, setErroCotistas] = useState<ApiError | null>(null)
  const [dialogo, setDialogo] = useState<'nova' | 'liberar' | 'dia' | null>(null)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [aberturas, setAberturas] = useState(0)
  const [alterandoStatus, setAlterandoStatus] = useState(false)

  const ano = currentDate.getFullYear()
  const mes = currentDate.getMonth() + 1
  const mesChave = `${ano}-${mes}-${cotistaId}`
  const chave = `${mesChave}-${versao}`

  useEffect(() => {
    let ativo = true

    getCotistas()
      .then(lista => {
        if (ativo) setCotistas(lista)
      })
      .catch(error => {
        if (ativo) setErroCotistas(toApiError(error, 'Erro ao carregar os cotistas.'))
      })

    return () => {
      ativo = false
    }
  }, [versao])

  useEffect(() => {
    let ativo = true

    carregarMes(ano, mes, cotistaId === TODOS ? undefined : cotistaId).then(dados => {
      if (ativo) setResultado({ ...dados, chave, mesChave })
    })

    return () => {
      ativo = false
    }
  }, [ano, mes, cotistaId, chave, mesChave])

  const recarregar = () => setVersao(v => v + 1)

  const abrir = (tipo: 'nova' | 'liberar' | 'dia') => {
    setAberturas(n => n + 1)
    setDialogo(tipo)
  }

  const dados = resultado?.mesChave === mesChave ? resultado : null
  const isLoading = resultado?.chave !== chave
  const calendario = dados?.calendario ?? null

  const diasLiberados = useMemo(
    () => new Set((calendario?.dias ?? []).filter(d => d.liberadoParaPreenchimento).map(d => d.data)),
    [calendario]
  )

  const nomePorCotista = useMemo(() => new Map(cotistas.map(c => [c.id, c.nome])), [cotistas])

  const nomeCotista = (cota: Cota) =>
    cota.cotistaNome ?? (cota.cotistaId ? nomePorCotista.get(cota.cotistaId) : undefined) ?? 'Cotista'

  const events = useMemo(
    () =>
      (dados?.cotas ?? []).map(cota => {
        const nome = cota.cotistaNome ?? (cota.cotistaId ? nomePorCotista.get(cota.cotistaId) : undefined)

        return cotaToEvent(cota, nome ? `${cota.codigoPeriodo} · ${nome}` : `Turno ${cota.codigoPeriodo}`)
      }),
    [dados, nomePorCotista]
  )

  const cotistaItems = useMemo(
    () => [{ label: 'Todos os cotistas', value: TODOS }, ...cotistas.map(c => ({ label: c.nome, value: c.id }))],
    [cotistas]
  )

  const nomeMes = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })

  const handleDayClick = (date: Date) => {
    if (!dados) return

    if (!calendario) {
      abrir('nova')

      return
    }

    if (date.getFullYear() !== ano || date.getMonth() + 1 !== mes) return

    setDiaSelecionado(toDateKey(date))
    abrir('dia')
  }

  const handleCreateClick = () => {
    if (!dados || dados.erroCalendario) return

    if (!calendario) {
      abrir('nova')
    } else if (calendario.escala.status !== 'aberta') {
      toast.warning(`A escala está ${calendario.escala.status}. Reabra-a para liberar dias.`)
    } else {
      abrir('liberar')
    }
  }

  const handleStatusChange = async (status: EscalaStatus) => {
    if (!calendario || status === calendario.escala.status) return

    if (status === 'aberta' && calendario.escala.publicadaEm) {
      toast.warning('A escala já foi publicada e não pode ser reaberta. Retire a publicação na Distribuição definitiva.')

      return
    }

    setAlterandoStatus(true)

    try {
      await alterarStatusEscala(calendario.escala.id, status)
      toast.success(`Escala ${status}.`)
      recarregar()
    } catch (error) {
      toast.error(toApiError(error, 'Erro ao alterar o status da escala.').message)
    } finally {
      setAlterandoStatus(false)
    }
  }

  const renderStatus = () => {
    const alerts = []

    if (erroCotistas) {
      alerts.push(
        <StatusAlert
          key='cotistas'
          variant='destructive'
          title='Não foi possível carregar os cotistas'
          description={erroCotistas.message}
        />
      )
    }

    if (!dados) return alerts

    if (dados.erroCalendario) {
      alerts.push(
        <StatusAlert
          key='calendario'
          variant='destructive'
          title='Não foi possível carregar a escala'
          description={dados.erroCalendario.message}
          onRetry={recarregar}
        />
      )
    } else if (!calendario) {
      alerts.push(
        <StatusAlert
          key='vazio'
          title='Nenhuma escala cadastrada'
          description={`Não há escala para ${nomeMes}. Clique em "Nova escala" para criá-la.`}
        />
      )
    } else if (dados.erroCotas instanceof PendenciaBackendError) {
      alerts.push(
        <StatusAlert
          key='pendencia'
          title='Visualização indisponível'
          description={`${dados.erroCotas.message} Os dias liberados da escala estão destacados no calendário.`}
        />
      )
    } else if (dados.erroCotas) {
      alerts.push(
        <StatusAlert
          key='cotas'
          variant='destructive'
          title='Não foi possível carregar as cotas'
          description={dados.erroCotas.message}
          onRetry={recarregar}
        />
      )
    } else if (diasLiberados.size === 0 && calendario.escala.status === 'aberta') {
      alerts.push(
        <StatusAlert
          key='sem-dias'
          title='Nenhum dia liberado'
          description='Clique em "Liberar dias" ou em um dia do calendário para liberar plantões aos cotistas.'
        />
      )
    } else if (dados.cotas.length === 0) {
      alerts.push(<StatusAlert key='sem-cotas' title='Nenhuma cota escolhida' description={`Nenhum cotista escolheu turnos em ${nomeMes}.`} />)
    }

    return alerts
  }

  return (
    <>
      <EventCalendar
        events={events}
        currentDate={currentDate}
        onCurrentDateChange={setCurrentDate}
        onDayClick={handleDayClick}
        onCreateClick={handleCreateClick}
        createLabel={calendario ? 'Liberar dias' : 'Nova escala'}
        isDayEnabled={calendario ? date => diasLiberados.has(toDateKey(date)) : undefined}
        toolbar={
          <>
            {(isLoading || alterandoStatus) && <Spinner className='text-muted-foreground' aria-label='Carregando' />}
            {calendario && (
              <Select
                items={STATUS_ITEMS}
                value={calendario.escala.status}
                disabled={alterandoStatus}
                onValueChange={(value: EscalaStatus | null) => {
                  if (value) handleStatusChange(value)
                }}
              >
                <SelectTrigger className='w-32 max-sm:h-8 max-sm:w-28' aria-label='Status da escala'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_ITEMS.map(item => (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                        disabled={
                          item.value === 'aberta' &&
                          calendario.escala.status !== 'aberta' &&
                          !!calendario.escala.publicadaEm
                        }
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            <Select
              items={cotistaItems}
              value={cotistaId}
              onValueChange={(value: string | null) => {
                if (value) setCotistaId(value)
              }}
            >
              <SelectTrigger className='w-44 max-sm:h-8 max-sm:w-32' aria-label='Filtrar por cotista'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {cotistaItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </>
        }
      >
        {renderStatus()}
      </EventCalendar>

      <NovaEscalaDialog
        key={`nova-${aberturas}`}
        open={dialogo === 'nova'}
        onOpenChange={open => setDialogo(open ? 'nova' : null)}
        ano={ano}
        mes={mes}
        onCreated={recarregar}
      />

      {calendario && (
        <>
          <LiberarDiasDialog
            key={`liberar-${aberturas}`}
            open={dialogo === 'liberar'}
            onOpenChange={open => setDialogo(open ? 'liberar' : null)}
            calendario={calendario}
            onDone={recarregar}
          />
          <DiaAdminDialog
            key={`dia-${aberturas}`}
            open={dialogo === 'dia'}
            onOpenChange={open => setDialogo(open ? 'dia' : null)}
            calendario={calendario}
            data={diaSelecionado}
            cotas={dados?.cotas ?? []}
            nomeCotista={nomeCotista}
            onChanged={recarregar}
          />
        </>
      )}
    </>
  )
}
