import type { AuthSession, LoginPayload, RegisterPayload } from '../types/auth'
import { httpClient } from './httpClient'

// Rotas de negócio da API ficam sob o prefixo `/api` (API_PREFIX do backend).
const AUTH_PATH = '/api/auth'

export const authService = {
  /** Cria a conta. A API não emite token no cadastro; é preciso fazer login em seguida. */
  async register(payload: RegisterPayload): Promise<void> {
    await httpClient.post(`${AUTH_PATH}/register`, payload)
  },

  /** Retorna o token JWT e os dados do usuário. */
  async login(payload: LoginPayload): Promise<AuthSession> {
    const { data } = await httpClient.post<AuthSession>(`${AUTH_PATH}/login`, payload)
    return data
  },
}
