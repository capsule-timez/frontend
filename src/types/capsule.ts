export type CapsuleStatus = 'SCHEDULED' | 'SENT' | 'FAILED'

export type CapsuleType = 'INDIVIDUAL' | 'GROUP'

export type CapsuleMemberRole = 'OWNER' | 'MEMBER'

export interface CapsuleParticipant {
  name: string
  role: CapsuleMemberRole
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

export interface CapsuleContribution {
  id: string
  author: { name: string }
  /** Nulo quando a contribuição tem só imagens. */
  text: string | null
  createdAt: string
  files: CapsuleFile[]
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

  /** Só vem na resposta da criação. No detalhe, a cápsula em grupo é a que traz `participants`. */
  type?: CapsuleType
  /** Só vem na resposta da criação de cápsula em grupo. */
  contributionDeadline?: string
  /** Só vem para quem criou a cápsula em grupo. */
  inviteCode?: string
  /** Presente apenas em cápsulas em grupo. */
  participants?: CapsuleParticipant[]
  /** Presente apenas em cápsulas em grupo, em ordem de envio. */
  contributions?: CapsuleContribution[]
}

export interface PublicCapsule {
  title: string
  text: string
  creatorName: string
  sentAt: string
  files: CapsuleFile[]
  /** Presente apenas em cápsulas em grupo, em ordem de envio. */
  contributions?: CapsuleContribution[]
}

/** Item da listagem: sem `text` e `files`, com a contagem de anexos. */
export type CapsuleSummary = Pick<
  Capsule,
  'id' | 'title' | 'recipientEmail' | 'scheduleDate' | 'status' | 'sentAt' | 'createdAt' | 'participants'
> & { fileCount: number }

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

/** PATCH /api/capsules/:id: envie só os campos que mudaram. */
export type UpdateCapsuleInput = Partial<Pick<CreateCapsuleInput, 'title' | 'text' | 'recipientEmail' | 'scheduleDate'>>

export interface ContributionInput {
  text?: string
  images?: File[]
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
