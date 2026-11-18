'use client'

import { useMemo, useState, type FormEvent } from 'react'

import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import type { CalendarioMensal, Cota } from '@/types/apps/cotas-types'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { TURNOS } from '@/components/modals/SelectDate'
import { formatDateKey, toDateKey } from './cotas-utils'

import {
  ApiError,
  type CodigoPlantao,
  alterarStatusPlantao,
  criarEscala,
  liberarPlantoes
} from '@/controllers/CotasController'

import { cn } from '@/lib/utils'

const CODIGOS: CodigoPlantao[] = ['D', 'N1', 'N2']
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const mensagemErro = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback)

const capitalize = (str: string) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '')

const corTurno = (codigo: string) => TURNOS.find(t => t.id === codigo)?.cor ?? 'bg-muted'
const horarioTurno = (codigo: string) => TURNOS.find(t => t.id === codigo)?.horario ?? ''

const MAX_COTAS_POR_DIA = 4
const MAX_N2_POR_DIA = 1

function distribuicaoPadrao(cotas: number) {
  if (cotas === 4) return { dia: 2, noite: 2 }
  if (cotas === 3) return { dia: 1, noite: 2 }

  return { dia: cotas, noite: cotas }
}

const quantidadePadrao = (codigo: CodigoPlantao, cotas: number) => {
  const { dia, noite } = distribuicaoPadrao(cotas || 1)

  if (codigo === 'D') return dia

  return codigo === 'N2' ? Math.min(noite, MAX_N2_POR_DIA) : noite
}

export function plantoesPorCodigo(calendario: CalendarioMensal | null) {
  const codigoPorPeriodo = new Map((calendario?.periodos ?? []).map(p => [p.id, p.codigo]))
  const mapa = new Map<string, Map<string, { quantidade: number; status: string }>>()

  for (const dia of calendario?.dias ?? []) {
    const porCodigo = new Map<string, { quantidade: number; status: string }>()

    for (const plantao of dia.plantoes) {
      const codigo = codigoPorPeriodo.get(plantao.periodoId)

      if (codigo) porCodigo.set(codigo, { quantidade: plantao.quantidadeNecessaria, status: plantao.status })
    }

    mapa.set(dia.data, porCodigo)
  }

  return mapa
}

type NovaEscalaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ano: number
  mes: number
  onCreated: () => void
}

export function NovaEscalaDialog({ open, onOpenChange, ano, mes, onCreated }: NovaEscalaDialogProps) {
  const nomePadrao = `Escala ${capitalize(format(new Date(ano, mes - 1, 1), 'MMMM yyyy', { locale: ptBR }))}`
  const [nome, setNome] = useState(nomePadrao)
  const [quantidade, setQuantidade] = useState('4')
  const [observacao, setObservacao] = useState('')
  const [liberarTodos, setLiberarTodos] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const quantidadeNum = Number(quantidade)
  const valido =
    nome.trim().length > 0 &&
    nome.trim().length <= 100 &&
    Number.isInteger(quantidadeNum) &&
    quantidadeNum > 0 &&
    quantidadeNum <= MAX_COTAS_POR_DIA
  const distribuicao = valido ? distribuicaoPadrao(quantidadeNum) : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valido) return

    setIsSaving(true)

    try {
      const escala = await criarEscala({
        nome: nome.trim(),
        ano,
        mes,
        quantidadeCotasPadrao: quantidadeNum,
        observacao: observacao.trim() || null,
        liberarTodosOsDias: liberarTodos
      })

      toast.success(
        liberarTodos
          ? `Escala criada com o mês todo liberado (${escala.plantoesLiberados} plantões). Os cotistas já podem escolher.`
          : 'Escala criada. Libere os dias para os cotistas escolherem.'
      )
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast.error(mensagemErro(error, 'Erro ao criar a escala.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !isSaving && onOpenChange(value)}>
      <DialogContent className='sm:max-w-md'>
        <form onSubmit={handleSubmit} className='flex flex-col gap-5'>
          <DialogHeader>
            <DialogTitle>Nova escala</DialogTitle>
            <DialogDescription>
              Cria a escala de {format(new Date(ano, mes - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })}. Exceções (dias
              sem plantão, quantidades diferentes) podem ser ajustadas depois clicando no dia.
            </DialogDescription>
          </DialogHeader>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='escala-nome'>Nome</Label>
            <Input id='escala-nome' value={nome} maxLength={100} onChange={e => setNome(e.target.value)} required />
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='escala-cotas'>Cotas por dia (padrão)</Label>
            <Input
              id='escala-cotas'
              type='number'
              inputMode='numeric'
              min={1}
              max={MAX_COTAS_POR_DIA}
              step={1}
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
              required
            />
            <span className='text-muted-foreground text-xs'>Máximo de {MAX_COTAS_POR_DIA} cotas por dia.</span>
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='escala-obs'>Observação (opcional)</Label>
            <Input id='escala-obs' value={observacao} onChange={e => setObservacao(e.target.value)} />
          </div>

          <label className='flex cursor-pointer items-start gap-3 rounded-lg border p-3'>
            <Checkbox className='mt-0.5' checked={liberarTodos} onCheckedChange={marcado => setLiberarTodos(marcado)} />
            <span className='flex flex-col gap-1'>
              <span className='font-medium'>Liberar todos os dias do mês</span>
              <span className='text-muted-foreground text-xs'>
                {distribuicao
                  ? `Cria D, N1 e N2 em todos os dias — D com ${distribuicao.dia} e ${distribuicao.noite} vaga(s) na noite, divididas entre N1 e N2 (no máximo ${MAX_N2_POR_DIA} no N2).`
                  : 'Cria D, N1 e N2 em todos os dias.'}{' '}
                Os cotistas já podem escolher assim que a escala for criada.
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button type='button' variant='outline' disabled={isSaving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type='submit' disabled={!valido || isSaving}>
              {isSaving && <Spinner />}
              Criar escala
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type LiberarDiasDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendario: CalendarioMensal
  onDone: () => void
}

export function LiberarDiasDialog({ open, onOpenChange, calendario, onDone }: LiberarDiasDialogProps) {
  const { escala } = calendario
  const inicioMes = useMemo(() => new Date(escala.ano, escala.mes - 1, 1), [escala.ano, escala.mes])
  const dias = useMemo(() => eachDayOfInterval({ start: startOfMonth(inicioMes), end: endOfMonth(inicioMes) }), [inicioMes])
  const plantoes = useMemo(() => plantoesPorCodigo(calendario), [calendario])

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [codigos, setCodigos] = useState<Set<CodigoPlantao>>(new Set(CODIGOS))
  const [quantidade, setQuantidade] = useState(String(quantidadePadrao('N1', escala.quantidadeCotasPadrao)))
  const [isSaving, setIsSaving] = useState(false)

  const selecionar = (filtro: (dia: Date) => boolean) => setSelecionados(new Set(dias.filter(filtro).map(toDateKey)))

  const alternarDia = (chave: string) =>
    setSelecionados(atual => {
      const novo = new Set(atual)

      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)

      return novo
    })

  const alternarCodigo = (codigo: CodigoPlantao, marcado: boolean) =>
    setCodigos(atual => {
      const novo = new Set(atual)

      if (marcado) novo.add(codigo)
      else novo.delete(codigo)

      return novo
    })

  const quantidadeNum = Number(quantidade)
  const valido = selecionados.size > 0 && codigos.size > 0 && Number.isInteger(quantidadeNum) && quantidadeNum > 0

  const handleSubmit = async () => {
    if (!valido) return

    setIsSaving(true)

    try {
      const total = await liberarPlantoes(
        escala.id,
        [...selecionados].sort(),
        CODIGOS.filter(c => codigos.has(c)),
        quantidadeNum
      )

      toast.success(`${total} plantão(ões) liberado(s) em ${selecionados.size} dia(s).`)
      onOpenChange(false)
      onDone()
    } catch (error) {
      toast.error(mensagemErro(error, 'Erro ao liberar os plantões.'))
    } finally {
      setIsSaving(false)
    }
  }

  const espacosIniciais = getDay(dias[0])

  return (
    <Dialog open={open} onOpenChange={value => !isSaving && onOpenChange(value)}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Liberar dias</DialogTitle>
          <DialogDescription>
            Selecione os dias e plantões que os cotistas poderão escolher em {escala.nome}. Dias já liberados podem ser
            reenviados para atualizar a quantidade.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          <div className='flex flex-wrap gap-2'>
            <Button type='button' size='sm' variant='outline' onClick={() => selecionar(() => true)}>
              Todos
            </Button>
            <Button type='button' size='sm' variant='outline' onClick={() => selecionar(d => ![0, 6].includes(getDay(d)))}>
              Dias úteis
            </Button>
            <Button type='button' size='sm' variant='outline' onClick={() => selecionar(d => [0, 6].includes(getDay(d)))}>
              Fins de semana
            </Button>
            <Button type='button' size='sm' variant='outline' onClick={() => selecionar(d => !plantoes.has(toDateKey(d)))}>
              Ainda não liberados
            </Button>
            <Button type='button' size='sm' variant='ghost' onClick={() => setSelecionados(new Set())}>
              Limpar
            </Button>
          </div>

          <div className='grid grid-cols-7 gap-1 text-center'>
            {DIAS_SEMANA.map((d, i) => (
              <span key={i} className='text-muted-foreground py-1 text-xs font-medium'>
                {d}
              </span>
            ))}
            {Array.from({ length: espacosIniciais }, (_, i) => (
              <span key={`vazio-${i}`} />
            ))}
            {dias.map(dia => {
              const chave = toDateKey(dia)
              const ativo = selecionados.has(chave)
              const jaLiberado = plantoes.has(chave)

              return (
                <button
                  key={chave}
                  type='button'
                  aria-pressed={ativo}
                  aria-label={`${formatDateKey(chave)}${jaLiberado ? ' (já liberado)' : ''}`}
                  onClick={() => alternarDia(chave)}
                  className={cn(
                    'relative flex h-9 items-center justify-center rounded-md border text-sm transition-colors',
                    ativo ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                    !ativo && jaLiberado && 'border-primary/40 bg-primary/5'
                  )}
                >
                  {format(dia, 'd')}
                  {jaLiberado && (
                    <span
                      aria-hidden
                      className={cn('absolute right-1 top-1 size-1.5 rounded-full', ativo ? 'bg-primary-foreground' : 'bg-primary')}
                    />
                  )}
                </button>
              )
            })}
          </div>
          <p className='text-muted-foreground text-xs'>
            {selecionados.size} dia(s) selecionado(s). O ponto indica dias que já têm plantões liberados.
          </p>
        </div>

        <div className='flex flex-col gap-2'>
          <Label>Plantões</Label>
          <div className='flex flex-col gap-2'>
            {CODIGOS.map(codigo => (
              <label key={codigo} className='flex cursor-pointer items-center gap-3 rounded-md border p-2.5'>
                <Checkbox checked={codigos.has(codigo)} onCheckedChange={marcado => alternarCodigo(codigo, marcado)} />
                <span aria-hidden className={cn('h-6 w-1 rounded-full', corTurno(codigo))} />
                <span className='font-medium'>{codigo}</span>
                <span className='text-muted-foreground text-sm'>{horarioTurno(codigo)}</span>
              </label>
            ))}
          </div>
          <p className='text-muted-foreground text-xs'>
            A opção I (disponibilidade flexível) fica disponível automaticamente nos dias com plantão liberado.
          </p>
        </div>

        <div className='flex flex-col gap-2'>
          <Label htmlFor='liberar-qtd'>Cotistas necessários por plantão</Label>
          <Input
            id='liberar-qtd'
            type='number'
            inputMode='numeric'
            min={1}
            step={1}
            value={quantidade}
            onChange={e => setQuantidade(e.target.value)}
          />
          <p className='text-muted-foreground text-xs'>
            N1 e N2 dividem as vagas da noite: N1+N1 ou N1+N2. O N2 recebe no máximo {MAX_N2_POR_DIA} cotista por dia, e o
            dia não pode passar de {MAX_COTAS_POR_DIA} cotas.
          </p>
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' disabled={isSaving} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type='button' disabled={!valido || isSaving} onClick={handleSubmit}>
            {isSaving && <Spinner />}
            Liberar {selecionados.size > 0 ? `${selecionados.size} dia(s)` : 'dias'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type DiaAdminDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendario: CalendarioMensal
  data: string | null
  cotas: Cota[]
  nomeCotista: (cota: Cota) => string
  onChanged: () => void
}

export function DiaAdminDialog({ open, onOpenChange, calendario, data, cotas, nomeCotista, onChanged }: DiaAdminDialogProps) {
  const { escala } = calendario
  const plantoes = useMemo(() => (data ? plantoesPorCodigo(calendario).get(data) : undefined), [calendario, data])

  const [quantidades, setQuantidades] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CODIGOS.map(c => [c, String(plantoes?.get(c)?.quantidade ?? quantidadePadrao(c, escala.quantidadeCotasPadrao))])
    )
  )

  const [salvando, setSalvando] = useState<string | null>(null)

  if (!data) return null

  const escalaAberta = escala.status === 'aberta'
  const cotasDoDia = cotas.filter(c => c.data === data)

  const executar = async (codigo: CodigoPlantao, acao: () => Promise<unknown>, sucesso: string) => {
    setSalvando(codigo)

    try {
      await acao()
      toast.success(sucesso)
      onChanged()
    } catch (error) {
      toast.error(mensagemErro(error, 'Erro ao atualizar o plantão.'))
    } finally {
      setSalvando(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !salvando && onOpenChange(value)}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Dia {formatDateKey(data)}</DialogTitle>
          <DialogDescription>
            {escalaAberta
              ? 'Libere, ajuste ou encerre os plantões deste dia.'
              : `A escala está ${escala.status}; os plantões não podem ser alterados.`}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-2'>
          {CODIGOS.map(codigo => {
            const plantao = plantoes?.get(codigo)
            const quantidade = Number(quantidades[codigo])
            const maximo = codigo === 'N2' ? MAX_N2_POR_DIA : MAX_COTAS_POR_DIA
            const quantidadeValida = Number.isInteger(quantidade) && quantidade > 0 && quantidade <= maximo
            const ocupado = salvando !== null

            return (
              <div key={codigo} className='flex flex-wrap items-center gap-3 rounded-lg border p-3'>
                <span aria-hidden className={cn('h-8 w-1 rounded-full', corTurno(codigo))} />
                <div className='flex min-w-24 flex-col'>
                  <span className='font-semibold'>{codigo}</span>
                  <span className='text-muted-foreground text-xs'>{horarioTurno(codigo)}</span>
                </div>
                {plantao ? (
                  <Badge variant={plantao.status === 'aberto' ? 'default' : 'secondary'}>
                    {plantao.status === 'aberto' ? `Liberado · ${plantao.quantidade}` : capitalize(plantao.status)}
                  </Badge>
                ) : (
                  <Badge variant='outline'>Não liberado</Badge>
                )}

                {escalaAberta && (
                  <div className='ml-auto flex items-center gap-2'>
                    <Input
                      type='number'
                      inputMode='numeric'
                      min={1}
                      max={maximo}
                      step={1}
                      aria-label={`Quantidade do plantão ${codigo}`}
                      className='h-8 w-16'
                      value={quantidades[codigo] ?? ''}
                      onChange={e => setQuantidades(q => ({ ...q, [codigo]: e.target.value }))}
                    />
                    <Button
                      type='button'
                      size='sm'
                      disabled={ocupado || !quantidadeValida}
                      onClick={() =>
                        executar(
                          codigo,
                          () => liberarPlantoes(escala.id, [data], [codigo], quantidade),
                          `Plantão ${codigo} ${plantao ? 'atualizado' : 'liberado'}.`
                        )
                      }
                    >
                      {salvando === codigo && <Spinner />}
                      {!plantao ? 'Liberar' : plantao.status === 'aberto' ? 'Salvar' : 'Reabrir'}
                    </Button>
                    {plantao?.status === 'aberto' && (
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={ocupado}
                        onClick={() =>
                          executar(
                            codigo,
                            () => alterarStatusPlantao(escala.id, data, codigo, 'encerrado'),
                            `Plantão ${codigo} encerrado.`
                          )
                        }
                      >
                        Encerrar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className='flex flex-col gap-2'>
          <Label>Escolhas dos cotistas ({cotasDoDia.length})</Label>
          {cotasDoDia.length === 0 ? (
            <p className='text-muted-foreground text-sm'>Nenhum cotista escolheu turno neste dia.</p>
          ) : (
            <ul className='flex flex-col divide-y rounded-md border'>
              {cotasDoDia.map(cota => (
                <li key={cota.id} className='flex items-center gap-3 px-3 py-2 text-sm'>
                  <span aria-hidden className={cn('h-5 w-1 rounded-full', corTurno(cota.codigoPeriodo))} />
                  <span className='w-8 font-medium'>{cota.codigoPeriodo}</span>
                  <span className='truncate'>{nomeCotista(cota)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
