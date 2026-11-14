'use client'

import { useEffect, useMemo, useState } from 'react'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import type { CalendarioMensal, Cota, DiaEscala } from '@/types/apps/cotas-types'

import SelectDate, { type Turno } from '@/components/modals/SelectDate'
import { Spinner } from '@/components/ui/spinner'
import { EventCalendar } from './index'
import { StatusAlert, cotaToEvent, formatDateKey, parseDateKey, toDateKey } from './cotas-utils'

import {
  ApiError,
  getCalendario,
  getMinhasCotas,
  removerCota,
  salvarCota
} from '@/controllers/CotasController'

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

async function carregarMes(ano: number, mes: number): Promise<Omit<MesCarregado, 'chave' | 'mesChave'>> {
  let calendario: CalendarioMensal | null = null

  try {
    calendario = await getCalendario(ano, mes)
  } catch (error) {
    return { calendario: null, cotas: [], erroCalendario: toApiError(error, 'Erro ao carregar o calendário.'), erroCotas: null }
  }

  if (!calendario) return { calendario, cotas: [], erroCalendario: null, erroCotas: null }

  try {
    const cotas = await getMinhasCotas(calendario.escala.id)

    return { calendario, cotas, erroCalendario: null, erroCotas: null }
  } catch (error) {
    return { calendario, cotas: [], erroCalendario: null, erroCotas: toApiError(error, 'Erro ao carregar suas cotas.') }
  }
}

function mensagemErroCotas(error: ApiError) {
  if (error.status === 401) return 'Sua sessão não foi aceita pelo servidor de escalas. Faça login novamente.'
  if (error.status === 403) return 'Seu usuário não está vinculado a um cotista ativo.'

  return error.message
}

export function CotistaCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [versao, setVersao] = useState(0)
  const [resultado, setResultado] = useState<MesCarregado | null>(null)
  const [diaSelecionado, setDiaSelecionado] = useState<DiaEscala | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const ano = currentDate.getFullYear()
  const mes = currentDate.getMonth() + 1
  const mesChave = `${ano}-${mes}`
  const chave = `${mesChave}-${versao}`

  useEffect(() => {
    let ativo = true

    carregarMes(ano, mes).then(dados => {
      if (ativo) setResultado({ ...dados, chave, mesChave })
    })

    return () => {
      ativo = false
    }
  }, [ano, mes, chave, mesChave])

  const recarregar = () => setVersao(v => v + 1)

  const dados = resultado?.mesChave === mesChave ? resultado : null
  const isLoading = resultado?.chave !== chave
  const calendario = dados?.calendario ?? null
  const cotas = useMemo(() => dados?.cotas ?? [], [dados])

  const diasPorData = useMemo(() => new Map((calendario?.dias ?? []).map(dia => [dia.data, dia])), [calendario])
  const cotaPorDia = useMemo(() => new Map(cotas.map(cota => [cota.diaId, cota])), [cotas])
  const events = useMemo(() => cotas.map(cota => cotaToEvent(cota)), [cotas])
  const temDiaLiberado = calendario?.dias.some(dia => dia.liberadoParaPreenchimento) ?? false

  const isDayEnabled = (date: Date) => !!diasPorData.get(toDateKey(date))?.liberadoParaPreenchimento

  const handleDayClick = (date: Date) => {
    if (!dados) return

    if (!calendario) {
      toast.info('Não há escala cadastrada para este mês.')

      return
    }

    const dia = diasPorData.get(toDateKey(date))

    if (calendario.escala.status !== 'aberta') {
      toast.warning(`A escala deste mês está ${calendario.escala.status}. Não é possível escolher turnos.`)

      return
    }

    if (!dia?.liberadoParaPreenchimento) {
      toast.warning('Este dia não está liberado para preenchimento.')

      return
    }

    setDiaSelecionado(dia)
    setIsModalOpen(true)
  }

  const handleOpenChange = (open: boolean) => {
    if (isSaving) return
    setIsModalOpen(open)
  }

  const handleSelect = async (turno: Turno) => {
    if (!diaSelecionado) return

    if (cotaPorDia.get(diaSelecionado.id)?.codigoPeriodo === turno) {
      setIsModalOpen(false)

      return
    }

    setIsSaving(true)

    try {
      await salvarCota(diaSelecionado.id, turno)
      toast.success(`Turno ${turno} salvo para ${formatDateKey(diaSelecionado.data)}.`)
      setIsModalOpen(false)
      recarregar()
    } catch (error) {
      toast.error(toApiError(error, 'Erro ao salvar a cota.').message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!diaSelecionado) return

    setIsSaving(true)

    try {
      await removerCota(diaSelecionado.id)
      toast.success(`Turno removido de ${formatDateKey(diaSelecionado.data)}.`)
      setIsModalOpen(false)
      recarregar()
    } catch (error) {
      toast.error(toApiError(error, 'Erro ao remover a cota.').message)
    } finally {
      setIsSaving(false)
    }
  }

  const nomeMes = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })

  const renderStatus = () => {
    if (!dados) return null

    if (dados.erroCalendario) {
      return (
        <StatusAlert
          variant='destructive'
          title='Não foi possível carregar a escala'
          description={dados.erroCalendario.message}
          onRetry={recarregar}
        />
      )
    }

    if (!calendario) {
      return <StatusAlert title='Nenhuma escala cadastrada' description={`Não há escala para ${nomeMes}.`} />
    }

    if (dados.erroCotas) {
      return (
        <StatusAlert
          variant='destructive'
          title='Não foi possível carregar suas cotas'
          description={mensagemErroCotas(dados.erroCotas)}
          onRetry={recarregar}
        />
      )
    }

    if (calendario.escala.status !== 'aberta') {
      return (
        <StatusAlert
          title={`Escala ${calendario.escala.status}`}
          description='As escolhas deste mês não podem mais ser alteradas.'
        />
      )
    }

    if (!temDiaLiberado) {
      return <StatusAlert title='Nenhum dia liberado' description='O administrador ainda não liberou dias para preenchimento.' />
    }

    if (cotas.length === 0) {
      return <StatusAlert title='Nenhuma cota escolhida' description='Clique em um dia liberado para escolher seu turno.' />
    }

    return null
  }

  return (
    <>
      <EventCalendar
        events={events}
        currentDate={currentDate}
        onCurrentDateChange={setCurrentDate}
        onDayClick={handleDayClick}
        createLabel='Escolher turno'
        isDayEnabled={calendario ? isDayEnabled : undefined}
        toolbar={isLoading && <Spinner className='text-muted-foreground' aria-label='Carregando' />}
      >
        {renderStatus()}
      </EventCalendar>

      <SelectDate
        open={isModalOpen}
        onOpenChange={handleOpenChange}
        date={diaSelecionado ? parseDateKey(diaSelecionado.data) : null}
        currentTurno={diaSelecionado ? cotaPorDia.get(diaSelecionado.id)?.codigoPeriodo : null}
        turnosDisponiveis={diaSelecionado?.opcoesDisponibilidade}
        isSaving={isSaving}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />
    </>
  )
}
