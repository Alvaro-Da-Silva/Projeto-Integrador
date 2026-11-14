import type { Turno } from '@/components/modals/SelectDate'

export type EscalaStatus = 'aberta' | 'fechada' | 'encerrada'

export interface Escala {
  id: string
  nome: string
  mes: number
  ano: number
  dataInicio: string
  dataFim: string
  status: EscalaStatus
  observacao: string | null
  criadaEm: string
  quantidadeCotasPadrao: number
  publicadaEm?: string | null
}

export interface Plantao {
  id: string
  diaId: string
  periodoId: string
  quantidadeNecessaria: number
  status: 'aberto' | 'encerrado'
  observacao: string | null
  criadoEm: string
}

export interface Periodo {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  horaInicio: string
  horaFim: string
  status: string
}

export interface DiaEscala {
  id: string
  escalaId: string

  data: string
  plantoes: Plantao[]
  opcoesDisponibilidade: Turno[]
  liberadoParaPreenchimento: boolean
}

export interface CalendarioMensal {
  escala: Escala
  dias: DiaEscala[]
  periodos: Periodo[]
}

export interface Cota {
  id: string
  diaId: string

  data: string
  codigoPeriodo: Turno
  periodoId: string
  observacao: string | null
  registradaEm?: string

  cotistaId?: string
  cotistaNome?: string
}

export interface CotaSalva {
  id: string
  cotistaId: string
  diaId: string
  periodoId: string
  observacao: string | null
  codigoPeriodo: Turno
}

export interface Cotista {
  id: string
  usuarioId: string | null
  nome: string
  dataNascimento: string | null
  telefone: string | null
  email: string | null
  status: string
  observacao: string | null
}


export type CodigoPlantaoDefinitivo = 'D' | 'N1' | 'N2'

export type SituacaoPlantao = 'preenchido' | 'parcial' | 'nao_preenchido'

export interface EscalaDefinitivaInfo extends Escala {
  publicadaEm: string | null
}

export interface AtribuicaoDefinitiva {
  id: string
  cotistaId: string
  cotistaNome: string
  origem: 'automatica' | 'manual'
  observacao?: string | null
  atribuidaEm?: string
}

export interface PlantaoDefinitivo {
  id: string
  diaId: string
  data: string
  codigoPeriodo: CodigoPlantaoDefinitivo
  quantidadeNecessaria: number
  situacao: SituacaoPlantao
  atribuicoes: AtribuicaoDefinitiva[]
}

export interface ResumoDefinitiva {
  plantoes: number
  totalVagas: number
  vagasPreenchidas: number
  vagasEmAberto: number
  plantoesPreenchidos: number
  plantoesParciais: number
  plantoesNaoPreenchidos: number
  participantes: number
  atribuicoesManuais: number
  atribuicoes: number
}

export interface EscalaDefinitiva {
  escala: EscalaDefinitivaInfo
  publicada: boolean
  meuCotistaId: string | null
  plantoes: PlantaoDefinitivo[]
  resumo: ResumoDefinitiva | null
  ultimaDistribuicao: { realizadoEm: string; usuarioNome: string | null } | null
}

export type MotivoNaoPreenchido = 'sem_candidatos' | 'candidatos_insuficientes'

export interface ResultadoDistribuicao {
  simulacao: boolean
  avisos: string[]
  resumo: {
    plantoes: number
    totalVagas: number
    vagasPreenchidas: number
    vagasEmAberto: number
    plantoesNaoPreenchidos: number
    disputas: number
    ajustesManuaisPreservados: number
    participantes: number
    candidatos: number
  }
  criterios: { id: string; descricao: string }[]
  atribuicoes: { plantaoId: string; cotistaId: string; cotistaNome: string | null; data: string; codigo: string; criterio: string }[]
  naoPreenchidos: {
    plantaoId: string
    data: string
    codigo: string
    vagas: number
    faltam: number
    motivo: MotivoNaoPreenchido
    descricaoMotivo: string
  }[]
  disputas: {
    plantaoId: string
    data: string
    codigo: string
    vagas: number
    interessados: number
    naoSelecionados: { cotistaId: string; cotistaNome: string | null }[]
  }[]
  servicosPorCotista: { cotistaId: string; cotistaNome: string | null; total: number }[]
}

export type AcaoAjuste =
  | 'distribuicao_automatica'
  | 'atribuicao_manual'
  | 'substituicao'
  | 'remocao'
  | 'publicacao'
  | 'despublicacao'

export interface AjusteEscala {
  id: string
  acao: AcaoAjuste
  motivo: 'desistencia' | null
  justificativa: string | null
  realizadoEm: string
  data: string | null
  codigo: string | null
  cotistaNome: string | null
  cotistaAnteriorNome: string | null
  usuarioNome: string | null
}
