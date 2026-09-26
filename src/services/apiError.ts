import axios from 'axios'

export interface ApiError {
  message: string
  fieldErrors: Record<string, string>
}

const NETWORK_ERROR =
  'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
const UNKNOWN_ERROR = 'Ocorreu um erro inesperado. Tente novamente.'

/**
 * Formato de erro da API: `{ status: 'error', message, details? }`. Em erros de
 * validação (400), `details` traz a lista de campos problemáticos como
 * `[{ field, message }]`.
 */
function parseFieldErrors(details: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  if (!Array.isArray(details)) return fieldErrors

  for (const item of details) {
    if (typeof item !== 'object' || item === null) continue

    const { field, message } = item as { field?: unknown; message?: unknown }

    if (typeof field === 'string' && typeof message === 'string' && !(field in fieldErrors)) {
      fieldErrors[field] = message
    }
  }

  return fieldErrors
}

export function getApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return { message: UNKNOWN_ERROR, fieldErrors: {} }
  }

  if (!error.response) {
    return { message: NETWORK_ERROR, fieldErrors: {} }
  }

  const data = error.response.data as { message?: unknown; details?: unknown } | null

  return {
    message: typeof data?.message === 'string' ? data.message : UNKNOWN_ERROR,
    fieldErrors: parseFieldErrors(data?.details),
  }
}
