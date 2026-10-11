import axios from 'axios'

type AuthTokenGetter = () => string | null

let getAuthToken: AuthTokenGetter = () => null

/** Definido pelo AuthProvider para que toda requisição leve o token da sessão. */
export function setAuthTokenGetter(getter: AuthTokenGetter) {
  getAuthToken = getter
}

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

httpClient.interceptors.request.use((config) => {
  const token = getAuthToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

let unauthorizedHandler: (() => void) | null = null

/**
 * Registra o que fazer quando a API rejeita um token enviado (expirado ou
 * inválido). Usado pelo AuthProvider para encerrar a sessão local.
 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

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
