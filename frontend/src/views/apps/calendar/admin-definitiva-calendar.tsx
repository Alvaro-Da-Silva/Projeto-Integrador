'use client'

import { useEffect, useMemo, useState } from 'react'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { HistoryIcon, SendIcon, Undo2Icon } from 'lucide-react'
import { toast } from 'sonner'

import type { Cota, Cotista, EscalaDefinitiva, EscalaStatus } from '@/types/apps/cotas-types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { EventCalendar } from './index'
import { StatusAlert, toDateKey, turnoToEvent } from './cotas-utils'
import { DefinitivaDiaDialog, GerarDistribuicaoDialog, HistoricoAjustesDialog } from './definitiva-dialogs'

import {
  ApiError,
  alterarPublicacao,
  alterarStatusEscala,
  getCalendario,
  getCotasAdmin,
  getCotistas,
  getEscalaDefinitiva
} from '@/controllers/CotasController'

const STATUS_ITEMS: { label: string; value: EscalaStatus }[] = [
  { label: 'Aberta', value: 'aberta' },
  { label: 'Fechada', value: 'fechada' },
  { label: 'Encerrada', value: 'encerrada' }
]

type MesCarregado = {
  chave: string
  mesChave: string
  definitiva: EscalaDefinitiva | null
  disponibilidades: Cota[]
  erro: ApiError | null
}

const toApiError = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error : new ApiError(500, fallback)

async function carregarMes(ano: number, mes: number): Promise<Omit<MesCarregado, 'chave' | 'mesChave'>> {
  try {
    const calendario = await getCalendario(ano, mes)

    if (!calendario) return { definitiva: null, disponibilidades: [], erro: null }

    const [definitiva, disponibilidades] = await Promise.all([
      getEscalaDefinitiva(calendario.escala.id),
      getCotasAdmin(calendario.escala.id).catch(() => [] as Cota[])
    ])

    return { definitiva, disponibilidades, erro: null }
  } catch (error) {
    return { definitiva: null, disponibilidades: [], erro: toApiError(error, 'Erro ao carregar a escala definitiva.') }
  }
}

export function AdminDefinitivaCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [versao, setVersao] = useState(0)
  const [resultado, setResultado] = useState<MesCarregado | null>(null)
  const [cotistas, setCotistas] = useState<Cotista[]>([])
  const [dialogo, setDialogo] = useState<'gerar' | 'dia' | 'historico' | null>(null)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [aberturas, setAberturas] = useState(0)
  const [ocupado, setOcupado] = useState(false)

  const ano = currentDate.getFullYear()
  const mes = currentDate.getMonth() + 1
  const mesChave = `${ano}-${mes}`
  const chave = `${mesChave}-${versao}`

  useEffect(() => {
    let ativo = true

    getCotistas()
      .then(lista => {
        if (ativo) setCotistas(lista)
      })
      .catch(() => {})

    return () => {
      ativo = false
    }
  }, [])

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

  const abrir = (tipo: 'gerar' | 'dia' | 'historico') => {
    setAberturas(n => n + 1)
    setDialogo(tipo)
  }

  const dados = resultado?.mesChave === mesChave ? resultado : null
  const isLoading = resultado?.chave !== chave
  const definitiva = dados?.definitiva ?? null
  const escala = definitiva?.escala ?? null
  const resumo = definitiva?.resumo ?? null
  const temDistribuicao = Boolean(definitiva?.ultimaDistribuicao) || (resumo?.atribuicoes ?? 0) > 0

  const events = useMemo(() => {
    if (!definitiva || !temDistribuicao) return []

    return definitiva.plantoes.map(p => {
      const nomes = p.atribuicoes.map(a => a.cotistaNome.split(' ')[0]).join(', ')
      const contagem = `${p.atribuicoes.length}/${p.quantidadeNecessaria}`

      return turnoToEvent(p.id, p.data, p.codigoPeriodo, `${p.codigoPeriodo} ${contagem}${nomes ? ` · ${nomes}` : ''}`)
    })
  }, [definitiva, temDistribuicao])

  const diasComPlantao = useMemo(() => new Set((definitiva?.plantoes ?? []).map(p => p.data)), [definitiva])

  const nomeMes = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })

  const handleDayClick = (date: Date) => {
    if (!escala) return
    if (date.getFullYear() !== ano || date.getMonth() + 1 !== mes) return

    setDiaSelecionado(toDateKey(date))
    abrir('dia')
  }

  const handleGerar = () => {
    if (!escala) {
      toast.info('Não há escala cadastrada para este mês. Crie-a em Solicitações.')

      return
    }

    if (escala.status === 'encerrada') {
      toast.warning('A escala está encerrada e não pode mais ser redistribuída.')

      return
    }

    if (escala.publicadaEm) {
      toast.warning('A escala já foi publicada. Retire a publicação para gerar novamente, ou ajuste os dias manualmente.')

      return
    }

    abrir('gerar')
  }

  const executar = async (acao: () => Promise<void>, sucesso: string, fallback: string) => {
    setOcupado(true)

    try {
      await acao()
      toast.success(sucesso)
      recarregar()
    } catch (error) {
      toast.error(toApiError(error, fallback).message)
    } finally {
      setOcupado(false)
    }
  }

  const handleStatusChange = (status: EscalaStatus) => {
    if (!escala || status === escala.status) return

    if (status === 'aberta' && escala.publicadaEm) {
      toast.warning('A escala já foi publicada e não pode ser reaberta. Retire a publicação antes.')

      return
    }

    executar(() => alterarStatusEscala(escala.id, status), `Escala ${status}.`, 'Erro ao alterar o status da escala.')
  }

  const handlePublicacao = () => {
    if (!escala) return
    const publicar = !escala.publicadaEm

    if (publicar && resumo && resumo.vagasEmAberto > 0) {
      toast.warning(`Atenção: ${resumo.vagasEmAberto} vaga(s) continuam em aberto.`)
    }

    executar(
      () => alterarPublicacao(escala.id, publicar),
      publicar ? 'Escala publicada. Os cotistas já podem visualizá-la.' : 'Publicação retirada.',
      'Erro ao alterar a publicação.'
    )
  }

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

    if (!escala || !definitiva) {
      return (
        <StatusAlert
          title='Nenhuma escala cadastrada'
          description={`Não há escala para ${nomeMes}. Crie-a e libere os dias em Solicitações.`}
        />
      )
    }

    const avisos = []

    if (escala.status === 'aberta') {
      avisos.push(
        <StatusAlert
          key='aberta'
          title='Período de disponibilidades aberto'
          description='Os cotistas ainda podem alterar suas escolhas. Você pode simular a distribuição; ao confirmar, a escala é fechada.'
        />
      )
    }

    if (!temDistribuicao) {
      avisos.push(
        <StatusAlert
          key='sem'
          title='Distribuição ainda não gerada'
          description='Clique em "Gerar distribuição" para simular e confirmar a escala definitiva.'
        />
      )
    } else if (escala.publicadaEm) {
      avisos.push(
        <StatusAlert
          key='publicada'
          title='Escala publicada'
          description={`Publicada em ${format(new Date(escala.publicadaEm), "dd/MM/yyyy 'às' HH:mm")} e visível aos cotistas. Ajustes manuais continuam possíveis com justificativa.`}
        />
      )
    } else {
      avisos.push(
        <StatusAlert
          key='rascunho'
          title='Escala ainda não publicada'
          description='Revise os dias (clique para ajustar) e publique para que os cotistas visualizem.'
        />
      )
    }

    if (temDistribuicao && resumo) {
      avisos.push(
        <div key='resumo' className='grid grid-cols-2 gap-2 px-2 pb-3 sm:grid-cols-4 sm:px-4'>
          <div className='rounded-lg border p-3'>
            <p className='text-muted-foreground text-xs'>Vagas preenchidas</p>
            <p className='text-lg font-semibold tabular-nums'>
              {resumo.vagasPreenchidas}/{resumo.totalVagas}
            </p>
          </div>
          <div className='rounded-lg border p-3'>
            <p className='text-muted-foreground text-xs'>Plantões incompletos</p>
            <p className={`text-lg font-semibold tabular-nums ${resumo.plantoesParciais + resumo.plantoesNaoPreenchidos ? 'text-destructive' : ''}`}>
              {resumo.plantoesParciais + resumo.plantoesNaoPreenchidos}
            </p>
          </div>
          <div className='rounded-lg border p-3'>
            <p className='text-muted-foreground text-xs'>Participantes</p>
            <p className='text-lg font-semibold tabular-nums'>{resumo.participantes}</p>
          </div>
          <div className='rounded-lg border p-3'>
            <p className='text-muted-foreground text-xs'>Ajustes manuais</p>
            <p className='text-lg font-semibold tabular-nums'>{resumo.atribuicoesManuais}</p>
          </div>
        </div>
      )
    }

    return avisos
  }

  return (
    <>
      <EventCalendar
        events={events}
        currentDate={currentDate}
        onCurrentDateChange={setCurrentDate}
        onDayClick={handleDayClick}
        onCreateClick={handleGerar}
        createLabel='Gerar distribuição'
        isDayEnabled={escala ? date => diasComPlantao.has(toDateKey(date)) : undefined}
        toolbar={
          <>
            {(isLoading || ocupado) && <Spinner className='text-muted-foreground' aria-label='Carregando' />}
            {escala && (
              <>
                <Badge variant={escala.publicadaEm ? 'default' : 'outline'} className='max-md:hidden'>
                  {escala.publicadaEm ? 'Publicada' : 'Não publicada'}
                </Badge>
                <Select
                  items={STATUS_ITEMS}
                  value={escala.status}
                  disabled={ocupado}
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
                          disabled={item.value === 'aberta' && escala.status !== 'aberta' && !!escala.publicadaEm}
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {temDistribuicao && escala.status !== 'aberta' && (
                  <Button
                    variant={escala.publicadaEm ? 'outline' : 'default'}
                    className='max-sm:h-8'
                    disabled={ocupado || (escala.status === 'encerrada' && !!escala.publicadaEm)}
                    onClick={handlePublicacao}
                  >
                    {escala.publicadaEm ? <Undo2Icon className='size-4' /> : <SendIcon className='size-4' />}
                    <span className='max-sm:sr-only'>{escala.publicadaEm ? 'Despublicar' : 'Publicar'}</span>
                  </Button>
                )}
                <Button
                  variant='outline'
                  size='icon'
                  className='max-sm:size-8'
                  aria-label='Histórico de ajustes'
                  onClick={() => abrir('historico')}
                >
                  <HistoryIcon className='size-4' />
                </Button>
              </>
            )}
          </>
        }
      >
        {renderStatus()}
      </EventCalendar>

      {escala && definitiva && (
        <>
          <GerarDistribuicaoDialog
            key={`gerar-${aberturas}`}
            open={dialogo === 'gerar'}
            onOpenChange={open => setDialogo(open ? 'gerar' : null)}
            escala={escala}
            onDone={recarregar}
          />
          <DefinitivaDiaDialog
            key={`dia-${aberturas}`}
            open={dialogo === 'dia'}
            onOpenChange={open => setDialogo(open ? 'dia' : null)}
            escala={escala}
            data={diaSelecionado}
            plantoes={definitiva.plantoes}
            cotistas={cotistas}
            disponibilidades={dados?.disponibilidades ?? []}
            onChanged={recarregar}
          />
          <HistoricoAjustesDialog
            key={`historico-${aberturas}`}
            open={dialogo === 'historico'}
            onOpenChange={open => setDialogo(open ? 'historico' : null)}
            escala={escala}
          />
        </>
      )}
    </>
  )
}
