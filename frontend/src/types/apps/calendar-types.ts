export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay?: boolean
  color?: events
  location?: string
  turno?: 'N1' | 'N2' | 'I' | 'D'
}

export type events = 'family' | 'business' | 'personal' | 'holiday' | 'etc'

export type EventColor = events
