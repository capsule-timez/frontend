import { httpClient } from './httpClient'

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED'

export interface CapsuleInvite {
  email: string
  status: InviteStatus | (string & {})
  sentAt: string
  expiresAt: string
  acceptedAt: string | null
}

/** Resultado do envio para cada e-mail: o convite fica registrado mesmo quando o e-mail falha. */
export type InviteDelivery = 'SENT' | 'EMAIL_FAILED' | 'ALREADY_MEMBER'

export interface InviteResult {
  email: string
  result: InviteDelivery | (string & {})
}

export const MAX_INVITES_PER_REQUEST = 20

function invitesPath(id: string) {
  return `/api/capsules/${encodeURIComponent(id)}/invites`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isInvite(value: unknown): value is CapsuleInvite {
  return isRecord(value) && typeof value.email === 'string' && typeof value.status === 'string'
}

function isInviteResult(value: unknown): value is InviteResult {
  return isRecord(value) && typeof value.email === 'string' && typeof value.result === 'string'
}

export async function listInvites(id: string, signal?: AbortSignal): Promise<CapsuleInvite[]> {
  const { data } = await httpClient.get<unknown>(invitesPath(id), { signal })
  const invites = isRecord(data) ? data.data : undefined
  if (!Array.isArray(invites) || !invites.every(isInvite)) {
    throw new Error('A API retornou uma lista de convites inválida.')
  }
  return invites
}

export async function sendInvites(id: string, emails: string[]): Promise<InviteResult[]> {
  const { data } = await httpClient.post<unknown>(invitesPath(id), { emails })
  const results = isRecord(data) ? data.invites : undefined
  if (!Array.isArray(results) || !results.every(isInviteResult)) {
    throw new Error('A API não informou o resultado dos convites.')
  }
  return results
}

/** Aceita o convite e devolve o id da cápsula, que vem no detalhe retornado pela API. */
export async function acceptInvite(token: string, signal?: AbortSignal): Promise<string> {
  const { data } = await httpClient.post<unknown>(
    `/api/invites/${encodeURIComponent(token)}/accept`, undefined, { signal },
  )
  if (!isRecord(data) || typeof data.id !== 'string' || !data.id.trim()) {
    throw new Error('A API não informou qual cápsula foi aceita.')
  }
  return data.id
}
