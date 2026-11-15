// Next Imports
import Link from 'next/link'

const Footer = () => {
  return (
    <footer>
      <div className='text-muted-foreground mx-auto flex size-full max-w-360 items-center justify-between gap-3 px-4 py-3 max-sm:flex-col sm:gap-6 sm:px-6'>
        <p className='text-sm text-balance max-sm:text-center'>
          {`©${new Date().getFullYear()}`}{' '}
          <Link href='' target='_blank' className='text-primary hover:underline'>
            SISCOTA
          </Link>
        </p>
        <div className='flex items-center gap-5 max-sm:hidden'>
          <Link
            href='https://shadcnstudio.com/license'
            target='_blank'
            className='text-muted-foreground hover:text-foreground text-sm transition duration-300'
          >
            Créditos 
          </Link>
          <Link
            href='https://shadcnstudio.com/docs/documentation-admin/getting-started'
            target='_blank'
            className='text-muted-foreground hover:text-foreground text-sm transition duration-300'
          >
            Documentação 
          </Link>
          <Link
            href='https://shadcnstudio.com/support'
            target='_blank'
            className='text-muted-foreground hover:text-foreground text-sm transition duration-300'
          >
            Suporte 
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
