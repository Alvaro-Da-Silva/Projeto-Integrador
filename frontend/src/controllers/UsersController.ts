import { authClient } from "@/lib/auth-client";
import { api, toApiError } from "@/controllers/CotasController";
import type { AppUser, UserBilling, UserFilters, UserPlan, UserRole, UserSorting, UserStatus } from "@/types/apps/user-types";

export type User = {
    id: string
    name: string
    email: string
    image?: string | null
    role?: string | null
    banned?: boolean | null
    createdAt: Date | string
    patent?: string | null
}

export type GetUsersResult = {
    users: AppUser[]
    total: number
}

const VALID_ROLES: UserRole[] = ['user', 'admin']

const MAX_USERS_STATUS_FILTER = 1000

const SORT_FIELDS: Record<UserSorting['id'], string> = {
    user: 'name',
    patent: 'patent',
    role: 'role',
    status: 'banned',
    joinedDate: 'createdAt',
    plan: "",
    billing: ""
}

function toUserRole(role?: string | null): UserRole {
    if (role && VALID_ROLES.includes(role as UserRole)) {
        return role as UserRole
    }

    return 'user' 
}

function toUserStatus(banned?: boolean | null): UserStatus {
    return banned ? 'Suspenso' : 'Ativo'
}

function mapApiUserToAppUser(user: User): AppUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.image ?? undefined,
        patent: user.patent ?? undefined,
        role: toUserRole(user.role),
        plan: 'Basic' as UserPlan,
        status: toUserStatus(user.banned),
        billing: 'Manual' as UserBilling,
        joinedDate: typeof user.createdAt === 'string'
            ? user.createdAt
            : user.createdAt.toISOString()
    }
}

export async function getUsers(
    filters: UserFilters,
    sorting: UserSorting | null,
    page: number,
    pageSize: number
): Promise<GetUsersResult> {
    const filtrarStatus = filters.status !== 'all'

    const { data, error } = await authClient.admin.listUsers({
        query: {
            ...(filtrarStatus
                ? { limit: MAX_USERS_STATUS_FILTER }
                : { limit: pageSize, offset: (page - 1) * pageSize }),
            sortBy: sorting ? SORT_FIELDS[sorting.id] : 'name',
            sortDirection: sorting?.desc ? 'desc' : 'asc',
            ...(filters.search && {
                searchValue: filters.search,
                searchField: 'name',
                searchOperator: 'contains'
            }),
            ...(filters.role !== 'all' && {
                filterField: 'role',
                filterValue: filters.role,
                filterOperator: 'contains'
            })
        }
    })

    if (error) {
        throw new Error(error.message ?? 'Erro ao buscar usuários')
    }

    const users = (data?.users ?? []).map(u => mapApiUserToAppUser(u as User))

    if (filtrarStatus) {
        const filtrados = users.filter(u => u.status === filters.status)
        const inicio = (page - 1) * pageSize

        return { users: filtrados.slice(inicio, inicio + pageSize), total: filtrados.length }
    }

    return { users, total: data?.total ?? 0 }
}

// Alterações de identidade passam pelo backend, que grava a conta Better Auth e o usuário
// SISCOTA (perfil/cotista) na mesma transação. O /api/auth/admin do Next só permite listar.

function contaPath(userId: string, sufixo = ''): string {
    return `/api/usuarios/conta/${encodeURIComponent(userId)}${sufixo}`
}

export async function banUser(userId: string): Promise<AppUser> {
    try {
        const { data } = await api.post<User>(contaPath(userId, '/suspensao'))

        return mapApiUserToAppUser(data)
    } catch (error) {
        throw toApiError(error, 'Erro ao suspender usuário')
    }
}

export async function unbanUser(userId: string): Promise<AppUser> {
    try {
        const { data } = await api.post<User>(contaPath(userId, '/reativacao'))

        return mapApiUserToAppUser(data)
    } catch (error) {
        throw toApiError(error, 'Erro ao ativar usuário')
    }
}

export type UpdateUserPayload = {
    name?: string
    patent?: string | null
    role?: UserRole
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<AppUser> {
    try {
        const { data } = await api.patch<User>(contaPath(userId), {
            ...(payload.name !== undefined && { nome: payload.name }),
            ...(payload.patent !== undefined && { patente: payload.patent }),
            ...(payload.role !== undefined && { role: payload.role })
        })

        return mapApiUserToAppUser(data)
    } catch (error) {
        throw toApiError(error, 'Erro ao atualizar usuário')
    }
}

export type CreateUserPayload = {
    nome: string
    email: string
    senha: string
    patente: string
    perfil: 'admin' | 'cotista'
    telefone?: string
    dataNascimento?: string
}

export async function createUser(payload: CreateUserPayload): Promise<AppUser> {
    try {
        const { data } = await api.post<User>('/api/usuarios', payload)

        return mapApiUserToAppUser(data)
    } catch (error) {
        throw toApiError(error, 'Erro ao cadastrar usuário')
    }
}
