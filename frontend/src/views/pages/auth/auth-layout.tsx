import type { CSSProperties, ReactNode } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { ShieldCheckIcon } from 'lucide-react'

import bombeiroComunitarioLogo from '@/assets/images/bombeiro-comunitario.png'

import { cn } from '@/lib/utils'

const brandBackground: CSSProperties = {
  backgroundImage:
    'radial-gradient(120% 80% at 50% 45%, #E5132F 0%, #C8102E 38%, #9E0C24 75%, #7A0A1C 100%)'
}

const stripeBackground: CSSProperties = {
  backgroundImage: 'linear-gradient(90deg, #F08A00 0%, #FEDD02 14%, #FFE81F 50%, #FEDD02 86%, #F08A00 100%)'
}

const backgroundLayer: CSSProperties = { zIndex: 0 }
const textLayer: CSSProperties = { zIndex: 10 }

const emergencyFont: CSSProperties = {
  fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
}

type BrandSealProps = {
  className?: string
  href?: string
  priority?: boolean
}

const BrandSeal = ({ className, href, priority }: BrandSealProps) => {
  const seal = (
    <span
      className={cn(
        'relative grid aspect-square place-items-center overflow-hidden rounded-full bg-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] ring-1 ring-black/10',
        className
      )}
    >
      <Image
        src={bombeiroComunitarioLogo}
        alt='Logomarca do Bombeiro Comunitário'
        priority={priority}
        sizes='(min-width: 1536px) 280px, (min-width: 1024px) 220px, 128px'
        className='size-[86%] object-contain'
      />
    </span>
  )

  if (!href) return seal

  return (
    <Link href={href} aria-label='Ir para a página inicial' className='block rounded-full focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:outline-none'>
      {seal}
    </Link>
  )
}

const BrandStripes = ({ className }: { className?: string }) => {
  return (
    <div className={cn('pointer-events-none flex flex-col', className)} aria-hidden>
      <div className='h-(--stripe-lg) shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)]' style={stripeBackground} />
      <div className='h-(--stripe-gap)' />
      <div className='h-(--stripe-sm) shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)]' style={stripeBackground} />
    </div>
  )
}

const Watermark = ({ className }: { className?: string }) => {
  return (
    <Image
      src={bombeiroComunitarioLogo}
      alt=''
      aria-hidden
      sizes='720px'
      className={cn('pointer-events-none absolute select-none mix-blend-multiply', className)}
    />
  )
}

const BrandPanel = ({ logoHref }: { logoHref?: string }) => {
  return (
    <aside
      className='relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between [--stripe-gap:1.25rem] [--stripe-lg:6rem] [--stripe-sm:2.75rem] xl:[--stripe-lg:6.75rem] xl:[--stripe-sm:3rem]'
      style={brandBackground}
    >
      <Watermark className='-right-40 -bottom-40 size-[46rem] opacity-25' />

      <div className='relative z-1 flex items-center gap-2 px-10 pt-10 xl:px-14 xl:pt-12'>
        <ShieldCheckIcon className='size-4 text-[#FEDD02]' />
        <span className='text-xs font-semibold tracking-[0.2em] text-white/85 uppercase'>
          Acesso restrito · Uso institucional
        </span>
      </div>

      <div className='relative z-1'>
        <div className='relative'>
          <BrandStripes />

          <div className='absolute inset-y-0 left-10 flex items-center xl:left-14' style={backgroundLayer}>
            <BrandSeal href={logoHref} priority className='size-52 xl:size-60 2xl:size-68' />
          </div>

          <div className='pointer-events-none absolute inset-0 flex flex-col pl-68 xl:pl-82 2xl:pl-90' style={textLayer}>
            <p className='flex h-(--stripe-lg) items-center text-5xl font-black tracking-wide text-[#2D2926] xl:text-6xl'>
              SISCOTA
            </p>
            <div className='h-(--stripe-gap)' />
            <p className='flex h-(--stripe-sm) items-center pr-6 text-[0.625rem] leading-tight font-extrabold tracking-[0.08em] text-[#2D2926] uppercase xl:text-xs'>
              Corpo de Bombeiros Militar de Santa Catarina
            </p>
          </div>
        </div>

        <p
          className='relative max-w-md px-10 text-lg leading-relaxed text-white/90 xl:px-14'
          style={{ ...textLayer, marginTop: '5rem' }}
        >
          Sistema de Distribuição de Cotas de Serviço dos{' '}
          <span className='font-semibold text-white'>Bombeiros Comunitários</span>.
        </p>
      </div>

      <div className='relative z-1 flex items-end justify-between gap-6 px-10 pb-10 xl:px-14 xl:pb-12'>
        <p className='max-w-56 text-xs leading-relaxed text-white/70'>
          Gestão das escalas e cotas operacionais com organização, transparência e segurança.
        </p>
        <div className='text-right leading-none text-[#FEDD02] drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]' style={emergencyFont}>
          <span className='block text-lg tracking-wide'>EMERGÊNCIA</span>
          <span className='block text-6xl'>193</span>
        </div>
      </div>
    </aside>
  )
}

const MobileBrandHeader = ({ logoHref }: { logoHref?: string }) => {
  return (
    <header
      className='relative overflow-hidden px-4 pt-6 pb-8 text-white lg:hidden [--stripe-gap:0.625rem] [--stripe-lg:2.75rem] [--stripe-sm:1.25rem]'
      style={brandBackground}
    >
      <Watermark className='-right-24 -bottom-28 size-80 opacity-25' />

      <div className='relative z-1 flex flex-col items-center gap-4'>
        <div className='relative w-full'>
          <BrandStripes className='-mx-4' />
          <div className='absolute inset-0 flex items-center justify-center' style={backgroundLayer}>
            <BrandSeal href={logoHref} priority className='size-28 sm:size-32' />
          </div>
        </div>

        <div className='relative text-center' style={{ ...textLayer, marginTop: '0.5rem' }}>
          <p className='text-2xl font-black tracking-wide'>SISCOTA</p>
          <p className='mt-1 text-[0.6875rem] font-semibold tracking-[0.12em] text-white/80 uppercase'>
            Corpo de Bombeiros Militar de Santa Catarina
          </p>
        </div>
      </div>
    </header>
  )
}

type AuthLayoutProps = {
  eyebrow: string
  title: string
  description: ReactNode
  children: ReactNode
  topSlot?: ReactNode
  logoHref?: string
}

const AuthLayout = ({ eyebrow, title, description, children, topSlot, logoHref }: AuthLayoutProps) => {
  return (
    <div className='flex min-h-screen w-full flex-1 flex-col bg-background [--auth-accent:#C8102E] [--primary-foreground:#FFFFFF] [--primary:#C8102E] [--ring:#C8102E] lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] dark:[--auth-accent:#FF6B7A]'>
      <BrandPanel logoHref={logoHref} />
      <MobileBrandHeader logoHref={logoHref} />

      <div className='relative flex min-w-0 flex-1 flex-col overflow-hidden'>
        <Watermark className='-top-32 -right-32 hidden size-[30rem] opacity-[0.05] grayscale lg:block dark:hidden' />

        <div className='relative z-1 hidden items-center gap-4 px-10 pt-8 lg:flex xl:px-14'>
          <span className='text-[0.6875rem] font-bold tracking-[0.18em] text-(--auth-accent) uppercase'>
            SISCOTA · Bombeiro Comunitário
          </span>
          <span className='h-px flex-1 bg-(--auth-accent)/40' />
        </div>

        <main className='relative z-1 flex flex-1 items-start justify-center px-4 pt-8 pb-12 sm:px-8 sm:pt-12 lg:items-center lg:px-10 lg:py-10'>
          <div className='w-full max-w-md'>
            {topSlot}

            <div className='mb-8'>
              <p className='mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-(--auth-accent) uppercase'>
                <span className='h-0.5 w-6 rounded-full bg-(--auth-accent)' />
                {eyebrow}
              </p>
              <h1 className='text-3xl font-bold tracking-tight text-foreground'>{title}</h1>
              <p className='mt-2 text-base leading-relaxed text-muted-foreground'>{description}</p>
            </div>

            {children}
          </div>
        </main>

        <footer className='relative z-1 bg-[#C8102E] px-6 py-2.5 text-right text-[0.6875rem] font-bold tracking-wider text-white uppercase'>
          Corpo de Bombeiros Militar de Santa Catarina
        </footer>
      </div>
    </div>
  )
}

export default AuthLayout
