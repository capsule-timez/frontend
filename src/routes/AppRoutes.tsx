import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { CadastroPage } from '../pages/CadastroPage'
import { CapsulasPage } from '../pages/CapsulasPage'
import { LoginPage } from '../pages/LoginPage'
import { NovaCapsulaPage } from '../pages/NovaCapsulaPage'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/capsulas" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="cadastro" element={<CadastroPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="capsulas" element={<CapsulasPage />} />
          <Route path="capsulas/nova" element={<NovaCapsulaPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
