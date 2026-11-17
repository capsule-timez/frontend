import axios from 'axios'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { getApiError } from '../../services/apiError'
import { getApiErrorDetails } from '../../services/capsuleService'
import {
  listInvites,
  MAX_INVITES_PER_REQUEST,
  sendInvites,
  type CapsuleInvite,
  type InviteResult,
} from '../../services/inviteService'
import type { Capsule } from '../../types/capsule'
import { formatDateTime, isInFuture } from '../../utils/formatDate'
import { Alert } from '../Alert/Alert'
import { Badge, type BadgeTone } from '../Badge/Badge'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { TextAreaField } from '../FormField/TextAreaField'
import './CapsuleInvites.css'

const MAX_EMAIL_LENGTH = 254
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const STATUS_BADGES: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  ACCEPTED: { label: 'Aceito', tone: 'success' },
  EXPIRED: { label: 'Expirado', tone: 'neutral' },
}

function parseEmails(input: string): string[] {
  return [...new Set(input.toLowerCase().split(/[\s,;]+/).filter(Boolean))]
}

function invalidEmails(emails: string[]): string[] {
  return emails.filter((email) => email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email))
}

function errorMessage(error: unknown): string {
  return error instanceof Error && !axios.isAxiosError(error) ? error.message : getApiError(error).message
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

function emailsOf(results: InviteResult[], result: InviteResult['result']) {
  return results.filter((item) => item.result === result).map((item) => item.email)
}

interface CapsuleInvitesProps {
  capsule: Pick<Capsule, 'id' | 'status' | 'contributionDeadline'>
}

export function CapsuleInvites({ capsule }: CapsuleInvitesProps) {
  const toast = useToast()
  const [input, setInput] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [invites, setInvites] = useState<CapsuleInvite[]>()
  const [listError, setListError] = useState<string>()
  const [revision, setRevision] = useState(0)
  const [sending, setSending] = useState(false)
  const [deadlinePassed, setDeadlinePassed] = useState(false)
  const submitting = useRef(false)

  // O detalhe não traz o prazo; se ele já passou, a API responde 409 e o formulário fecha.
  const deadline = capsule.contributionDeadline
  const isOpen = capsule.status === 'SCHEDULED' && !deadlinePassed && (!deadline || isInFuture(deadline))

  useEffect(() => {
    const controller = new AbortController()
    listInvites(capsule.id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setInvites(result)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setListError(errorMessage(error))
      })
    return () => controller.abort()
  }, [capsule.id, revision])

  function refresh() {
    setListError(undefined)
    setRevision((value) => value + 1)
  }

  function reportResults(results: InviteResult[]) {
    const sent = emailsOf(results, 'SENT')
    const failed = emailsOf(results, 'EMAIL_FAILED')
    const members = emailsOf(results, 'ALREADY_MEMBER')
    const membersNote = members.length
      ? `${members.join(', ')} já ${members.length === 1 ? 'participa' : 'participam'} da cápsula.`
      : undefined

    if (sent.length) {
      toast.success(sent.length === 1 ? 'Convite enviado!' : `${sent.length} convites enviados!`, {
        description: membersNote,
      })
    } else if (!failed.length && membersNote) {
      toast.info('Nenhum convite novo', { description: membersNote })
    }
    if (failed.length) {
      toast.error(`Não foi possível enviar ${plural(failed.length, 'e-mail', 'e-mails')} de convite`, {
        description: `O convite para ${failed.join(', ')} ficou registrado. Tente enviar de novo mais tarde.`,
      })
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return

    const emails = parseEmails(input)
    const invalid = invalidEmails(emails)
    if (!emails.length) {
      setFieldError('Informe ao menos um e-mail.')
      return
    }
    if (invalid.length) {
      setFieldError(`E-mail inválido: ${invalid.join(', ')}`)
      return
    }
    if (emails.length > MAX_INVITES_PER_REQUEST) {
      setFieldError(`Envie no máximo ${MAX_INVITES_PER_REQUEST} e-mails por vez.`)
      return
    }

    submitting.current = true
    setSending(true)
    setFieldError(undefined)
    try {
      reportResults(await sendInvites(capsule.id, emails))
      setInput('')
      refresh()
    } catch (error) {
      const { code, message, fieldErrors } = getApiErrorDetails(error)
      if (code === 'CONTRIBUTION_DEADLINE_PASSED') setDeadlinePassed(true)
      const emailsError = Object.entries(fieldErrors).find(([field]) => field.startsWith('emails'))?.[1]
      setFieldError(emailsError)
      toast.error('Não foi possível enviar os convites', {
        description: emailsError ?? (code === 'UNKNOWN' ? errorMessage(error) : message),
      })
    } finally {
      submitting.current = false
      setSending(false)
    }
  }

  return (
    <Card className="capsula-detalhe__content capsule-invites">
      <h2>Convidar por e-mail</h2>

      {isOpen ? (
        <form className="capsule-invites__form" onSubmit={submit} noValidate>
          <TextAreaField
            label="E-mails"
            name="emails"
            hint={`Separe os endereços por vírgula, espaço ou quebra de linha (até ${MAX_INVITES_PER_REQUEST} por vez). O convite vale até o prazo para contribuições.`}
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setFieldError(undefined)
            }}
            error={fieldError}
            rows={3}
            autoCapitalize="none"
            spellCheck={false}
            disabled={sending}
          />
          <Button type="submit" icon="send" loading={sending}>
            {sending ? 'Enviando…' : 'Enviar convites'}
          </Button>
        </form>
      ) : (
        <p>O prazo para entrar nesta cápsula terminou, então não é possível enviar novos convites.</p>
      )}

      <h3>Convites enviados</h3>
      {listError && (
        <>
          <Alert tone="error">{listError}</Alert>
          <Button variant="secondary" onClick={refresh}>Atualizar convites</Button>
        </>
      )}
      {!invites && !listError && <p role="status">Carregando convites…</p>}
      {invites?.length === 0 && !listError && <p>Nenhum convite enviado.</p>}
      {!!invites?.length && !listError && (
        <ul className="capsule-invites__list" aria-label="Convites enviados">
          {invites.map((invite) => {
            const badge = STATUS_BADGES[invite.status] ?? { label: invite.status, tone: 'neutral' }
            return (
              <li key={invite.email}>
                <span className="capsule-invites__email">
                  {invite.email}
                  {invite.sentAt && (
                    <small>
                      Enviado em <time dateTime={invite.sentAt}>{formatDateTime(invite.sentAt)}</time>
                    </small>
                  )}
                </span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
