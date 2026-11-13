import { httpClient } from './httpClient'

export interface CapsuleInvite {
  id: string
  email: string
  status: string
}

function invitesPath(id: string) {
  return `/api/capsules/${encodeURIComponent(id)}/invites`
}

function isInvite(value: unknown): value is CapsuleInvite {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'email' in value && typeof value.email === 'string' &&
    'status' in value && typeof value.status === 'string'
}

export async function listInvites(id: string, signal?: AbortSignal): Promise<CapsuleInvite[]> {
  const { data } = await httpClient.get<unknown>(invitesPath(id), { signal })
  const invites = data && typeof data === 'object' && 'data' in data ? data.data : data
  if (!Array.isArray(invites) || !invites.every(isInvite)) {
    throw new Error('A API retornou uma lista de convites inválida.')
  }
  return invites
}

export async function sendInvites(id: string, emails: string[]): Promise<void> {
  await httpClient.post(invitesPath(id), { emails })
}

export async function acceptInvite(token: string, signal?: AbortSignal): Promise<string> {
  const { data } = await httpClient.post<unknown>(
    `/api/invites/${encodeURIComponent(token)}/accept`, undefined, { signal },
  )
  if (
    typeof data !== 'object' || data === null ||
    !('capsuleId' in data) || typeof data.capsuleId !== 'string' || !data.capsuleId.trim()
  ) {
    throw new Error('A API não informou qual cápsula foi aceita.')
  }
  return data.capsuleId
}
