import { createContext, useContext, type ReactNode } from 'react'
import { setAuthTokenGetter } from '../services/httpClient'

export interface AuthUser {
  name: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
}

// Login mockado: enquanto o fluxo real de autenticação não existe, a sessão é
// fixa no usuário de teste do backend (scripts/createTestUser.ts) e o JWT vem
// de VITE_MOCK_ACCESS_TOKEN. Para o login real, só este provider muda.
const MOCK_USER: AuthUser = {
  name: 'Usuário de Teste',
  email: 'teste@capsuletimez.com',
}

const MOCK_TOKEN = import.meta.env.VITE_MOCK_ACCESS_TOKEN || null

const mockSession: AuthContextValue = {
  user: MOCK_USER,
  token: MOCK_TOKEN,
  isAuthenticated: true,
}

setAuthTokenGetter(() => mockSession.token)

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={mockSession}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }

  return context
}
