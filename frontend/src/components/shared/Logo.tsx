import Image from 'next/image'

import bombeiroComunitarioLogo from '@/assets/images/bombeiro-comunitario.png'

import themeConfig from '@/configs/themeConfig'

import { cn } from '@/lib/utils'

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className='grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-black/10'>
        <Image src={bombeiroComunitarioLogo} alt='Logomarca do Bombeiro Comunitário' sizes='36px' className='size-[86%] object-contain' />
      </span>
      <span className='text-xl font-black tracking-wide'>{themeConfig.templateName}</span>
    </div>
  )
}

export default Logo
