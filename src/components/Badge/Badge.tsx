import type { ReactNode } from 'react'
import { Icon, type IconName } from '../Icon/Icon'
import './Badge.css'

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface BadgeProps {
  tone?: BadgeTone
  icon?: IconName
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon, children }: BadgeProps) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}
