import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Icon } from '../Icon/Icon'
import { Logo } from '../Logo/Logo'
import './Layout.css'

export function Layout() {
  const { isAuthenticated, user, logout } = useAuth()
  const toast = useToast()

  function handleLogout() {
    const firstName = user?.name.split(' ')[0]
    logout()
    toast.info('Você saiu da conta', { description: firstName ? `Até logo, ${firstName}!` : undefined })
  }

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__header-inner">
          <Link to="/" className="layout__brand" aria-label="Cápsula do Tempo, ir para o início">
            <Logo />
          </Link>
          <nav className="layout__nav" aria-label="Principal">
            {isAuthenticated ? (
              <>
                <NavLink to="/capsulas" end className="layout__link">
                  Minhas cápsulas
                </NavLink>
                <NavLink to="/capsulas/nova" className="layout__link">
                  <Icon name="plus" size={15} />
                  Nova cápsula
                </NavLink>
                <span className="layout__user">
                  <span className="layout__avatar" aria-hidden="true">
                    {user?.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="layout__user-name">{user?.name}</span>
                </span>
                <button type="button" className="layout__logout" onClick={handleLogout}>
                  Sair
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="layout__link">
                  Entrar
                </NavLink>
                <NavLink to="/cadastro" className="layout__link layout__link--cta">
                  Criar conta
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  )
}
