import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authService } from '../services/authService'
import { authStorage } from '../services/authStorage'
import { setUnauthorizedHandler } from '../services/httpClient'
import type { AuthSession, LoginPayload, RegisterPayload } from '../types/auth'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
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
