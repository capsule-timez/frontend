import axios from 'axios'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useToast } from '../contexts/ToastContext'
import { getApiError } from '../services/apiError'
import { listInvites, sendInvites, type CapsuleInvite } from '../services/inviteService'
import { Alert } from './Alert/Alert'
import { Button } from './Button/Button'
import { Card } from './Card/Card'
import { TextAreaField } from './FormField/TextAreaField'

const statusLabels = new Map([
  ['PENDING', 'Pendente'],
  ['ACCEPTED', 'Aceito'],
  ['EXPIRED', 'Expirado'],
])

export function CapsuleInvites({ capsuleId }: { capsuleId: string }) {
  const toast = useToast()
  const [input, setInput] = useState('')
  const [fieldError, setFieldError] = useState<string>()
  const [invites, setInvites] = useState<CapsuleInvite[]>()
  const [listError, setListError] = useState<string>()
  const [revision, setRevision] = useState(0)
  const [sending, setSending] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    listInvites(capsuleId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setInvites(result)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setListError(error instanceof Error && !axios.isAxiosError(error) ? error.message : getApiError(error).message)
        }
      })
    return () => controller.abort()
  }, [capsuleId, revision])

  function refresh() {
    setListError(undefined)
    setRevision((value) => value + 1)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const emails = [...new Set(input.toLowerCase().split(/[\s,;]+/).filter(Boolean))]
    if (!emails.length || emails.some((email) => email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      setFieldError('Informe um ou mais e-mails válidos.')
      return
    }

    submitting.current = true
    setSending(true)
    setFieldError(undefined)
    try {
      await sendInvites(capsuleId, emails)
      setInput('')
      toast.success('Convites enviados!')
      refresh()
    } catch (error) {
      toast.error('Não foi possível enviar os convites', { description: getApiError(error).message })
    } finally {
      submitting.current = false
      setSending(false)
    }
  }

  return (
    <Card className="capsula-detalhe__content">
      <h2>Convidar por e-mail</h2>
      <form className="capsula-detalhe__invite-form" onSubmit={submit}>
        <TextAreaField
          label="E-mails"
          hint="Separe os endereços por vírgula, espaço ou quebra de linha."
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
        <Button type="submit" loading={sending}>Enviar convites</Button>
      </form>
      <h3>Convites enviados</h3>
      {listError && (
        <>
          <Alert tone="error">{listError}</Alert>
          <Button variant="secondary" onClick={refresh}>Atualizar convites</Button>
        </>
      )}
      {!invites && !listError && <p role="status">Carregando convites…</p>}
      {invites?.length === 0 && !listError && <p>Nenhum convite enviado.</p>}
      {!!invites?.length && (
        <ul className="capsula-detalhe__files">
          {invites.map((invite) => (
            <li key={invite.id}>{invite.email} · {statusLabels.get(invite.status) ?? invite.status}</li>
          ))}
        </ul>
      )}
    </Card>
  )
}
