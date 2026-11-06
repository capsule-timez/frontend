export type CapsuleStatus = 'SCHEDULED' | 'SENT' | 'FAILED'

export type CapsuleType = 'INDIVIDUAL' | 'GROUP'

export interface CapsuleParticipant {
  id: string
  name: string
  isCreator: boolean
}

export interface CapsuleFile {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  createdAt: string
  downloadUrl: string
  downloadUrlExpiresAt: string
}

export interface Capsule {
  id: string
  title: string
  text: string
  recipientEmail: string
  scheduleDate: string
  status: CapsuleStatus
  sentAt: string | null
  createdAt: string
  files: CapsuleFile[]

  type?: CapsuleType
  contributionDeadline?: string | null
  inviteCode?: string | null
  participants?: CapsuleParticipant[]
}

export interface PublicCapsule {
  title: string
  text: string
  creatorName: string
  sentAt: string
  files: CapsuleFile[]
}

/** Item da listagem: sem `text` e `files`, com a contagem de anexos. */
export type CapsuleSummary = Omit<Capsule, 'text' | 'files' | 'inviteCode'> & { fileCount: number }

export interface CreateCapsuleInput {
  title: string
  text: string
  recipientEmail: string
  /** ISO 8601 em UTC com sufixo Z. */
  scheduleDate: string
  type?: CapsuleType
  /** ISO 8601 em UTC com sufixo Z. Obrigatório quando `type` é `GROUP`. */
  contributionDeadline?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
}

export interface ApiErrorBody {
  status: 'error'
  code: string
  message: string
  details?: { field: string; message: string }[]
}
