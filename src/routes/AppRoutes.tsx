import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { CadastroPage } from '../pages/CadastroPage'
import { CapsulasPage } from '../pages/CapsulasPage'
import { CapsulaDetalhePage } from '../pages/CapsulaDetalhePage'
import { CapsulaPublicaPage } from '../pages/CapsulaPublicaPage'
import { LoginPage } from '../pages/LoginPage'
import { NovaCapsulaPage } from '../pages/NovaCapsulaPage'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/capsulas" replace />} />
        <Route path="c/:token" element={<CapsulaPublicaPage />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="cadastro" element={<CadastroPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="capsulas" element={<CapsulasPage />} />
          <Route path="capsulas/nova" element={<NovaCapsulaPage />} />
          <Route path="capsulas/:id" element={<CapsulaDetalhePage />} />
        </Route>
      </Route>
    </Routes>
  )
}
