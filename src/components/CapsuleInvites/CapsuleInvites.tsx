import axios from 'axios'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { getApiError } from '../../services/apiError'
import { listInvites, sendInvites, type CapsuleInvite } from '../../services/inviteService'
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
  const submitting = useRef(false)

  const deadline = capsule.contributionDeadline
  const isOpen = capsule.status === 'SCHEDULED' && Boolean(deadline && isInFuture(deadline))

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

    submitting.current = true
    setSending(true)
    setFieldError(undefined)
    try {
      await sendInvites(capsule.id, emails)
      setInput('')
      toast.success(emails.length === 1 ? 'Convite enviado!' : `${emails.length} convites enviados!`)
      refresh()
    } catch (error) {
      const { message, fieldErrors } = getApiError(error)
      const emailsError = Object.entries(fieldErrors).find(([field]) => field.startsWith('emails'))?.[1]
      setFieldError(emailsError)
      toast.error('Não foi possível enviar os convites', { description: emailsError ?? message })
    } finally {
      submitting.current = false
      setSending(false)
    }
  }

  return (
    <Card className="capsula-detalhe__content capsule-invites">
      <h2>Convidar por e-mail</h2>

      {isOpen && deadline ? (
        <form className="capsule-invites__form" onSubmit={submit} noValidate>
          <TextAreaField
            label="E-mails"
            name="emails"
            hint={`Separe os endereços por vírgula, espaço ou quebra de linha. Os convidados podem entrar até ${formatDateTime(deadline)}.`}
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
              <li key={invite.id}>
                <span className="capsule-invites__email">{invite.email}</span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
