// Limites espelhados do contrato da API (backend src/schemas/capsule.schema.ts).
export const TITLE_MAX_LENGTH = 120
export const TEXT_MAX_LENGTH = 10_000
export const EMAIL_MAX_LENGTH = 254
/** A API exige pelo menos 1 minuto de antecedência; a interface usa 2 por folga. */
export const MIN_SCHEDULE_LEAD_MS = 2 * 60_000

export type RecipientMode = 'self' | 'other'

export interface CapsuleFormValues {
  title: string
  text: string
  /** Valor de um input datetime-local (`YYYY-MM-DDTHH:mm`), no fuso local. */
  scheduleDate: string
  recipientMode: RecipientMode
  recipientEmail: string
}

export type CapsuleFormField = 'title' | 'text' | 'scheduleDate' | 'recipientEmail'

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

export function validateScheduleDate(value: string, now = new Date()): string | undefined {
  if (!value) return 'Escolha a data de entrega.'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data inválida.'
  if (date.getTime() < now.getTime() + MIN_SCHEDULE_LEAD_MS) {
    return 'A data de entrega precisa estar no futuro.'
  }

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

  if (values.recipientMode === 'other') {
    const email = values.recipientEmail.trim()
    if (!email) errors.recipientEmail = 'Informe o e-mail do destinatário.'
    else if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
      errors.recipientEmail = 'Informe um e-mail válido.'
    }
  }

  return errors
}
