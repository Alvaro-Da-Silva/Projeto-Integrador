import AboutSection from '@/views/pages/user-profile/profile/about-section'
import { ActivityTimeline } from '@/views/pages/user-profile/profile/activity-timeline'
import Connections from '@/views/pages/user-profile/profile/connections'
import ProfileProjectDatatable from '@/views/pages/user-profile/profile/profile-project-datatable'
import Teams from '@/views/pages/user-profile/profile/teams'

import type { UserActivityItem } from '@/types/pages/user-profile-types'

const activityLog: UserActivityItem[] = [
  {
    id: '1',
    description: 'Client Meeting',
    timestamp: 'Today',
    detail: 'Project discussion with client.'
  }
]

function Profile() {
  return (
    <div className='grid grid-cols-12 gap-6'>
      <div className='col-span-12 space-y-6 lg:col-span-4'>
        <AboutSection />
      </div>

      <div className='col-span-12 lg:col-span-8'>
        <div className='grid grid-cols-12 gap-6'>
          <ActivityTimeline activityLog={activityLog} className='col-span-12' />
          <Connections className='col-span-12 lg:col-span-6' />
          <Teams className='col-span-12 lg:col-span-6' />
          <ProfileProjectDatatable className='col-span-12' />
        </div>
      </div>
    </div>
  )
}

export default Profile
