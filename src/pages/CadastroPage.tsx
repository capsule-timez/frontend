import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard/AuthCard'
import { FormField } from '../components/FormField/FormField'
import { useAuth } from '../hooks/useAuth'
import { getApiError } from '../services/apiError'
import type { ApiError } from '../services/apiError'

export function CadastroPage() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Cria a conta e autentica; o PublicOnlyRoute redireciona para a listagem.
      await register({ name, email, password })
    } catch (err) {
      setError(getApiError(err))
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Criar conta"
      footer={
        <>
          Já tem conta? <Link to="/login">Fazer login</Link>
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
          label="Nome"
          type="text"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={error?.fieldErrors.name}
        />
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
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error?.fieldErrors.password}
        />
        <button className="auth-card__submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
    </AuthCard>
  )
}
