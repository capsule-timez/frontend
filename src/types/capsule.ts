export type CapsuleStatus = 'SCHEDULED' | 'SENT' | 'FAILED'

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
}

/** Item da listagem: sem `text` e `files`, com a contagem de anexos. */
export type CapsuleSummary = Omit<Capsule, 'text' | 'files'> & { fileCount: number }

export interface CreateCapsuleInput {
  title: string
  text: string
  recipientEmail: string
  /** ISO 8601 em UTC com sufixo Z. */
  scheduleDate: string
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
