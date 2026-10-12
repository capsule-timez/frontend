import { useEffect, useRef, type AnimationEvent } from 'react'
import { Icon, type IconName } from '../Icon/Icon'
import './Toast.css'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastData {
  id: number
  tone: ToastTone
  title: string
  description?: string
  duration: number
  leaving: boolean
}

const TONE_ICONS: Record<ToastTone, IconName> = {
  success: 'check',
  error: 'alert',
  info: 'hourglass',
}

interface ToastItemProps {
  toast: ToastData
  onDismiss: (id: number) => void
  onRemove: (id: number) => void
}

function ToastItem({ toast, onDismiss, onRemove }: ToastItemProps) {
  const { id, duration, leaving } = toast
  const timer = useRef<number | undefined>(undefined)
  const remaining = useRef(duration)
  const startedAt = useRef(0)

  function start() {
    startedAt.current = Date.now()
    timer.current = window.setTimeout(() => onDismiss(id), remaining.current)
  }

  function pause() {
    window.clearTimeout(timer.current)
    remaining.current -= Date.now() - startedAt.current
  }

  useEffect(() => {
    if (leaving) return
    start()
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (leaving && event.target === event.currentTarget) onRemove(id)
  }

  return (
    <div
      className={`toast toast--${toast.tone}${leaving ? ' toast--leaving' : ''}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      style={{ '--toast-duration': `${duration}ms` } as React.CSSProperties}
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
      onAnimationEnd={handleAnimationEnd}
    >
      <span className="toast__icon">
        <Icon name={TONE_ICONS[toast.tone]} size={18} strokeWidth={2.5} />
      </span>
      <div className="toast__body">
        <p className="toast__title">{toast.title}</p>
        {toast.description && <p className="toast__description">{toast.description}</p>}
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(id)}
        aria-label="Fechar notificação"
      >
        <Icon name="close" size={16} />
      </button>
      <span className="toast__progress" aria-hidden="true" />
    </div>
  )
}

interface ToastViewportProps {
  toasts: ToastData[]
  onDismiss: (id: number) => void
  onRemove: (id: number) => void
}

export function ToastViewport({ toasts, onDismiss, onRemove }: ToastViewportProps) {
  return (
    <section className="toast-viewport" aria-label="Notificações">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} onRemove={onRemove} />
      ))}
    </section>
  )
}
