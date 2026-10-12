import axios from 'axios'
import type {
  ApiErrorBody,
  Capsule,
  CapsuleSummary,
  CreateCapsuleInput,
  PaginatedResponse,
} from '../types/capsule'
import { httpClient } from './httpClient'

export async function createCapsule(input: CreateCapsuleInput): Promise<Capsule> {
  const { data } = await httpClient.post<Capsule>('/api/capsules', input)
  return data
}

export async function listCapsules(): Promise<CapsuleSummary[]> {
  const { data } = await httpClient.get<PaginatedResponse<CapsuleSummary>>('/api/capsules', {
    params: { pageSize: 100 },
  })
  return data.data
}

export interface ApiErrorDetails {
  code: string
  message: string
  fieldErrors: Record<string, string>
}

/** Normaliza qualquer erro de chamada à API no formato de erro do contrato. */
export function getApiErrorDetails(error: unknown): ApiErrorDetails {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data

    if (body?.code) {
      const fieldErrors: Record<string, string> = {}
      for (const detail of body.details ?? []) {
        fieldErrors[detail.field] = detail.message
      }
      return { code: body.code, message: body.message, fieldErrors }
    }

    if (!error.response) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Não foi possível conectar à API. Verifique se ela está em execução.',
        fieldErrors: {},
      }
    }
  }

  return { code: 'UNKNOWN', message: 'Erro inesperado. Tente novamente.', fieldErrors: {} }
}
