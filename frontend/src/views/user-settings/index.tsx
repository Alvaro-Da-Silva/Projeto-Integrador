import { Suspense } from 'react'
import UserGeneral from '@/views/user-settings/general'
import { Spinner } from '@/components/ui/spinner'

const UserSettings = () => {
  return (
    <div>
      <div className='mb-4 md:mb-6 lg:mb-10'>
        <h1 className='text-xl font-bold'>Configurações da Conta</h1>
        <p className='text-muted-foreground'>Gerencie as configurações da sua conta.</p>
      </div>
      <Suspense
        fallback={
          <div className='flex items-center justify-center py-12'>
            <Spinner className='size-8' />
          </div>
        }
      >
        <UserGeneral />
      </Suspense>
    </div>
  )
}

export default UserSettings
