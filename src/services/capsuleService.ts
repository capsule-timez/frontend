import axios from 'axios'
import type {
  ApiErrorBody,
  Capsule,
  CapsuleSummary,
  CreateCapsuleInput,
  PaginatedResponse,
} from '../types/capsule'
import { httpClient } from './httpClient'

// Fallback temporário: GET /api/capsules ainda não existe no backend. Enquanto
// isso, as cápsulas criadas por esta aplicação ficam guardadas localmente para
// que a listagem as exiba. Remover quando a rota de listagem for publicada.
const LOCAL_CACHE_KEY = 'capsula:capsules'

function readLocalCache(): CapsuleSummary[] {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY)
    return raw ? (JSON.parse(raw) as CapsuleSummary[]) : []
  } catch {
    return []
  }
}

function saveToLocalCache(capsule: Capsule) {
  const summary: CapsuleSummary = {
    id: capsule.id,
    title: capsule.title,
    recipientEmail: capsule.recipientEmail,
    scheduleDate: capsule.scheduleDate,
    status: capsule.status,
    sentAt: capsule.sentAt,
    createdAt: capsule.createdAt,
    fileCount: capsule.files.length,
  }
  const others = readLocalCache().filter((item) => item.id !== capsule.id)

  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify([...others, summary]))
  } catch {
    // Sem storage disponível a listagem só não mostra o item; a criação já ocorreu.
  }
}

function byScheduleDate(a: CapsuleSummary, b: CapsuleSummary) {
  return Date.parse(a.scheduleDate) - Date.parse(b.scheduleDate)
}

export async function createCapsule(input: CreateCapsuleInput): Promise<Capsule> {
  const { data } = await httpClient.post<Capsule>('/api/capsules', input)
  saveToLocalCache(data)
  return data
}

export async function listCapsules(): Promise<CapsuleSummary[]> {
  try {
    const { data } = await httpClient.get<PaginatedResponse<CapsuleSummary>>('/api/capsules', {
      params: { pageSize: 100 },
    })
    return data.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return readLocalCache().sort(byScheduleDate)
    }
    throw error
  }
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
