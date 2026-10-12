import type { ReactNode } from 'react'
import { Icon, type IconName } from '../Icon/Icon'
import './Alert.css'

type AlertTone = 'success' | 'error'

const TONE_ICONS: Record<AlertTone, IconName> = {
  success: 'check',
  error: 'alert',
}

interface AlertProps {
  tone: AlertTone
  children: ReactNode
  onDismiss?: () => void
}

export function Alert({ tone, children, onDismiss }: AlertProps) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={TONE_ICONS[tone]} size={18} className="alert__icon" />
      <div className="alert__content">{children}</div>
      {onDismiss && (
        <button type="button" className="alert__close" onClick={onDismiss} aria-label="Fechar aviso">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  )
}
