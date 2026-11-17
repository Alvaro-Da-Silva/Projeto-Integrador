'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangleIcon, PlusIcon, RefreshCwIcon, UserRoundXIcon } from 'lucide-react'
import { toast } from 'sonner'

import type {
  AjusteEscala,
  Cota,
  Cotista,
  EscalaDefinitivaInfo,
  PlantaoDefinitivo,
  ResultadoDistribuicao,
  SituacaoPlantao
} from '@/types/apps/cotas-types'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { TURNOS } from '@/components/modals/SelectDate'
import { formatDateKey } from './cotas-utils'

import {
  ApiError,
  alterarStatusEscala,
  atribuirCotaManual,
  executarDistribuicao,
  getAjustesEscala,
  removerAtribuicao
} from '@/controllers/CotasController'

import { cn } from '@/lib/utils'

const mensagemErro = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback)

const corTurno = (codigo: string) => TURNOS.find(t => t.id === codigo)?.cor ?? 'bg-muted'
const horarioTurno = (codigo: string) => TURNOS.find(t => t.id === codigo)?.horario ?? ''

const ORDEM_CODIGOS = ['D', 'N1', 'N2']

export const ordenarPlantoes = (plantoes: PlantaoDefinitivo[]) =>
  [...plantoes].sort((a, b) => ORDEM_CODIGOS.indexOf(a.codigoPeriodo) - ORDEM_CODIGOS.indexOf(b.codigoPeriodo))

const SITUACAO: Record<SituacaoPlantao, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  preenchido: { label: 'Preenchido', variant: 'default' },
  parcial: { label: 'Parcial', variant: 'secondary' },
  nao_preenchido: { label: 'Não preenchido', variant: 'destructive' }
}

function Stat({ label, value, destaque }: { label: string; value: ReactNode; destaque?: boolean }) {
  return (
    <div className='flex flex-col rounded-lg border p-3'>
      <span className='text-muted-foreground text-xs'>{label}</span>
      <span className={cn('text-lg font-semibold tabular-nums', destaque && 'text-destructive')}>{value}</span>
    </div>
  )
}

function TurnoTag({ codigo, data }: { codigo: string; data?: string }) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      <span aria-hidden className={cn('h-4 w-1 rounded-full', corTurno(codigo))} />
      <span className='font-medium'>{codigo}</span>
      {data && <span className='text-muted-foreground'>{formatDateKey(data)}</span>}
    </span>
  )
}

type GerarDistribuicaoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  escala: EscalaDefinitivaInfo
  onDone: () => void
}

export function GerarDistribuicaoDialog({ open, onOpenChange, escala, onDone }: GerarDistribuicaoDialogProps) {
  const [resultado, setResultado] = useState<ResultadoDistribuicao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return

    let ativo = true

    executarDistribuicao(escala.id, true)
      .then(dados => {
        if (ativo) {
          setResultado(dados)
          setErro(null)
        }
      })
      .catch(error => {
        if (ativo) setErro(mensagemErro(error, 'Erro ao simular a distribuição.'))
      })

    return () => {
      ativo = false
    }
  }, [open, escala.id, versao])

  const aberta = escala.status === 'aberta'
  const publicada = Boolean(escala.publicadaEm)
  const carregando = !resultado && !erro

  const confirmar = async () => {
    setSalvando(true)

    try {
      if (aberta) await alterarStatusEscala(escala.id, 'fechada')
      const final = await executarDistribuicao(escala.id, false)

      toast.success(
        `Distribuição gerada: ${final.resumo.vagasPreenchidas} de ${final.resumo.totalVagas} vagas preenchidas.`
      )
      onOpenChange(false)
      onDone()
    } catch (error) {
      toast.error(mensagemErro(error, 'Erro ao gerar a distribuição.'))

      if (aberta) onDone()
    } finally {
      setSalvando(false)
    }
  }

  const resumo = resultado?.resumo

  return (
    <Dialog open={open} onOpenChange={value => !salvando && onOpenChange(value)}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Gerar distribuição — {escala.nome}</DialogTitle>
          <DialogDescription>
            Simulação do resultado antes de gravar. Nada é salvo até você confirmar. Ajustes manuais já feitos são
            preservados; as atribuições automáticas são refeitas.
          </DialogDescription>
        </DialogHeader>

        {carregando && (
          <div className='flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground'>
            <Spinner /> Simulando distribuição…
          </div>
        )}

        {erro && (
          <Alert variant='destructive'>
            <AlertTriangleIcon />
            <AlertTitle>Não foi possível simular</AlertTitle>
            <AlertDescription className='flex flex-wrap items-center gap-3'>
              <span>{erro}</span>
              <Button type='button' size='sm' variant='outline' onClick={() => setVersao(v => v + 1)}>
                <RefreshCwIcon className='size-3.5' /> Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {resultado && resumo && (
          <div className='flex flex-col gap-5'>
            {resultado.avisos.map(aviso => (
              <Alert key={aviso}>
                <AlertTriangleIcon />
                <AlertDescription>{aviso}</AlertDescription>
              </Alert>
            ))}

            <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
              <Stat label='Vagas preenchidas' value={`${resumo.vagasPreenchidas}/${resumo.totalVagas}`} />
              <Stat label='Plantões incompletos' value={resumo.plantoesNaoPreenchidos} destaque={resumo.plantoesNaoPreenchidos > 0} />
              <Stat label='Participantes' value={`${resumo.participantes}/${resumo.candidatos}`} />
              <Stat label='Disputas resolvidas' value={resumo.disputas} />
            </div>

            <div className='flex flex-col gap-2'>
              <Label>Critérios aplicados (em ordem de prioridade)</Label>
              <ol className='text-muted-foreground list-decimal space-y-0.5 pl-5 text-sm'>
                <li>Quem escolheu o turno específico tem preferência sobre disponibilidade flexível (I).</li>
                {resultado.criterios.map(c => (
                  <li key={c.id}>{c.descricao}</li>
                ))}
              </ol>
              <p className='text-muted-foreground text-xs'>
                Cada cotista só recebe serviço nos dias que marcou, no máximo um plantão por dia. Patente fora da
                lista do cadastro conta como a menor no desempate.
              </p>
            </div>

            {resultado.naoPreenchidos.length > 0 && (
              <div className='flex flex-col gap-2'>
                <Label>Plantões não preenchidos ({resultado.naoPreenchidos.length})</Label>
                <ul className='max-h-48 divide-y overflow-y-auto rounded-md border text-sm'>
                  {resultado.naoPreenchidos.map(item => (
                    <li key={item.plantaoId} className='flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2'>
                      <TurnoTag codigo={item.codigo} data={item.data} />
                      <span className='tabular-nums'>
                        faltam {item.faltam} de {item.vagas}
                      </span>
                      <span className='text-muted-foreground text-xs'>{item.descricaoMotivo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resultado.disputas.length > 0 && (
              <div className='flex flex-col gap-2'>
                <Label>Disputas (mais interessados que vagas)</Label>
                <ul className='max-h-40 divide-y overflow-y-auto rounded-md border text-sm'>
                  {resultado.disputas.map(item => (
                    <li key={item.plantaoId} className='flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2'>
                      <TurnoTag codigo={item.codigo} data={item.data} />
                      <span className='tabular-nums'>
                        {item.interessados} interessados / {item.vagas} vagas
                      </span>
                      <span className='text-muted-foreground text-xs'>
                        Fora: {item.naoSelecionados.map(c => c.cotistaNome ?? `#${c.cotistaId}`).join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resultado.servicosPorCotista.length > 0 && (
              <div className='flex flex-col gap-2'>
                <Label>Plantões por cotista</Label>
                <ul className='grid max-h-40 grid-cols-1 gap-x-4 overflow-y-auto rounded-md border px-3 py-2 text-sm sm:grid-cols-2'>
                  {resultado.servicosPorCotista.map(item => (
                    <li key={item.cotistaId} className='flex justify-between gap-2 py-0.5'>
                      <span className='truncate'>{item.cotistaNome ?? `#${item.cotistaId}`}</span>
                      <span className='tabular-nums font-medium'>{item.total}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type='button' variant='outline' disabled={salvando} onClick={() => onOpenChange(false)}>
            Cancelar simulação
          </Button>
          <Button type='button' disabled={!resultado || salvando || publicada} onClick={confirmar}>
            {salvando && <Spinner />}
            {aberta ? 'Fechar período e confirmar' : 'Confirmar distribuição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type Acao =
  | { tipo: 'adicionar'; plantaoId: string }
  | { tipo: 'remover'; plantaoId: string; participacaoId: string; nome: string }

type DefinitivaDiaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  escala: EscalaDefinitivaInfo
  data: string | null
  plantoes: PlantaoDefinitivo[]
  cotistas: Cotista[]

  disponibilidades: Cota[]
  onChanged: () => void
}

export function DefinitivaDiaDialog({
  open,
  onOpenChange,
  escala,
  data,
  plantoes,
  cotistas,
  disponibilidades,
  onChanged
}: DefinitivaDiaDialogProps) {
  const [acao, setAcao] = useState<Acao | null>(null)
  const [cotistaId, setCotistaId] = useState<string | null>(null)
  const [substituirId, setSubstituirId] = useState<string | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [desistencia, setDesistencia] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const editavel = escala.status === 'fechada'

  const disponiveisNoDia = useMemo(
    () => new Map(disponibilidades.filter(d => d.data === data && d.cotistaId).map(d => [d.cotistaId as string, d.codigoPeriodo])),
    [disponibilidades, data]
  )

  if (!data) return null

  const doDia = ordenarPlantoes(plantoes.filter(p => p.data === data))

  const iniciar = (nova: Acao) => {
    setAcao(nova)
    setCotistaId(null)
    setSubstituirId(null)
    setJustificativa('')
    setDesistencia(false)
  }

  const justificativaValida = justificativa.trim().length >= 3

  const opcoesCotistas = (plantao: PlantaoDefinitivo) => {
    const jaNoPlantao = new Set(plantao.atribuicoes.map(a => a.cotistaId))

    const descricao = (c: Cotista) => {
      const turno = disponiveisNoDia.get(c.id)

      if (turno === plantao.codigoPeriodo) return 'escolheu este turno'
      if (turno === 'I') return 'disponibilidade flexível'
      if (turno) return `escolheu ${turno}`

      return 'sem disponibilidade'
    }

    const peso = (c: Cotista) => {
      const turno = disponiveisNoDia.get(c.id)

      return turno === plantao.codigoPeriodo ? 0 : turno === 'I' ? 1 : turno ? 2 : 3
    }

    return cotistas
      .filter(c => c.status === 'ativo' && !jaNoPlantao.has(c.id))
      .sort((a, b) => peso(a) - peso(b) || a.nome.localeCompare(b.nome))
      .map(c => ({ value: c.id, label: `${c.nome} — ${descricao(c)}` }))
  }

  const salvar = async () => {
    if (!acao || !justificativaValida) return

    setSalvando(true)

    try {
      if (acao.tipo === 'remover') {
        await removerAtribuicao(escala.id, acao.participacaoId, justificativa.trim(), desistencia)
        toast.success(`${acao.nome} removido(a) do plantão.`)
      } else {
        if (!cotistaId) return

        const resposta = await atribuirCotaManual(escala.id, {
          plantaoId: acao.plantaoId,
          cotistaId,
          justificativa: justificativa.trim(),
          substituirParticipacaoId: substituirId,
          ...(substituirId && desistencia ? { desistencia: true } : {})
        })

        toast.success(substituirId ? 'Cotista substituído.' : 'Cotista atribuído ao plantão.')
        resposta.avisos.forEach(aviso => toast.warning(aviso))
      }

      setAcao(null)
      onChanged()
    } catch (error) {
      toast.error(mensagemErro(error, 'Erro ao salvar o ajuste.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !salvando && onOpenChange(value)}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Escala definitiva — {formatDateKey(data)}</DialogTitle>
          <DialogDescription>
            {editavel
              ? 'Atribua, substitua ou remova cotistas. Toda alteração manual exige justificativa e fica registrada no histórico.'
              : escala.status === 'aberta'
                ? 'Feche a escala para gerar e ajustar a distribuição.'
                : 'A escala está encerrada; somente consulta.'}
          </DialogDescription>
        </DialogHeader>

        {doDia.length === 0 && <p className='text-muted-foreground text-sm'>Nenhum plantão liberado neste dia.</p>}

        <div className='flex flex-col gap-3'>
          {doDia.map(plantao => {
            const situacao = SITUACAO[plantao.situacao]
            const completo = plantao.atribuicoes.length >= plantao.quantidadeNecessaria
            const adicionando = acao?.tipo === 'adicionar' && acao.plantaoId === plantao.id
            const removendo = acao?.tipo === 'remover' && acao.plantaoId === plantao.id ? acao : null
            const opcoes = adicionando ? opcoesCotistas(plantao) : []

            const opcoesSubstituir = plantao.atribuicoes.map(a => ({ value: a.id, label: a.cotistaNome }))

            return (
              <section key={plantao.id} className='flex flex-col gap-2 rounded-lg border p-3'>
                <header className='flex flex-wrap items-center gap-3'>
                  <span aria-hidden className={cn('h-8 w-1 rounded-full', corTurno(plantao.codigoPeriodo))} />
                  <div className='flex min-w-24 flex-col'>
                    <span className='font-semibold'>{plantao.codigoPeriodo}</span>
                    <span className='text-muted-foreground text-xs'>{horarioTurno(plantao.codigoPeriodo)}</span>
                  </div>
                  <Badge variant={situacao.variant}>
                    {situacao.label} · {plantao.atribuicoes.length}/{plantao.quantidadeNecessaria}
                  </Badge>
                  {editavel && !adicionando && (
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      className='ml-auto'
                      disabled={salvando}
                      onClick={() => iniciar({ tipo: 'adicionar', plantaoId: plantao.id })}
                    >
                      <PlusIcon className='size-3.5' />
                      {completo ? 'Substituir' : 'Atribuir'}
                    </Button>
                  )}
                </header>

                {plantao.atribuicoes.length > 0 ? (
                  <ul className='flex flex-col divide-y rounded-md border'>
                    {plantao.atribuicoes.map(a => (
                      <li key={a.id} className='flex items-start gap-3 px-3 py-2 text-sm'>
                        <div className='flex min-w-0 flex-1 flex-col'>
                          <span className='flex items-center gap-2'>
                            <span className='truncate'>{a.cotistaNome}</span>
                            {a.origem === 'manual' && <Badge variant='outline'>Manual</Badge>}
                          </span>
                          {a.origem === 'manual' && a.observacao && (
                            <span className='text-muted-foreground text-xs'>Justificativa: {a.observacao}</span>
                          )}
                        </div>
                        {editavel && (
                          <Button
                            type='button'
                            size='icon-sm'
                            variant='ghost'
                            aria-label={`Remover ${a.cotistaNome}`}
                            disabled={salvando}
                            onClick={() =>
                              iniciar({ tipo: 'remover', plantaoId: plantao.id, participacaoId: a.id, nome: a.cotistaNome })
                            }
                          >
                            <UserRoundXIcon className='size-4' />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-muted-foreground text-sm'>Nenhum cotista atribuído.</p>
                )}

                {(adicionando || removendo) && (
                  <div className='bg-muted/40 flex flex-col gap-3 rounded-md border p-3'>
                    {removendo && (
                      <p className='text-sm'>
                        Remover <strong>{removendo.nome}</strong> do plantão {plantao.codigoPeriodo}?
                      </p>
                    )}

                    {adicionando && (
                      <>
                        <div className='flex flex-col gap-1.5'>
                          <Label>Cotista</Label>
                          <Select
                            items={opcoes}
                            value={cotistaId}
                            onValueChange={(value: string | null) => setCotistaId(value)}
                          >
                            <SelectTrigger className='w-full' aria-label='Cotista'>
                              <SelectValue placeholder='Selecione o cotista' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {opcoes.map(item => (
                                  <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        {(completo || plantao.atribuicoes.length > 0) && (
                          <div className='flex flex-col gap-1.5'>
                            <Label>{completo ? 'Substituir (obrigatório, plantão completo)' : 'Substituir (opcional)'}</Label>
                            <Select
                              items={opcoesSubstituir}
                              value={substituirId}
                              onValueChange={(value: string | null) => setSubstituirId(value)}
                            >
                              <SelectTrigger className='w-full' aria-label='Cotista a substituir'>
                                <SelectValue placeholder={completo ? 'Selecione quem sai' : 'Ninguém — adicionar'} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {opcoesSubstituir.map(item => (
                                    <SelectItem key={item.value} value={item.value}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}

                    <div className='flex flex-col gap-1.5'>
                      <Label htmlFor={`just-${plantao.id}`}>Justificativa</Label>
                      <Textarea
                        id={`just-${plantao.id}`}
                        value={justificativa}
                        maxLength={1000}
                        placeholder='Ex.: troca solicitada pelo cotista, cobertura de falta…'
                        onChange={e => setJustificativa(e.target.value)}
                      />
                    </div>

                    {(removendo || substituirId) && (
                      <label className='flex cursor-pointer items-start gap-3 text-sm'>
                        <Checkbox
                          className='mt-0.5'
                          checked={desistencia}
                          onCheckedChange={marcado => setDesistencia(marcado)}
                        />
                        <span className='flex flex-col gap-0.5'>
                          <span className='font-medium'>Vaga liberada por desistência do cotista</span>
                          <span className='text-muted-foreground text-xs'>Conta nas desistências do dashboard.</span>
                        </span>
                      </label>
                    )}

                    <div className='flex justify-end gap-2'>
                      <Button type='button' size='sm' variant='outline' disabled={salvando} onClick={() => setAcao(null)}>
                        Cancelar
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant={removendo ? 'destructive' : 'default'}
                        disabled={
                          salvando ||
                          !justificativaValida ||
                          (adicionando && (!cotistaId || (completo && !substituirId)))
                        }
                        onClick={salvar}
                      >
                        {salvando && <Spinner />}
                        {removendo ? 'Remover' : substituirId ? 'Substituir' : 'Atribuir'}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

type DefinitivaDiaViewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: string | null
  plantoes: PlantaoDefinitivo[]
  meuCotistaId: string | null
}

export function DefinitivaDiaViewDialog({ open, onOpenChange, data, plantoes, meuCotistaId }: DefinitivaDiaViewDialogProps) {
  if (!data) return null

  const doDia = ordenarPlantoes(plantoes.filter(p => p.data === data))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Escala de {formatDateKey(data)}</DialogTitle>
          <DialogDescription>Escala definitiva publicada pela coordenação.</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          {doDia.map(plantao => (
            <section key={plantao.id} className='flex flex-col gap-2 rounded-lg border p-3'>
              <header className='flex items-center gap-3'>
                <span aria-hidden className={cn('h-8 w-1 rounded-full', corTurno(plantao.codigoPeriodo))} />
                <div className='flex flex-col'>
                  <span className='font-semibold'>{plantao.codigoPeriodo}</span>
                  <span className='text-muted-foreground text-xs'>{horarioTurno(plantao.codigoPeriodo)}</span>
                </div>
              </header>
              {plantao.atribuicoes.length > 0 ? (
                <ul className='flex flex-col gap-1 text-sm'>
                  {plantao.atribuicoes.map(a => (
                    <li key={a.id} className={cn(a.cotistaId === meuCotistaId && 'font-semibold text-primary')}>
                      {a.cotistaNome}
                      {a.cotistaId === meuCotistaId && ' (você)'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='text-muted-foreground text-sm'>Sem cotistas atribuídos.</p>
              )}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ACAO_LABEL: Record<AjusteEscala['acao'], string> = {
  distribuicao_automatica: 'Distribuição automática',
  atribuicao_manual: 'Atribuição manual',
  substituicao: 'Substituição',
  remocao: 'Remoção',
  publicacao: 'Publicação',
  despublicacao: 'Publicação retirada'
}

type HistoricoAjustesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  escala: EscalaDefinitivaInfo
}

export function HistoricoAjustesDialog({ open, onOpenChange, escala }: HistoricoAjustesDialogProps) {
  const [ajustes, setAjustes] = useState<AjusteEscala[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let ativo = true

    getAjustesEscala(escala.id)
      .then(lista => {
        if (ativo) setAjustes(lista)
      })
      .catch(error => {
        if (ativo) setErro(mensagemErro(error, 'Erro ao carregar o histórico.'))
      })

    return () => {
      ativo = false
    }
  }, [open, escala.id])

  const descrever = (a: AjusteEscala) => {
    if (a.acao === 'substituicao') return `${a.cotistaAnteriorNome ?? '?'} → ${a.cotistaNome ?? '?'}`
    if (a.acao === 'remocao') return a.cotistaAnteriorNome
    if (a.acao === 'atribuicao_manual') return a.cotistaNome

    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Histórico de ajustes</DialogTitle>
          <DialogDescription>Execuções do algoritmo, alterações manuais e publicações de {escala.nome}.</DialogDescription>
        </DialogHeader>

        {!ajustes && !erro && (
          <div className='flex justify-center py-8'>
            <Spinner />
          </div>
        )}
        {erro && <p className='text-destructive text-sm'>{erro}</p>}
        {ajustes?.length === 0 && <p className='text-muted-foreground text-sm'>Nenhum registro ainda.</p>}

        {ajustes && ajustes.length > 0 && (
          <ul className='flex flex-col divide-y rounded-md border text-sm'>
            {ajustes.map(a => (
              <li key={a.id} className='flex flex-col gap-0.5 px-3 py-2'>
                <div className='flex flex-wrap items-center gap-x-2'>
                  <span className='font-medium'>{ACAO_LABEL[a.acao]}</span>
                  {a.motivo === 'desistencia' && <Badge variant='destructive'>Desistência</Badge>}
                  {a.codigo && a.data && <TurnoTag codigo={a.codigo} data={a.data} />}
                  {descrever(a) && <span>· {descrever(a)}</span>}
                </div>
                {a.justificativa && <span className='text-muted-foreground'>“{a.justificativa}”</span>}
                <span className='text-muted-foreground text-xs'>
                  {format(new Date(a.realizadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  {a.usuarioNome && ` · ${a.usuarioNome}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
