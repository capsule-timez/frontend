import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout/Layout'
import { CadastroPage } from '../pages/CadastroPage'
import { LoginPage } from '../pages/LoginPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="cadastro" element={<CadastroPage />} />
      </Route>
    </Routes>
  )
}
