import type { EscalaStatus } from './cotas-types'

export interface DashboardCotista {
  horasConquistadas: number
  metaHoras: number
  horasFaltantes: number
  semestre: {
    ano: number
    numero: number

    inicio: string

    fim: string
  }
}

export interface DashboardCoordenador {

  mes: string
  escala: { id: string; status: EscalaStatus } | null
  totalCotas: number

  totalCotasEstimado: boolean
  solicitadas: number
  distribuidas: number
  desistencias: number

  desistenciasLista: DesistenciaRegistro[]

  desistenciasDisponivel: boolean
}

export interface DesistenciaRegistro {
  id: string
  acao: 'remocao' | 'substituicao'
  justificativa: string | null
  realizadoEm: string
  data: string | null
  codigo: string | null

  cotistaNome: string | null

  substitutoNome: string | null
  registradoPor: string | null
}
