import type { ReactNode } from 'react'
import { Logo } from '../Logo/Logo'
import './AuthCard.css'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer: ReactNode
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <section className="auth-card page-enter">
      <div className="auth-card__brand">
        <Logo withText={false} />
      </div>
      <h1 className="auth-card__title">{title}</h1>
      {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
      {children}
      <p className="auth-card__footer">{footer}</p>
    </section>
  )
}
