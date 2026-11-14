import { api, toApiError } from '@/controllers/CotasController'
import type { DashboardCoordenador, DashboardCotista } from '@/types/apps/dashboard-types'

export async function getDashboardCotista(): Promise<DashboardCotista> {
    try {
        const { data } = await api.get<DashboardCotista>('/api/dashboard/cotista')

        return data
    } catch (error) {
        throw toApiError(error, 'Erro ao carregar suas horas do semestre.')
    }
}

export async function getDashboardCoordenador(mes: string): Promise<DashboardCoordenador> {
    try {
        const { data } = await api.get<DashboardCoordenador>('/api/dashboard/coordenador', { params: { mes } })

        return data
    } catch (error) {
        throw toApiError(error, 'Erro ao carregar os indicadores do mês.')
    }
}
