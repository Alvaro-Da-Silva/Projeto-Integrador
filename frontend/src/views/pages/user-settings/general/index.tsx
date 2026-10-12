// Component Imports
import { Separator } from '@/components/ui/separator'

// Component Imports
import DangerZone from '@/views/pages/user-settings/general/danger-zone'
import ChangePassword from '@/views/pages/user-settings/general/change-password'
import ChangeEmail from './change-email'
import PersonalInfo from '@/views/pages/user-settings/general/personal-info'

const UserGeneral = () => {
  return (
    <section className='py-3'>
      <PersonalInfo />
      <Separator className='my-10' />
      <ChangePassword />
      <Separator className='my-10' />
      <ChangeEmail />
      <Separator className='my-10' />
      <DangerZone />
    </section>
  )
}

export default UserGeneral
