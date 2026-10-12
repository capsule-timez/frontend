import type { ReactNode } from 'react'
import { AnimatedNumber } from '../AnimatedNumber/AnimatedNumber'
import { Icon } from '../Icon/Icon'
import './Hero.css'

interface HeroStat {
  label: string
  value: number
}

interface HeroProps {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
  stats?: HeroStat[]
}

export function Hero({ eyebrow, title, description, actions, stats }: HeroProps) {
  return (
    <section className="hero page-enter">
      <span className="hero__decoration" aria-hidden="true">
        <Icon name="hourglass" size={72} strokeWidth={2.5} />
      </span>

      <div className="hero__main">
        <p className="hero__eyebrow">{eyebrow}</p>
        <h1 className="hero__title">{title}</h1>
        {description && <p className="hero__description">{description}</p>}
        {actions && <div className="hero__actions">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <dl className="hero__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="hero__stat">
              <dd className="hero__stat-value">
                <AnimatedNumber value={stat.value} />
              </dd>
              <dt className="hero__stat-label">{stat.label}</dt>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
