import type { ReactNode } from 'react'

import { addDays, format, parse, set } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircleIcon, InfoIcon, RotateCwIcon } from 'lucide-react'

import type { CalendarEvent } from '@/types/apps/calendar-types'
import type { Cota } from '@/types/apps/cotas-types'
import type { Turno } from '@/components/modals/SelectDate'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { TURNOS } from '@/components/modals/SelectDate'

const HORARIOS: Record<Turno, { inicio: number; fim: number; viraDia: boolean }> = {
  D: { inicio: 7, fim: 19, viraDia: false },
  N1: { inicio: 19, fim: 7, viraDia: true },
  N2: { inicio: 18, fim: 6, viraDia: true },
  I: { inicio: 7, fim: 7, viraDia: true }
}

export function parseDateKey(dateKey: string): Date {
  return parse(dateKey, 'yyyy-MM-dd', new Date())
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDateKey(dateKey: string): string {
  return format(parseDateKey(dateKey), 'dd/MM/yyyy', { locale: ptBR })
}

export function turnoToEvent(id: string, dateKey: string, turno: Turno, title: string): CalendarEvent {
  const dia = parseDateKey(dateKey)
  const horario = HORARIOS[turno]
  const start = set(dia, { hours: horario.inicio, minutes: 0, seconds: 0, milliseconds: 0 })
  const end = set(horario.viraDia ? addDays(dia, 1) : dia, { hours: horario.fim, minutes: 0, seconds: 0, milliseconds: 0 })

  return {
    id,
    title,
    description: TURNOS.find(t => t.id === turno)?.horario,
    start,
    end,
    turno
  }
}

export function cotaToEvent(cota: Cota, title = `Turno ${cota.codigoPeriodo}`): CalendarEvent {
  return turnoToEvent(cota.id, cota.data, cota.codigoPeriodo, title)
}

type StatusAlertProps = {
  variant?: 'default' | 'destructive'
  title: string
  description?: ReactNode
  onRetry?: () => void
}

export function StatusAlert({ variant = 'default', title, description, onRetry }: StatusAlertProps) {
  return (
    <div className='px-2 pb-3 sm:px-4'>
      <Alert variant={variant}>
        {variant === 'destructive' ? <AlertCircleIcon /> : <InfoIcon />}
        <AlertTitle>{title}</AlertTitle>
        {(description || onRetry) && (
          <AlertDescription className='flex flex-wrap items-center gap-x-3 gap-y-2'>
            {description && <span>{description}</span>}
            {onRetry && (
              <Button type='button' variant='outline' size='sm' onClick={onRetry}>
                <RotateCwIcon className='size-3.5' aria-hidden='true' />
                Tentar novamente
              </Button>
            )}
          </AlertDescription>
        )}
      </Alert>
    </div>
  )
}
