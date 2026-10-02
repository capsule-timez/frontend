import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Layout.css'

export function Layout() {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="layout">
      <header className="layout__header">
        <span className="layout__brand">Cápsula do Tempo</span>
        <nav className="layout__nav">
          {isAuthenticated ? (
            <>
              <NavLink to="/capsulas" end className="layout__link">
                Minhas cápsulas
              </NavLink>
              <NavLink to="/capsulas/nova" className="layout__link">
                Nova cápsula
              </NavLink>
              <span className="layout__user">{user?.name}</span>
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
