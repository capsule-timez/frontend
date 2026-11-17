import axios from 'axios'
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Alert } from '../components/Alert/Alert'
import { AuthCard } from '../components/AuthCard/AuthCard'
import { Button, ButtonLink } from '../components/Button/Button'
import { useToast } from '../contexts/ToastContext'
import { getApiError } from '../services/apiError'
import { getApiErrorDetails } from '../services/capsuleService'
import { acceptInvite } from '../services/inviteService'

type InviteState =
  | { status: 'loading' }
  | { status: 'accepted'; capsuleId: string }
  | { status: 'error'; message: string; retryable: boolean }

// A API responde 404 tanto para convite inexistente quanto para já usado ou expirado.
const NOT_FOUND_MESSAGE = 'Este convite é inválido, expirou ou já foi utilizado.'
const DEADLINE_MESSAGE = 'O prazo para entrar nesta cápsula já terminou.'

function inviteError(error: unknown): Extract<InviteState, { status: 'error' }> {
  const response = axios.isAxiosError(error) ? error.response : undefined
  const status = response?.status

  if (status === undefined || status >= 500) {
    const message = error instanceof Error && !axios.isAxiosError(error) ? error.message : getApiError(error).message
    return { status: 'error', message, retryable: true }
  }

  const { code, message } = getApiErrorDetails(error)
  if (status === 404) return { status: 'error', message: NOT_FOUND_MESSAGE, retryable: false }
  if (code === 'CONTRIBUTION_DEADLINE_PASSED') return { status: 'error', message: DEADLINE_MESSAGE, retryable: false }

  const apiMessage = code === 'UNKNOWN' ? '' : message.trim()
  return { status: 'error', message: apiMessage || NOT_FOUND_MESSAGE, retryable: false }
}

export function ConvitePage() {
  const { token = '' } = useParams()
  return <Convite key={token} token={token} />
}

function Convite({ token }: { token: string }) {
  const toast = useToast()
  const [state, setState] = useState<InviteState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    // Aguarda a limpeza do primeiro efeito no StrictMode antes do POST de uso único.
    queueMicrotask(async () => {
      if (controller.signal.aborted) return
      try {
        const capsuleId = await acceptInvite(token, controller.signal)
        if (controller.signal.aborted) return
        toast.success('Você entrou na cápsula!', { description: 'Deixe sua contribuição antes do prazo.' })
        setState({ status: 'accepted', capsuleId })
      } catch (error) {
        if (!controller.signal.aborted) setState(inviteError(error))
      }
    })
    return () => controller.abort()
  }, [token, attempt, toast])

  if (state.status === 'accepted') {
    return <Navigate to={`/capsulas/${encodeURIComponent(state.capsuleId)}`} replace />
  }

  const unavailable = state.status === 'error' && !state.retryable

  return (
    <AuthCard
      title={unavailable ? 'Convite indisponível' : 'Convite para cápsula'}
      subtitle={unavailable ? 'Se ainda quiser participar, peça um novo convite a quem criou a cápsula.' : undefined}
      footer={<ButtonLink to="/capsulas" variant="ghost">Ver minhas cápsulas</ButtonLink>}
    >
      {state.status === 'loading' && <p role="status">Aceitando convite…</p>}
      {state.status === 'error' && (
        <>
          <Alert tone="error">{state.message}</Alert>
          {state.retryable && (
            <Button onClick={() => {
              setState({ status: 'loading' })
              setAttempt((value) => value + 1)
            }}>Tentar novamente</Button>
          )}
        </>
      )}
    </AuthCard>
  )
}
