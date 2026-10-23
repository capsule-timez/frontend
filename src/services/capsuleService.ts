import axios from 'axios'
import type {
  ApiErrorBody,
  Capsule,
  CapsuleFile,
  CapsuleSummary,
  CreateCapsuleInput,
  PaginatedResponse,
} from '../types/capsule'
import { httpClient } from './httpClient'

export async function getCapsule(id: string, signal?: AbortSignal): Promise<Capsule> {
  const { data } = await httpClient.get<Capsule>(`/api/capsules/${encodeURIComponent(id)}`, { signal })
  return data
}

export async function createCapsule(input: CreateCapsuleInput): Promise<Capsule> {
  const { data } = await httpClient.post<Capsule>('/api/capsules', input)
  return data
}

export async function uploadCapsuleFile(id: string, file: File): Promise<CapsuleFile> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await httpClient.post<CapsuleFile>(
    `/api/capsules/${encodeURIComponent(id)}/files`,
    form,
  )
  return data
}

export async function deleteCapsule(id: string): Promise<void> {
  await httpClient.delete(`/api/capsules/${encodeURIComponent(id)}`)
}

export async function listCapsules(
  params: { status?: CapsuleSummary['status']; page?: number } = {},
  signal?: AbortSignal,
): Promise<PaginatedResponse<CapsuleSummary>> {
  const { data } = await httpClient.get<PaginatedResponse<CapsuleSummary>>('/api/capsules', {
    params: { ...params, pageSize: 20 }, signal,
  })
  return data
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
