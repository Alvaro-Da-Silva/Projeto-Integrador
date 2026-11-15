'use client'

import { format } from 'date-fns'
import { ChevronLeftIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type Turno = 'N1' | 'N2' | 'I' | 'D'

export const TURNOS: { id: Turno; horario: string; cor: string }[] = [
  { id: 'N1', horario: '19h00 às 07h00', cor: 'bg-blue-500' },
  { id: 'N2', horario: '18h00 às 06h00', cor: 'bg-violet-500' },
  { id: 'I', horario: '07h00 às 07h00 (24h)', cor: 'bg-emerald-500' },
  { id: 'D', horario: '07h00 às 19h00', cor: 'bg-red-500' }
]

type SelectDateProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  onSelect: (turno: Turno) => void
}

export default function SelectDate({ open, onOpenChange, date, onSelect }: SelectDateProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='ghost' size='icon' aria-label='Voltar' onClick={() => onOpenChange(false)}>
              <ChevronLeftIcon className='size-5' />
            </Button>
            <DialogTitle className='text-2xl font-bold'>Dia {format(date, 'dd/MM/yyyy')}</DialogTitle>
          </div>
          <DialogDescription>Selecione o turno que deseja</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          {TURNOS.map(turno => (
            <Button
              key={turno.id}
              type='button'
              variant='outline'
              className='h-auto justify-start gap-4 rounded-xl p-4 text-left'
              onClick={() => onSelect(turno.id)}
            >
              <span aria-hidden className={cn('h-10 w-1.5 shrink-0 rounded-full', turno.cor)} />
              <span className='flex flex-col items-start gap-1'>
                <span className='text-lg font-semibold'>{turno.id}</span>
                <span className='text-muted-foreground text-sm font-normal'>{turno.horario}</span>
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}