import AuthLayout from '@/views/pages/auth/auth-layout'
import LoginForm from '@/views/pages/auth/login/login-form'

const Login = () => {
  return (
    <AuthLayout
      logoHref='/'
      eyebrow='Acesso ao sistema'
      title='Bem-vindo ao SISCOTA'
      description='Acesse sua conta para continuar'
    >
      <LoginForm />
    </AuthLayout>
  )
}

export default Login
