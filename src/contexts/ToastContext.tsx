import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastViewport, type ToastData, type ToastTone } from '../components/Toast/Toast'

const MAX_VISIBLE = 4
const DEFAULT_DURATION = 5000
const ERROR_DURATION = 7000

interface ToastOptions {
  description?: string
  /** Tempo em ms até sumir sozinho. */
  duration?: number
}

interface ToastApi {
  success: (title: string, options?: ToastOptions) => void
  error: (title: string, options?: ToastOptions) => void
  info: (title: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const nextId = useRef(0)

  const push = useCallback((tone: ToastTone, title: string, options: ToastOptions = {}) => {
    const toast: ToastData = {
      id: ++nextId.current,
      tone,
      title,
      description: options.description,
      duration: options.duration ?? (tone === 'error' ? ERROR_DURATION : DEFAULT_DURATION),
      leaving: false,
    }

    setToasts((current) => [...current, toast].slice(-MAX_VISIBLE))
  }, [])

  // Marca como "saindo" para tocar a animação de saída; o Toast avisa quando terminar.
  const dismiss = useCallback((id: number) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    )
  }, [])

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, options) => push('success', title, options),
      error: (title, options) => push('error', title, options),
      info: (title, options) => push('info', title, options),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} onRemove={remove} />
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider')
  }

  return context
}
