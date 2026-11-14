import {
  CheckCheckIcon,
  CheckIcon,
  FlagIcon,
  LanguagesIcon,
  LayoutGridIcon,
  type LucideIcon,
  MailIcon,
  MessagesSquareIcon,
  PhoneIcon,
  StarIcon,
  UserIcon
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

type AboutItem = {
  label: string
  value: string
  icon?: LucideIcon
}

const profileSections = [
  {
    title: 'About',
    items: [
      { label: 'Full Name', value: 'John Doe', icon: UserIcon },
      { label: 'Status', value: 'Active', icon: CheckCheckIcon },
      { label: 'Role', value: 'Developer', icon: StarIcon },
      { label: 'Country', value: 'USA', icon: FlagIcon },
      { label: 'Language', value: 'English', icon: LanguagesIcon }
    ]
  },
  {
    title: 'Contacts',
    items: [
      { label: 'Contact', value: '(123) 456-7890', icon: PhoneIcon },
      { label: 'Skype', value: 'john.doe', icon: MessagesSquareIcon },
      { label: 'Email', value: 'john@example.com', icon: MailIcon }
    ]
  }
]

const overviewSections = [
  {
    title: 'Overview',
    items: [
      { label: 'Task Compiled', value: '13.5k', icon: CheckIcon },
      { label: 'Connections', value: '897', icon: UserIcon },
      { label: 'Projects Compiled', value: '146', icon: LayoutGridIcon }
    ]
  }
]

function AboutSection() {
  return (
    <div className='space-y-6'>
      <Card>
        <CardContent className='space-y-5'>
          {profileSections.map(section => (
            <div className='space-y-2' key={section.title}>
              <p className='text-muted-foreground text-xs font-medium uppercase'>{section.title}</p>
              <ul className='space-y-3'>
                {section.items.map(item => {
                  const Icon = item.icon

                  return (
                    <li className='flex items-center gap-2' key={item.label}>
                      {Icon ? <Icon className='size-4' /> : null}
                      <span className='text-sm font-medium'>{item.label}:</span>
                      <span className='text-sm'>{item.value}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className='space-y-5'>
          {overviewSections.map(section => (
            <div className='space-y-2' key={section.title}>
              <p className='text-muted-foreground text-xs font-medium uppercase'>{section.title}</p>
              <ul className='space-y-3'>
                {section.items.map(item => {
                  const Icon = item.icon

                  return (
                    <li className='flex items-center gap-2' key={item.label}>
                      {Icon ? <Icon className='size-4' /> : null}
                      <span className='text-sm font-medium'>{item.label}:</span>
                      <span className='text-sm'>{item.value}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default AboutSection
