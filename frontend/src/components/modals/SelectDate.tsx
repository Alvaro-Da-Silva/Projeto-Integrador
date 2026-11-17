'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CheckIcon, ChevronLeftIcon, Trash2Icon } from 'lucide-react'

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
  date?: Date | null
  currentTurno?: Turno | null
  onSelect: (turno: Turno) => void
  onDelete?: () => void

  turnosDisponiveis?: Turno[]

  isSaving?: boolean
}

export default function SelectDate({
  open,
  onOpenChange,
  date,
  currentTurno,
  onSelect,
  onDelete,
  turnosDisponiveis,
  isSaving = false
}: SelectDateProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const displayDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()

  useEffect(() => {
    if (open) {
      setIsConfirmingDelete(false)
    }
  }, [open, date])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <Button type='button' variant='ghost' size='icon' aria-label='Voltar' onClick={() => onOpenChange(false)}>
              <ChevronLeftIcon className='size-5' />
            </Button>
            <DialogTitle className='text-2xl font-bold'>Dia {format(displayDate, 'dd/MM/yyyy')}</DialogTitle>
          </div>
          <DialogDescription>
            {currentTurno ? 'Edite o turno selecionado ou remova-o da escala' : 'Selecione o turno que deseja'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          {TURNOS.map(turno => {
            const isSelected = currentTurno === turno.id
            const isAvailable = !turnosDisponiveis || turnosDisponiveis.includes(turno.id)

            return (
              <Button
                key={turno.id}
                type='button'
                variant='outline'
                className={cn(
                  'h-auto justify-start gap-4 rounded-xl p-4 text-left transition-all',
                  isSelected && 'border-primary ring-2 ring-primary/30 bg-primary/5 hover:bg-primary/10'
                )}
                disabled={isSaving || !isAvailable}
                onClick={() => onSelect(turno.id)}
              >
                <span aria-hidden className={cn('h-10 w-1.5 shrink-0 rounded-full', turno.cor)} />
                <span className='flex flex-1 flex-col items-start gap-1'>
                  <span className='flex w-full items-center justify-between text-lg font-semibold'>
                    <span>{turno.id}</span>
                    {isSelected && (
                      <span className='inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                        <CheckIcon className='size-3.5' /> Selecionado
                      </span>
                    )}
                  </span>
                  <span className='text-muted-foreground text-sm font-normal'>
                    {turno.horario}
                    {!isAvailable && ' · não liberado neste dia'}
                  </span>
                </span>
              </Button>
            )
          })}
        </div>

        {currentTurno && onDelete && (
          <div className='mt-2 flex flex-col gap-2 pt-2 border-t'>
            {isConfirmingDelete ? (
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='flex-1'
                  onClick={() => setIsConfirmingDelete(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type='button'
                  variant='destructive'
                  className='flex-1 gap-2'
                  onClick={() => {
                    setIsConfirmingDelete(false)
                    onDelete()
                  }}
                >
                  <Trash2Icon className='size-4' />
                  <span>Confirmar exclusão</span>
                </Button>
              </div>
            ) : (
              <Button
                type='button'
                variant='outline'
                className='w-full justify-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
                onClick={() => setIsConfirmingDelete(true)}
              >
                <Trash2Icon className='size-4' />
                <span>Excluir turno</span>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
