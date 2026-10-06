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
