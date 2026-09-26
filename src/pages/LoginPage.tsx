import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard/AuthCard'
import { FormField } from '../components/FormField/FormField'
import { useAuth } from '../hooks/useAuth'
import { getApiError } from '../services/apiError'
import type { ApiError } from '../services/apiError'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Ao autenticar, o PublicOnlyRoute redireciona para a listagem.
      await login({ email, password })
    } catch (err) {
      setError(getApiError(err))
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Entrar"
      footer={
        <>
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </>
      }
    >
      <form className="auth-card__form" onSubmit={handleSubmit}>
        {error && (
          <p className="auth-card__alert" role="alert">
            {error.message}
          </p>
        )}
        <FormField
          label="E-mail"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error?.fieldErrors.email}
        />
        <FormField
          label="Senha"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error?.fieldErrors.password}
        />
        <button className="auth-card__submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </AuthCard>
  )
}
