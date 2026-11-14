import { EllipsisVerticalIcon, MailIcon, UserPlus2Icon, UserRoundCheckIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

const connectionCardActions = ['Share', 'Block', 'Delete']
const connectionCards = [
  {
    id: '1',
    avatar: '',
    initials: 'JD',
    name: 'John Doe',
    role: 'Developer',
    tags: [{ label: 'React' }, { label: 'Node' }],
    stats: { projects: 12, tasks: 45, connections: 890 },
    isConnected: true
  },
  {
    id: '2',
    avatar: '',
    initials: 'MS',
    name: 'Maria Smith',
    role: 'Designer',
    tags: [{ label: 'Figma' }, { label: 'UI' }],
    stats: { projects: 8, tasks: 32, connections: 450 },
    isConnected: false
  }
]

function ConnectionsCard() {
  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
      {connectionCards.map(connection => (
        <Card
          key={connection.id}
          className='relative flex flex-col items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-md'
        >
          <div className='absolute top-4 right-4 z-10'>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant='ghost' size='icon' className='text-muted-foreground size-8 rounded-full' />}
              >
                <EllipsisVerticalIcon className='size-4' />
                <span className='sr-only'>Open {connection.name} actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44'>
                <DropdownMenuGroup>
                  {connectionCardActions.map(action => (
                    <DropdownMenuItem key={action} variant={action === 'Delete' ? 'destructive' : 'default'}>
                      {action}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardContent>
            <Avatar className='size-25'>
              {connection.avatar ? <AvatarImage src={connection.avatar} alt={connection.name} /> : null}
              <AvatarFallback>{connection.initials}</AvatarFallback>
            </Avatar>
          </CardContent>

          <CardContent className='text-center'>
            <h3 className='text-xl font-medium'>{connection.name}</h3>
            <p className='text-muted-foreground text-base'>{connection.role}</p>
          </CardContent>

          <CardContent className='flex flex-wrap items-center justify-center gap-2'>
            {connection.tags.map(tag => (
              <Badge key={`${connection.id}-${tag.label}`} variant='outline' className='h-6 px-3 py-1'>
                {tag.label}
              </Badge>
            ))}
          </CardContent>

          <CardContent className='flex w-full items-center justify-evenly gap-4'>
            <div className='text-center'>
              <p className='text-lg font-medium'>{connection.stats.projects}</p>
              <p className='text-muted-foreground text-base'>Projects</p>
            </div>
            <Separator orientation='vertical' />
            <div className='text-center'>
              <p className='text-lg font-medium'>{connection.stats.tasks}</p>
              <p className='text-muted-foreground text-base'>Tasks</p>
            </div>
            <Separator orientation='vertical' />
            <div className='text-center'>
              <p className='text-lg font-medium'>{connection.stats.connections}</p>
              <p className='text-muted-foreground text-base'>Connections</p>
            </div>
          </CardContent>

          <CardContent className='flex items-center gap-4'>
            <Button variant={connection.isConnected ? 'default' : 'outline'}>
              {connection.isConnected ? <UserRoundCheckIcon /> : <UserPlus2Icon />}
              {connection.isConnected ? 'Connected' : 'Connect'}
            </Button>
            <Button variant='outline' size='icon'>
              <MailIcon />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default ConnectionsCard
