import type { CapsuleType } from '../types/capsule'

export const TITLE_MAX_LENGTH = 120
export const TEXT_MAX_LENGTH = 10_000
export const CONTRIBUTION_TEXT_MAX_LENGTH = 2_000
export const EMAIL_MAX_LENGTH = 254
export const MIN_SCHEDULE_LEAD_MS = 2 * 60_000

export type RecipientMode = 'self' | 'other'

export interface CapsuleFormValues {
  type: CapsuleType
  title: string
  text: string
  scheduleDate: string
  contributionDeadline: string
  recipientMode: RecipientMode
  recipientEmail: string
}

export type CapsuleFormField =
  | 'title'
  | 'text'
  | 'scheduleDate'
  | 'contributionDeadline'
  | 'recipientEmail'

export type CapsuleFormErrors = Partial<Record<CapsuleFormField, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/** Formata uma data no formato aceito por inputs datetime-local, no fuso local. */
export function toDateTimeLocalValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** Primeiro instante aceito para a entrega, arredondado para o minuto seguinte. */
export function getMinScheduleDate(now = new Date()): Date {
  const min = new Date(now.getTime() + MIN_SCHEDULE_LEAD_MS)
  min.setSeconds(0, 0)
  min.setMinutes(min.getMinutes() + 1)
  return min
}

/** Primeiro instante aceito para o prazo de contribuições: o minuto seguinte. */
export function getMinContributionDeadline(now = new Date()): Date {
  const min = new Date(now)
  min.setSeconds(0, 0)
  min.setMinutes(min.getMinutes() + 1)
  return min
}

export function validateScheduleDate(value: string, now = new Date()): string | undefined {
  if (!value) return 'Escolha a data de entrega.'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data inválida.'
  if (date.getTime() < now.getTime() + MIN_SCHEDULE_LEAD_MS) {
    return 'A data de entrega precisa estar no futuro.'
  }

  return undefined
}

export function validateContributionDeadline(
  value: string,
  scheduleDate: string,
  now = new Date(),
): string | undefined {
  if (!value) return 'Escolha o prazo para contribuições.'

  const deadline = new Date(value).getTime()
  if (Number.isNaN(deadline)) return 'Data inválida.'
  if (deadline <= now.getTime()) return 'O prazo para contribuições precisa estar no futuro.'

  // Data de entrega vazia ou inválida já é sinalizada no próprio campo.
  const schedule = new Date(scheduleDate).getTime()
  if (deadline >= schedule) return 'O prazo para contribuições precisa ser antes da data de entrega.'

  return undefined
}

/** Texto e imagens são opcionais, mas a contribuição precisa de ao menos um dos dois. */
export function validateContributionText(value: string, imageCount: number): string | undefined {
  const text = value.trim()

  if (!text && imageCount === 0) return 'Escreva uma mensagem ou escolha ao menos uma imagem.'
  if (text.length > CONTRIBUTION_TEXT_MAX_LENGTH) {
    return `A mensagem deve ter no máximo ${CONTRIBUTION_TEXT_MAX_LENGTH.toLocaleString('pt-BR')} caracteres.`
  }

  return undefined
}

function validateTitle(value: string): string | undefined {
  const title = value.trim()
  if (!title) return 'Informe um título.'
  if (title.length > TITLE_MAX_LENGTH) return `O título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres.`
  return undefined
}

function validateText(value: string): string | undefined {
  const text = value.trim()
  if (!text) return 'Escreva a mensagem da cápsula.'
  if (text.length > TEXT_MAX_LENGTH) return 'A mensagem deve ter no máximo 10.000 caracteres.'
  return undefined
}

function validateRecipientEmail(value: string): string | undefined {
  const email = value.trim()
  if (!email) return 'Informe o e-mail do destinatário.'
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) return 'Informe um e-mail válido.'
  return undefined
}

function withoutEmpty(errors: CapsuleFormErrors): CapsuleFormErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as CapsuleFormErrors
}

export type CapsuleEditValues = Pick<CapsuleFormValues, 'title' | 'text' | 'recipientEmail' | 'scheduleDate'>

/** Regras do PATCH /api/capsules/:id, que aceita os mesmos campos de conteúdo da criação. */
export function validateCapsuleEdit(values: CapsuleEditValues, now = new Date()): CapsuleFormErrors {
  return withoutEmpty({
    title: validateTitle(values.title),
    text: validateText(values.text),
    recipientEmail: validateRecipientEmail(values.recipientEmail),
    scheduleDate: validateScheduleDate(values.scheduleDate, now),
  })
}

export function validateCapsuleForm(
  values: CapsuleFormValues,
  now = new Date(),
): CapsuleFormErrors {
  const errors: CapsuleFormErrors = withoutEmpty({
    title: validateTitle(values.title),
    text: validateText(values.text),
  })

  const scheduleError = validateScheduleDate(values.scheduleDate, now)
  if (scheduleError) errors.scheduleDate = scheduleError

  if (values.type === 'GROUP') {
    const deadlineError = validateContributionDeadline(
      values.contributionDeadline,
      values.scheduleDate,
      now,
    )
    if (deadlineError) errors.contributionDeadline = deadlineError
  }

  if (values.recipientMode === 'other') {
    const emailError = validateRecipientEmail(values.recipientEmail)
    if (emailError) errors.recipientEmail = emailError
  }

  return errors
}
