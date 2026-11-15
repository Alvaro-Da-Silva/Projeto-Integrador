import { authClient } from "@/lib/auth-client";
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
    const { data, error } = await authClient.admin.listUsers({
        query: {
            limit: pageSize,
            offset: (page - 1) * pageSize,
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
    const total = data?.total ?? 0

    return { users, total }
}

export async function banUser(userId: string): Promise<AppUser> {
    const { data, error } = await authClient.admin.banUser({ userId })

    if (error || !data?.user) {
        throw new Error(error?.message ?? 'Erro ao suspender usuário')
    }

    return mapApiUserToAppUser(data.user as User)
}

export async function unbanUser(userId: string): Promise<AppUser> {
    const { data, error } = await authClient.admin.unbanUser({ userId })

    if (error || !data?.user) {
        throw new Error(error?.message ?? 'Erro ao ativar usuário')
    }

    return mapApiUserToAppUser(data.user as User)
}

export type UpdateUserPayload = {
    name?: string
    patent?: string | null
    role?: UserRole
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<AppUser> {
    // Update role via better-auth admin plugin if provided
    if (payload.role) {
        const { error: roleError } = await authClient.admin.setRole({ userId, role: payload.role })
        if (roleError) {
            throw new Error(roleError.message ?? 'Erro ao atualizar função do usuário')
        }
    }

    // Update name and/or patent via better-auth admin updateUser
    const fieldsToUpdate: Record<string, unknown> = {}
    if (payload.name !== undefined) fieldsToUpdate.name = payload.name
    if (payload.patent !== undefined) fieldsToUpdate.patent = payload.patent

    if (Object.keys(fieldsToUpdate).length > 0) {
        const { error: updateError } = await authClient.admin.updateUser({
            userId,
            data: fieldsToUpdate
        })

        if (updateError) {
            throw new Error(updateError.message ?? 'Erro ao atualizar usuário')
        }
    }

    // Fetch updated user list to return the updated record
    const result = await authClient.admin.listUsers({ query: { limit: 100 } })
    const updatedRaw = result.data?.users?.find(u => u.id === userId)

    if (!updatedRaw) {
        throw new Error('Usuário não encontrado após atualização')
    }

    return mapApiUserToAppUser(updatedRaw as User)
}
