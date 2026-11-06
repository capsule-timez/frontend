import type { CapsuleType } from '../types/capsule'

export const TITLE_MAX_LENGTH = 120
export const TEXT_MAX_LENGTH = 10_000
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

export function validateCapsuleForm(
  values: CapsuleFormValues,
  now = new Date(),
): CapsuleFormErrors {
  const errors: CapsuleFormErrors = {}
  const title = values.title.trim()
  const text = values.text.trim()

  if (!title) errors.title = 'Informe um título.'
  else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `O título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres.`
  }

  if (!text) errors.text = 'Escreva a mensagem da cápsula.'
  else if (text.length > TEXT_MAX_LENGTH) {
    errors.text = 'A mensagem deve ter no máximo 10.000 caracteres.'
  }

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
    const email = values.recipientEmail.trim()
    if (!email) errors.recipientEmail = 'Informe o e-mail do destinatário.'
    else if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
      errors.recipientEmail = 'Informe um e-mail válido.'
    }
  }

  return errors
}
