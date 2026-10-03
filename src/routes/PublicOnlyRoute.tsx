import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Rotas de login e cadastro. Com sessão ativa, leva o usuário à listagem de
 * cápsulas, o que também faz o redirecionamento logo após autenticar.
 */
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth()

  return isAuthenticated ? <Navigate to="/capsulas" replace /> : <Outlet />
}
