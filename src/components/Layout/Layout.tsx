import { NavLink, Outlet } from 'react-router-dom'
import './Layout.css'

export function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <span className="layout__brand">Cápsula do Tempo</span>
        <nav className="layout__nav">
          <NavLink to="/login" className="layout__link">
            Login
          </NavLink>
          <NavLink to="/cadastro" className="layout__link">
            Cadastro
          </NavLink>
        </nav>
      </header>
      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  )
}
