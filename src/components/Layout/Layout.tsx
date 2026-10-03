import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import './Layout.css'

export function Layout() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="layout">
      <header className="layout__header">
        <span className="layout__brand">Cápsula do Tempo</span>
        <nav className="layout__nav">
          {isAuthenticated ? (
            <>
              <span className="layout__user">{user?.name}</span>
              <button type="button" className="layout__link layout__logout" onClick={logout}>
                Sair
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="layout__link">
                Login
              </NavLink>
              <NavLink to="/cadastro" className="layout__link">
                Cadastro
              </NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  )
}
