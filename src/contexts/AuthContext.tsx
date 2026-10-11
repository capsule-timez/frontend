import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authService } from '../services/authService'
import { authStorage } from '../services/authStorage'
import { setAuthTokenGetter, setUnauthorizedHandler } from '../services/httpClient'
import type { AuthSession, LoginPayload, RegisterPayload, User } from '../types/auth'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  /** Cria a conta e já autentica o usuário. */
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// O token é lido do storage a cada requisição, então o login/logout vale na hora.
setAuthTokenGetter(() => authStorage.load()?.token ?? null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Leitura síncrona do storage no primeiro render: evita um instante "sem
  // sessão" que redirecionaria o usuário ao login ao recarregar a página.
  const [session, setSession] = useState<AuthSession | null>(() => authStorage.load())

  const logout = useCallback(() => {
    authStorage.clear()
    setSession(null)
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const nextSession = await authService.login(payload)
    authStorage.save(nextSession)
    setSession(nextSession)
  }, [])

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await authService.register(payload)
      await login({ email: payload.email, password: payload.password })
    },
    [login],
  )

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }

  return context
}
