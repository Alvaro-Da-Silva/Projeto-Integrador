// Next Imports
import Link from 'next/link'

// Third-party Imports
import { LogOutIcon, SettingsIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import LogoutModal from '../modals/LogoutModal'
import { authClient } from '@/lib/auth-client'
import { getInitialsFromName } from '@/configs/mailConfig'

const ProfileDropdown = () => {
  const [showModalLogout, setShowModalLogout] = useState(false)
  const { data:session } = authClient.useSession()

  const Initials = getInitialsFromName(session?.user?.name || '')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant='ghost' size='icon' className='relative rounded-full hover:bg-transparent' />}
      >
        <Avatar>
          {session?.user?.image ? <AvatarImage src={session.user.image} alt={session?.user?.name} /> : null}
          <AvatarFallback>{Initials}</AvatarFallback>
        </Avatar>
        <span className='ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-60'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='flex items-center gap-4 px-2 py-2.5 font-normal'>
            <div className='relative'>
              <Avatar className='size-10'>
                {session?.user?.image ? <AvatarImage src={session.user.image} alt={session?.user?.name} /> : null}
                <AvatarFallback>{Initials}</AvatarFallback>
              </Avatar>
              <span className='ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2' />
            </div>
            <div className='flex flex-1 flex-col items-start'>
              <span className='text-foreground text-base font-semibold'>{session?.user?.name || 'Usuário'}</span>
              <span className='text-muted-foreground text-xs'>{session?.user?.email || ''}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href='/pages/user-settings?setting=general' />}>
            <SettingsIcon />
            <span>Configurações</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem variant='destructive' onClick={() => setShowModalLogout(true)}>
            <LogOutIcon />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
      <LogoutModal open={showModalLogout} openChange={setShowModalLogout} />
    </DropdownMenu>
  )
}

export default ProfileDropdown
