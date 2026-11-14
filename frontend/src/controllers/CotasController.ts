import axios, { AxiosError } from 'axios'

import { authClient } from '@/lib/auth-client'
import type { Turno } from '@/components/modals/SelectDate'
import type {
    AjusteEscala,
    CalendarioMensal,
    Cota,
    CotaSalva,
    Cotista,
    DiaEscala,
    Escala,
    EscalaDefinitiva,
    EscalaStatus,
    Periodo,
    ResultadoDistribuicao
} from '@/types/apps/cotas-types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

const TURNOS_VALIDOS: Turno[] = ['D', 'N1', 'N2', 'I']


export class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

export class PendenciaBackendError extends ApiError {
    constructor(message: string) {
        super(501, message)
        this.name = 'PendenciaBackendError'
    }
}

const MENSAGENS_PADRAO: Record<number, string> = {
    400: 'Dados inválidos enviados ao servidor.',
    401: 'Sessão inválida ou expirada. Faça login novamente.',
    403: 'Você não tem permissão para esta operação.',
    404: 'Registro não encontrado.',
    409: 'Operação não permitida no estado atual da escala.',
    429: 'Muitas requisições. Tente novamente em instantes.',
    503: 'Serviço indisponível no momento.'
}

export function toApiError(error: unknown, fallback: string): ApiError {
    if (error instanceof ApiError) return error

    if (error instanceof AxiosError) {
        if (!error.response) {
            return new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.')
        }

        const status = error.response.status
        const data = error.response.data as { error?: unknown } | undefined
        const message = typeof data?.error === 'string' ? data.error : (MENSAGENS_PADRAO[status] ?? fallback)

        return new ApiError(status, message)
    }

    return new ApiError(500, fallback)
}

let tokenCache: { token: string; expiraEm: number } | null = null
let tokenPendente: Promise<string> | null = null

authClient.$store.listen('$sessionSignal', () => {
    tokenCache = null
})

function expiracaoDoToken(token: string): number {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }

        return typeof payload.exp === 'number' ? payload.exp * 1000 : 0
    } catch {
        return 0
    }
}

async function buscarToken(): Promise<string> {
    const { data, error } = await authClient.$fetch<{ token: string }>('/token', { method: 'GET' })

    if (error || !data?.token) {
        throw new ApiError(401, 'Sessão inválida ou expirada. Faça login novamente.')
    }

    tokenCache = { token: data.token, expiraEm: expiracaoDoToken(data.token) }

    return data.token
}

async function getAuthToken(): Promise<string> {
    if (tokenCache && tokenCache.expiraEm - 60_000 > Date.now()) return tokenCache.token

    tokenPendente ??= buscarToken().finally(() => {
        tokenPendente = null
    })

    return tokenPendente
}

const publicApi = axios.create({ baseURL: API_URL, timeout: 15000 })

export const api = axios.create({ baseURL: API_URL, timeout: 15000 })

api.interceptors.request.use(async config => {
    const token = await getAuthToken()

    config.headers.Authorization = `Bearer ${token}`

    return config
})

api.interceptors.response.use(undefined, error => {
    if (error instanceof AxiosError && error.response?.status === 401) tokenCache = null

    return Promise.reject(error)
})

export function toDateKey(value: string): string {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)

    if (!match) throw new ApiError(500, `Data inválida recebida do servidor: ${value}`)

    return match[1]
}

function toTurnos(codes: unknown): Turno[] {
    return Array.isArray(codes) ? codes.filter((c): c is Turno => TURNOS_VALIDOS.includes(c as Turno)) : []
}

type DiaApi = Omit<DiaEscala, 'opcoesDisponibilidade'> & { opcoesDisponibilidade: string[] }
type CotaApi = Omit<Cota, 'codigoPeriodo'> & { codigoPeriodo: string }

function mapDia(dia: DiaApi): DiaEscala {
    return {
        id: dia.id,
        escalaId: dia.escalaId,
        data: toDateKey(dia.data),
        plantoes: dia.plantoes ?? [],
        opcoesDisponibilidade: toTurnos(dia.opcoesDisponibilidade),
        liberadoParaPreenchimento: Boolean(dia.liberadoParaPreenchimento)
    }
}

function mapCota(cota: CotaApi): Cota | null {
    if (!TURNOS_VALIDOS.includes(cota.codigoPeriodo as Turno)) return null

    return { ...cota, data: toDateKey(cota.data), codigoPeriodo: cota.codigoPeriodo as Turno }
}

export async function getCalendario(ano: number, mes: number): Promise<CalendarioMensal | null> {
    try {
        const { data } = await publicApi.get<{ escala: Escala; dias: DiaApi[]; periodos: Periodo[] }>(
            `/api/escalas/${ano}/${mes}/calendario`
        )

        return { escala: data.escala, dias: data.dias.map(mapDia), periodos: data.periodos }
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 404) return null

        throw toApiError(error, 'Erro ao carregar o calendário da escala.')
    }
}

export async function getMinhasCotas(escalaId: string): Promise<Cota[]> {
    try {
        const { data } = await api.get<CotaApi[]>('/api/disponibilidades', { params: { escalaId } })

        return data.map(mapCota).filter((c): c is Cota => c !== null)
    } catch (error) {
        throw toApiError(error, 'Erro ao carregar suas cotas.')
    }
}

export async function salvarCota(diaId: string, turno: Turno, observacao: string | null = null): Promise<CotaSalva> {
    try {
        const { data } = await api.put<CotaSalva>(`/api/disponibilidades/${diaId}`, {
            codigoPeriodo: turno,
            observacao
        })

        return data
    } catch (error) {
        throw toApiError(error, 'Erro ao salvar a cota.')
    }
}

export async function getCotistas(): Promise<Cotista[]> {
    try {
        const { data } = await api.get<Cotista[]>('/api/cotistas')

        return data
    } catch (error) {
        throw toApiError(error, 'Erro ao carregar os cotistas.')
    }
}

export async function getCotasAdmin(escalaId: string, cotistaId?: string): Promise<Cota[]> {
    try {
        const { data } = await api.get<CotaApi[]>(`/api/escalas/${escalaId}/disponibilidades`, {
            params: cotistaId ? { cotistaId } : undefined
        })

        return data.map(mapCota).filter((c): c is Cota => c !== null)
    } catch (error) {
        throw toApiError(error, 'Erro ao carregar as cotas dos cotistas.')
    }
}


export async function removerCota(diaId: string): Promise<void> {
    try {
        await api.delete(`/api/disponibilidades/${diaId}`)
    } catch (error) {
        throw toApiError(error, 'Erro ao remover a cota.')
    }
}


export type NovaEscala = {
    nome: string
    ano: number
    mes: number
    quantidadeCotasPadrao: number
    observacao?: string | null

    liberarTodosOsDias?: boolean
}

export type CodigoPlantao = Exclude<Turno, 'I'>

export async function criarEscala(
    dados: NovaEscala
): Promise<Pick<Escala, 'id' | 'nome' | 'ano' | 'mes' | 'status' | 'quantidadeCotasPadrao'> & { plantoesLiberados: number }> {
    try {
        const { data } = await api.post('/api/escalas', { ...dados, observacao: dados.observacao || null })

        return data
    } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 409) {
            throw new ApiError(409, 'Já existe uma escala cadastrada para este mês.')
        }

        throw toApiError(error, 'Erro ao criar a escala.')
    }
}

export async function alterarStatusEscala(escalaId: string, status: EscalaStatus): Promise<void> {
    try {
        await api.patch(`/api/escalas/${escalaId}/status`, { status })
    } catch (error) {
        throw toApiError(error, 'Erro ao alterar o status da escala.')
    }
}


export async function liberarPlantoes(
    escalaId: string,
    datas: string[],
    codigos: CodigoPlantao[],
    quantidadeNecessaria: number
): Promise<number> {
    try {
        const { data } = await api.put<{ total: number }>(`/api/escalas/${escalaId}/plantoes`, {
            datas,
            codigos,
            quantidadeNecessaria
        })

        return data.total
    } catch (error) {
        throw toApiError(error, 'Erro ao liberar os plantões.')
    }
}

export async function alterarStatusPlantao(
    escalaId: string,
    data: string,
    codigo: CodigoPlantao,
    status: 'aberto' | 'encerrado'
): Promise<void> {
    try {
        await api.patch(`/api/escalas/${escalaId}/dias/${data}/plantoes/${codigo}/status`, { status })
    } catch (error) {
        throw toApiError(error, 'Erro ao alterar o plantão.')
    }
}


export async function getEscalaDefinitiva(escalaId: string): Promise<EscalaDefinitiva> {
    try {
        const { data } = await api.get<EscalaDefinitiva>(`/api/escalas/${escalaId}/definitiva`)

        return {
            ...data,
            plantoes: data.plantoes
                .filter(p => ['D', 'N1', 'N2'].includes(p.codigoPeriodo))
                .map(p => ({ ...p, data: toDateKey(p.data) }))
        }
    } catch (error) {
        throw toApiError(error, 'Erro ao carregar a escala definitiva.')
    }
}


export async function executarDistribuicao(escalaId: string, simular: boolean): Promise<ResultadoDistribuicao> {
    try {
        const { data } = await api.post<ResultadoDistribuicao>(`/api/escalas/${escalaId}/distribuicao`, { simular }, {
            timeout: 60000
        })

        return data
    } catch (error) {
        throw toApiError(error, simular ? 'Erro ao simular a distribuição.' : 'Erro ao gerar a distribuição.')
    }
}

export async function atribuirCotaManual(
    escalaId: string,
    dados: {
        plantaoId: string
        cotistaId: string
        justificativa: string
        substituirParticipacaoId?: string | null

        desistencia?: boolean
    }
): Promise<{ id: string; avisos: string[] }> {
    try {
        const { data } = await api.post<{ id: string; avisos: string[] }>(`/api/escalas/${escalaId}/participacoes`, dados)

        return data
    } catch (error) {
        throw toApiError(error, 'Erro ao atribuir a cota.')
    }
}


export async function removerAtribuicao(
    escalaId: string,
    participacaoId: string,
    justificativa: string,
    desistencia = false
): Promise<void> {
    try {
        await api.delete(`/api/escalas/${escalaId}/participacoes/${participacaoId}`, {
            data: desistencia ? { justificativa, desistencia } : { justificativa }
        })
    } catch (error) {
        throw toApiError(error, 'Erro ao remover a atribuição.')
    }
}

export async function alterarPublicacao(escalaId: string, publicada: boolean): Promise<void> {
    try {
        await api.patch(`/api/escalas/${escalaId}/publicacao`, { publicada })
    } catch (error) {
        throw toApiError(error, publicada ? 'Erro ao publicar a escala.' : 'Erro ao retirar a publicação.')
    }
}

export async function getAjustesEscala(escalaId: string): Promise<AjusteEscala[]> {
    try {
        const { data } = await api.get<AjusteEscala[]>(`/api/escalas/${escalaId}/ajustes`)

        return data
    } catch (error) {
        throw toApiError(error, 'Erro ao carregar o histórico de ajustes.')
    }
}
