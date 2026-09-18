import { Link } from 'react-router-dom'

export function LoginPage() {
  return (
    <section>
      <h1>Login</h1>
      <p>Página de autenticação — em construção.</p>
      <p>
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </p>
    </section>
  )
}
