import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { CadastroPage } from '../pages/CadastroPage'
import { CapsulasPage } from '../pages/CapsulasPage'
import { LoginPage } from '../pages/LoginPage'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="cadastro" element={<CadastroPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="capsulas" element={<CapsulasPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
