import type { AuthSession } from '../types/auth'

const STORAGE_KEY = 'capsula:auth'

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false

  const { token, user } = value as Partial<Record<keyof AuthSession, unknown>>

  return (
    typeof token === 'string' &&
    token !== '' &&
    typeof user === 'object' &&
    user !== null &&
    typeof (user as { name?: unknown }).name === 'string'
  )
}

/**
 * Persiste a sessão no localStorage para que sobreviva ao recarregamento da
 * página. O acesso ao storage pode falhar (modo privado, cota, dado corrompido),
 * então qualquer erro é tratado como "sem sessão".
 */
export const authStorage = {
  load(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null

      const parsed: unknown = JSON.parse(raw)
      return isAuthSession(parsed) ? parsed : null
    } catch {
      return null
    }
  },

  save(session: AuthSession): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      // Sem persistência: a sessão vale apenas até o próximo recarregamento.
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nada a limpar se o storage estiver indisponível.
    }
  },
}
