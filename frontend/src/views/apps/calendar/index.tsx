'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
  subMonths,
  subWeeks
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarCheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react'

import type { CalendarView, CalendarEvent } from '@/types/apps/calendar-types'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { DayView } from './day-view'
import { MonthView } from './month-view'
import { WeekView } from './week-view'

import { cn } from '@/lib/utils'

import { EventGap, EventHeight, WeekCellsHeight } from '@/assets/data/constants'

export interface EventCalendarProps {
  className?: string
  initialView?: CalendarView
  events?: CalendarEvent[]

  currentDate?: Date
  onCurrentDateChange?: (date: Date) => void

  onDayClick?: (date: Date) => void

  onEventClick?: (event: CalendarEvent) => void
  readOnly?: boolean

  isDayEnabled?: (date: Date) => boolean

  onCreateClick?: () => void

  createLabel?: string

  toolbar?: ReactNode

  children?: ReactNode
}

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Mês',
  week: 'Semana',
  day: 'Dia'
}

const capitalize = (str: string) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '')

const noop = () => {}

export function EventCalendar({
  className,
  initialView = 'month',
  events = [],
  currentDate: controlledDate,
  onCurrentDateChange,
  onDayClick,
  onEventClick,
  readOnly = false,
  isDayEnabled,
  onCreateClick,
  createLabel = 'Nova Escala',
  toolbar,
  children
}: EventCalendarProps) {
  const [internalDate, setInternalDate] = useState(() => new Date())
  const [view, setView] = useState<CalendarView>(initialView)

  const currentDate = controlledDate ?? internalDate
  const canCreate = !readOnly && !!onDayClick

  const setCurrentDate = (updater: (current: Date) => Date) => {
    const next = updater(currentDate)

    if (!controlledDate) setInternalDate(next)
    onCurrentDateChange?.(next)
  }

  const handleDayClick = canCreate ? onDayClick : noop
  const handleCreateClick = onCreateClick ?? (() => handleDayClick(currentDate))

  const handleEventSelect = (event: CalendarEvent) => {
    if (onEventClick) return onEventClick(event)
    handleDayClick(new Date(event.start))
  }

  const goToToday = () => setCurrentDate(() => new Date())

  const goToPrevious = () => {
    setCurrentDate(current => {
      if (view === 'month') return subMonths(current, 1)
      if (view === 'week') return subWeeks(current, 1)

      return addDays(current, -1)
    })
  }

  const goToNext = () => {
    setCurrentDate(current => {
      if (view === 'month') return addMonths(current, 1)
      if (view === 'week') return addWeeks(current, 1)

      return addDays(current, 1)
    })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          setView('month')
          break
        case 's':
        case 'w':
          setView('week')
          break
        case 'd':
          setView('day')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const viewTitle = useMemo(() => {
    if (view === 'month') {
      return capitalize(format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }))
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 })
      const end = endOfWeek(currentDate, { weekStartsOn: 0 })

      if (isSameMonth(start, end)) {
        return capitalize(format(start, "MMMM 'de' yyyy", { locale: ptBR }))
      } else {
        return `${capitalize(format(start, 'MMM', { locale: ptBR }))} - ${capitalize(format(end, "MMM 'de' yyyy", { locale: ptBR }))}`
      }
    } else if (view === 'day') {
      return (
        <>
          <span className='min-[480px]:hidden' aria-hidden='true'>
            {format(currentDate, "d 'de' MMM, yyyy", { locale: ptBR })}
          </span>
          <span className='max-[479px]:hidden md:hidden' aria-hidden='true'>
            {format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <span className='max-md:hidden'>
            {capitalize(format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }))}
          </span>
        </>
      )
    } else {
      return capitalize(format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }))
    }
  }, [currentDate, view])

  return (
    <div className='bg-card flex flex-col rounded-lg border shadow-xs'>
      <div
        className='flex flex-col has-data-[slot=month-view]:flex-1'
        style={
          {
            '--event-height': `${EventHeight}px`,
            '--event-gap': `${EventGap}px`,
            '--week-cells-height': `${WeekCellsHeight}px`
          } as React.CSSProperties
        }
      >
        <div className={cn('flex items-center justify-between gap-1 p-2 sm:p-4', className)}>
          <div className='flex items-center gap-1 max-sm:justify-between sm:gap-4'>
            <div className='flex items-center gap-1'>
              {canCreate && (
                <>
                  <Button className='max-sm:hidden md:max-lg:h-8' onClick={handleCreateClick}>
                    <PlusIcon size={16} aria-hidden='true' />
                    <span>{createLabel}</span>
                  </Button>
                  <Button size='icon-sm' className='sm:hidden' onClick={handleCreateClick} aria-label={createLabel}>
                    <PlusIcon size={16} aria-hidden='true' />
                  </Button>
                </>
              )}
              <Button variant='outline' className='max-sm:hidden md:max-lg:h-8' onClick={goToToday}>
                <CalendarCheckIcon size={16} aria-hidden='true' />
                <span>Hoje</span>
              </Button>
              <Button variant='outline' size='icon-sm' className='sm:hidden' onClick={goToToday}>
                <CalendarCheckIcon size={16} aria-hidden='true' />
              </Button>
            </div>
          </div>
          <div className='flex items-center gap-1'>
            <Button variant='ghost' size='icon-sm' onClick={goToPrevious} aria-label='Anterior'>
              <ChevronLeftIcon size={16} aria-hidden='true' />
            </Button>
            <h2 className='cbmsc-titulo text-sm sm:text-lg md:text-xl'>{viewTitle}</h2>
            <Button variant='ghost' size='icon-sm' onClick={goToNext} aria-label='Próximo'>
              <ChevronRightIcon size={16} aria-hidden='true' />
            </Button>
          </div>
          <div className='flex items-center gap-2'>
            {toolbar}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant='outline' className='max-sm:h-8!' />}>
                <span>
                  <span className='sm:hidden' aria-hidden='true'>
                    {VIEW_LABELS[view].charAt(0)}
                  </span>
                  <span className='max-sm:sr-only'>{VIEW_LABELS[view]}</span>
                </span>
                <ChevronDownIcon className='-me-1 opacity-60' size={16} aria-hidden='true' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='min-w-32'>
                <DropdownMenuItem onClick={() => setView('month')}>
                  Mês <DropdownMenuShortcut>M</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('week')}>
                  Semana <DropdownMenuShortcut>S</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView('day')}>
                  Dia <DropdownMenuShortcut>D</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {children}

        <div className='flex flex-1 flex-col'>
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              onEventCreate={handleDayClick}
              isDayEnabled={isDayEnabled}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              onEventCreate={handleDayClick}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
              onEventCreate={handleDayClick}
            />
          )}
        </div>
      </div>
    </div>
  )
}
