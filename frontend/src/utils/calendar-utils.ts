import { isSameDay } from 'date-fns'

import type { CalendarEvent, events } from '@/types/apps/calendar-types'

import { cn } from '@/lib/utils'

const EVENT_TYPES: events[] = ['etc', 'family', 'business', 'personal', 'holiday']

const LEGACY_COLOR_TO_EVENT_TYPE: Record<string, events> = {
  amber: 'family',
  violet: 'business',
  rose: 'personal',
  emerald: 'holiday',
  orange: 'family',
  sky: 'etc'
}


export function normalizeEventType(color?: string): events {
  if (color && EVENT_TYPES.includes(color as events)) {
    return color as events
  }

  return LEGACY_COLOR_TO_EVENT_TYPE[color || ''] || 'etc'
}


export function getEventColorClasses(color?: string): string {
  const eventType = normalizeEventType(color)

  switch (eventType) {
    case 'family':
      return 'bg-amber-200/50 text-amber-950/80 dark:bg-amber-400/25 dark:text-amber-200 shadow-amber-700/8'
    case 'business':
      return 'bg-violet-200/50 text-violet-950/80 dark:bg-violet-400/25 dark:text-violet-200 shadow-violet-700/8'
    case 'personal':
      return 'bg-rose-200/50 text-rose-950/80 dark:bg-rose-400/25 dark:text-rose-200 shadow-rose-700/8'
    case 'holiday':
      return 'bg-emerald-200/50 text-emerald-950/80 dark:bg-emerald-400/25 dark:text-emerald-200 shadow-emerald-700/8'
    case 'etc':
      return 'bg-sky-200/50 text-sky-950/80 dark:bg-sky-400/25 dark:text-sky-200 shadow-sky-700/8'
    default:
      return 'bg-amber-200/50 text-amber-950/80 dark:bg-amber-400/25 dark:text-amber-200 shadow-amber-700/8'
  }
}


export function getBorderRadiusClasses(isFirstDay: boolean, isLastDay: boolean): string {
  if (isFirstDay && isLastDay) {
    return 'rounded-sm'
  }

  if (isFirstDay) {
    return 'rounded-l-sm rounded-tr-none rounded-br-none'
  }

  if (isLastDay) {
    return 'rounded-r-sm rounded-tl-none rounded-bl-none'
  }

  return 'rounded-none'
}


export function getMonthViewBleedClasses(spansRight: boolean): string {
  if (!spansRight) {
    return ''
  }

  return cn(
    'overflow-visible',
    'after:absolute after:top-0 after:bottom-0 after:left-full after:z-0 after:w-[calc(0.125rem+1px+0.125rem)] after:rounded-none after:bg-inherit after:content-[""] sm:after:w-[calc(0.25rem+1px+0.25rem)]'
  )
}

export function getMonthViewEventPaddingClasses(spansLeft: boolean, spansRight: boolean): string {
  if (!spansLeft && !spansRight) {
    return 'px-1 sm:px-2'
  }

  return cn(!spansLeft && 'pl-1 sm:pl-2', !spansRight && 'pr-1 sm:pr-2', spansLeft && 'pl-0', spansRight && 'pr-0')
}


const TURNO_COLOR_CLASSES: Record<NonNullable<CalendarEvent['turno']>, string> = {
  N1: 'bg-blue-200/50 text-blue-950/80 dark:bg-blue-500/25 dark:text-blue-200 shadow-blue-700/8',
  N2: 'bg-violet-200/50 text-violet-950/80 dark:bg-violet-500/25 dark:text-violet-200 shadow-violet-700/8',
  I: 'bg-emerald-200/50 text-emerald-950/80 dark:bg-emerald-500/25 dark:text-emerald-200 shadow-emerald-700/8',
  D: 'bg-red-200/50 text-red-950/80 dark:bg-red-500/25 dark:text-red-200 shadow-red-700/8'
}

export function getEventClasses(event: CalendarEvent): string {
  return event.turno ? TURNO_COLOR_CLASSES[event.turno] : getEventColorClasses(event.color)
}

export function isMultiDayEvent(event: CalendarEvent): boolean {
  if (event.turno) return false

  const eventStart = new Date(event.start)
  const eventEnd = new Date(event.end)

  return event.allDay || eventStart.getDate() !== eventEnd.getDate()
}

export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter(event => {
      const eventStart = new Date(event.start)

      return isSameDay(day, eventStart)
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aIsMultiDay = isMultiDayEvent(a)
    const bIsMultiDay = isMultiDayEvent(b)

    if (aIsMultiDay && !bIsMultiDay) return -1
    if (!aIsMultiDay && bIsMultiDay) return 1

    return new Date(a.start).getTime() - new Date(b.start).getTime()
  })
}

export function getSpanningEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter(event => {
    if (!isMultiDayEvent(event)) return false

    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)

    return !isSameDay(day, eventStart) && (isSameDay(day, eventEnd) || (day > eventStart && day < eventEnd))
  })
}

export function getAllEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter(event => {
    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)

    if (!isMultiDayEvent(event)) return isSameDay(day, eventStart)

    return isSameDay(day, eventStart) || isSameDay(day, eventEnd) || (day > eventStart && day < eventEnd)
  })
}
