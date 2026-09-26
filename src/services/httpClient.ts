import axios from 'axios'
import { authStorage } from './authStorage'

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

let unauthorizedHandler: (() => void) | null = null

/**
 * Registra o que fazer quando a API rejeita um token enviado (expirado ou
 * inválido). Usado pelo AuthProvider para encerrar a sessão local.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

httpClient.interceptors.request.use((config) => {
  const session = authStorage.load()

  if (session) {
    config.headers.Authorization = `Bearer ${session.token}`
  }

  return config
})

httpClient.interceptors.response.use(undefined, (error: unknown) => {
  // Só conta como sessão rejeitada se a requisição levava um token. Um 401 no
  // login (credenciais inválidas) não deve derrubar nada.
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.headers.get('Authorization')
  ) {
    unauthorizedHandler?.()
  }

  return Promise.reject(error)
})
