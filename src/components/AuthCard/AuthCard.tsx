import type { ReactNode } from 'react'
import './AuthCard.css'

interface AuthCardProps {
  title: string
  children: ReactNode
  footer: ReactNode
}

/** Estrutura visual compartilhada pelas telas de login e cadastro. */
export function AuthCard({ title, children, footer }: AuthCardProps) {
  return (
    <section className="auth-card">
      <h1 className="auth-card__title">{title}</h1>
      {children}
      <p className="auth-card__footer">{footer}</p>
    </section>
  )
}
