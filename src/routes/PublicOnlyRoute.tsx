import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Rotas de login e cadastro. Com sessão ativa, leva o usuário à listagem de
 * cápsulas ou de volta ao convite aberto antes de autenticar.
 */
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth()

  const { state } = useLocation()
  const returnTo: unknown = state?.returnTo
  const destination = typeof returnTo === 'string' && /^\/convite\/[^/\\?#]+$/.test(returnTo)
    ? returnTo
    : '/capsulas'

  return isAuthenticated ? <Navigate to={destination} replace /> : <Outlet />
}
