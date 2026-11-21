'use client'

import { ExternalLinkIcon } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Desenvolvedor = {
  nome: string
  funcao: string
  github?: string 
}

export const DESENVOLVEDORES: Desenvolvedor[] = [
  { nome: 'Alvaro da Silva', funcao: 'Desenvolvedor Front-end', github: 'Alvaro-Da-Silva' },
  { nome: 'Marllon Pacheco da Silva', funcao: 'Desenvolvedor Back-end', github: 'Marllonpacheco' },
  { nome: 'Deyvit Willian Lentz', funcao: 'UI/UX', github: 'DwLentz' }
]

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''

  return (primeira + ultima).toUpperCase()
}

type CreditModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}


export default function CreditModal({ open, onOpenChange }: CreditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='gap-0 overflow-hidden p-0 sm:max-w-lg [&>button]:text-white'>
        <DialogHeader className='gap-1 bg-[#C8102E] px-6 pt-6 pb-5 text-left'>
          <p className='text-xs font-bold tracking-widest text-white/80 uppercase'>SISCOTA</p>
          <DialogTitle className='text-2xl font-bold tracking-wide text-white uppercase'>Créditos</DialogTitle>
          <DialogDescription className='text-white/90'>
            Sistema de Distribuição de Cotas de Serviço dos Bombeiros Comunitários
          </DialogDescription>
        </DialogHeader>

        <div aria-hidden className='h-1.5 bg-[#FEDD02]' />

        <div className='flex flex-col gap-4 px-6 py-5'>
          <h3 className='text-sm font-bold tracking-wide text-[#C8102E] uppercase dark:text-red-400'>
            Equipe de desenvolvimento
          </h3>

          <ul className='flex flex-col gap-3'>
            {DESENVOLVEDORES.map(dev => (
              <li key={dev.nome} className='flex items-center gap-4 rounded-xl border p-3'>
                <div
                  aria-hidden
                  className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FEDD02] text-sm font-bold text-[#2D2926]'
                >
                  {iniciais(dev.nome)}
                </div>

                <div className='min-w-0 flex-1'>
                  <p className='truncate font-semibold'>{dev.nome}</p>
                  <p className='text-muted-foreground truncate text-sm'>{dev.funcao}</p>
                </div>

                {dev.github && (
                  <a
                    href={`https://github.com/${dev.github}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={`GitHub de ${dev.nome}`}
                    className='text-muted-foreground hover:text-foreground rounded-md p-2 transition-colors'
                  >
                    <ExternalLinkIcon className='size-4' />
                  </a>
                )}
              </li>
            ))}
          </ul>

          <p className='text-muted-foreground text-sm'>
            Projeto Integrador desenvolvido para os Bombeiros Comunitários de Urussanga (CBMSC).
          </p>
        </div>

        <div className='bg-[#C8102E] px-6 py-2 text-right text-xs font-bold tracking-wide text-white uppercase'>
          Corpo de Bombeiros Militar de Santa Catarina
        </div>
      </DialogContent>
    </Dialog>
  )
}