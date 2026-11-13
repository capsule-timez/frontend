import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()

  const { pathname } = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ returnTo: pathname }} replace />
  }

  return <Outlet />
}
