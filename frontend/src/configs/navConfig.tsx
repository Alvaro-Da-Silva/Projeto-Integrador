// Third-party Imports
import type * as Icon from 'lucide-react'

type IconName = keyof typeof Icon

export type MenuLeafSubItem = {
  label: string
  href: string
  activePath?: string
  badge?: string
  badgeClassName?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
}

export type MenuGroupSubItem = {
  label: string
  childItems: MenuLeafSubItem[]
}

export type MenuSubItem = MenuLeafSubItem | MenuGroupSubItem

export type MenuItem = {
  icon: IconName
  label: string
  roles?: string[] 
} & (
  | {
      href: string
      badge?: string
      badgeClassName?: string
      childItems?: never
      target?: '_blank' | '_self' | '_parent' | '_top'
    }
  | {
      href?: never
      badge?: string
      badgeClassName?: string
      childItems: MenuSubItem[]
    }
)

export type NavItem = {
  groupLabel?: string
  items: MenuItem[]
}

export const navItems: NavItem[] = [
  {
    groupLabel: 'Dashboard & Layouts',
    items: [
      {
        icon: 'LayoutDashboardIcon',
        label: 'Dashboard',
        href: '/'
      },
      {
        icon: 'CalendarIcon',
        label: 'Solicitações',
        href: '/solicitacoes'
      },
      {
        icon: 'CalendarIcon',
        label: 'Distribuição definitiva',
        href: '/definitiva'
      },
      {
        icon: 'UsersIcon',
        label: 'Usuários',
        href: '/users',
        roles: ['admin']
      }
    ]
  }
]

const podeVer = (roles: string[] | undefined, userRole?: string | null) =>
  !roles || roles.some(r => (userRole ?? 'user').split(',').map(s => s.trim()).includes(r))

export function filtrarMenu(items: NavItem[], userRole?: string | null): NavItem[] {
  return items
    .map(grupo => ({ ...grupo, items: grupo.items.filter(item => podeVer(item.roles, userRole)) }))
    .filter(grupo => grupo.items.length > 0)
}