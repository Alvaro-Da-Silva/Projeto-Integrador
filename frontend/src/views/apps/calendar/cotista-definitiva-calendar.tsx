'use client'

import { useEffect, useMemo, useState } from 'react'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import type { CalendarEvent } from '@/types/apps/calendar-types'
import type { EscalaDefinitiva } from '@/types/apps/cotas-types'

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EventCalendar } from './index'
import { StatusAlert, toDateKey, turnoToEvent } from './cotas-utils'
import { DefinitivaDiaViewDialog } from './definitiva-dialogs'

import { ApiError, getCalendario, getEscalaDefinitiva } from '@/controllers/CotasController'

type Filtro = 'meus' | 'todos'

const FILTROS: { label: string; value: Filtro }[] = [
  { label: 'Meus plantões', value: 'meus' },
  { label: 'Escala completa', value: 'todos' }
]

type MesCarregado = {
  chave: string
  mesChave: string
  definitiva: EscalaDefinitiva | null
  erro: ApiError | null
}

const toApiError = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error : new ApiError(500, fallback)

async function carregarMes(ano: number, mes: number): Promise<Omit<MesCarregado, 'chave' | 'mesChave'>> {
  try {
    const calendario = await getCalendario(ano, mes)

    if (!calendario) return { definitiva: null, erro: null }

    return { definitiva: await getEscalaDefinitiva(calendario.escala.id), erro: null }
  } catch (error) {
    return { definitiva: null, erro: toApiError(error, 'Erro ao carregar a escala definitiva.') }
  }
}

export function CotistaDefinitivaCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [versao, setVersao] = useState(0)
  const [resultado, setResultado] = useState<MesCarregado | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('meus')
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

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
  const definitiva = dados?.definitiva ?? null
  const meuId = definitiva?.meuCotistaId ?? null

  const meusPlantoes = useMemo(
    () => (definitiva?.plantoes ?? []).filter(p => meuId && p.atribuicoes.some(a => a.cotistaId === meuId)),
    [definitiva, meuId]
  )

  const events = useMemo<CalendarEvent[]>(() => {
    if (!definitiva) return []

    if (filtro === 'meus') {
      return meusPlantoes.map(p => turnoToEvent(p.id, p.data, p.codigoPeriodo, `Meu plantão ${p.codigoPeriodo}`))
    }

    return definitiva.plantoes
      .filter(p => p.atribuicoes.length > 0)
      .map(p => {
        const nomes = p.atribuicoes
          .map(a => (a.cotistaId === meuId ? 'Você' : a.cotistaNome.split(' ')[0]))
          .join(', ')

        return turnoToEvent(p.id, p.data, p.codigoPeriodo, `${p.codigoPeriodo} · ${nomes}`)
      })
  }, [definitiva, filtro, meusPlantoes, meuId])

  const nomeMes = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })

  const renderStatus = () => {
    if (!dados) return null

    if (dados.erro) {
      return (
        <StatusAlert
          variant='destructive'
          title='Não foi possível carregar a escala definitiva'
          description={dados.erro.message}
          onRetry={recarregar}
        />
      )
    }

    if (!definitiva) return <StatusAlert title='Nenhuma escala cadastrada' description={`Não há escala para ${nomeMes}.`} />

    if (!definitiva.publicada || definitiva.escala.status === 'aberta') {
      return (
        <StatusAlert
          title='Escala definitiva ainda não publicada'
          description={`A coordenação ainda não publicou a escala de ${nomeMes}. Você será informado assim que ela estiver disponível.`}
        />
      )
    }

    if (meusPlantoes.length === 0) {
      return (
        <StatusAlert
          title='Nenhum plantão atribuído a você'
          description={`Você não recebeu plantões em ${nomeMes}. Use "Escala completa" para ver a escala de todos.`}
        />
      )
    }

    return (
      <StatusAlert
        title={`Você tem ${meusPlantoes.length} plantão(ões) em ${nomeMes}`}
        description='Clique em um plantão para ver quem está escalado com você.'
      />
    )
  }

  return (
    <>
      <EventCalendar
        events={events}
        currentDate={currentDate}
        onCurrentDateChange={setCurrentDate}
        readOnly
        onEventClick={event => setDiaSelecionado(toDateKey(new Date(event.start)))}
        toolbar={
          <>
            {isLoading && <Spinner className='text-muted-foreground' aria-label='Carregando' />}
            <Select
              items={FILTROS}
              value={filtro}
              onValueChange={(value: Filtro | null) => {
                if (value) setFiltro(value)
              }}
            >
              <SelectTrigger className='w-40 max-sm:h-8 max-sm:w-auto max-sm:min-w-0 max-sm:flex-1' aria-label='Filtrar escala'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FILTROS.map(item => (
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

      <DefinitivaDiaViewDialog
        open={diaSelecionado !== null}
        onOpenChange={open => {
          if (!open) setDiaSelecionado(null)
        }}
        data={diaSelecionado}
        plantoes={definitiva?.plantoes ?? []}
        meuCotistaId={meuId}
      />
    </>
  )
}
