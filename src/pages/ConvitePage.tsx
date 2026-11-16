import axios from 'axios'
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Alert } from '../components/Alert/Alert'
import { AuthCard } from '../components/AuthCard/AuthCard'
import { Button, ButtonLink } from '../components/Button/Button'
import { useToast } from '../contexts/ToastContext'
import { getApiError } from '../services/apiError'
import { acceptInvite } from '../services/inviteService'

type InviteState =
  | { status: 'loading' }
  | { status: 'accepted'; capsuleId: string }
  | { status: 'error'; message: string; retryable: boolean }

const FALLBACK_MESSAGES: Record<number, string> = {
  404: 'Este convite é inválido ou não está mais disponível.',
  409: 'Este convite já foi utilizado.',
  410: 'Este convite expirou.',
}

function inviteError(error: unknown): Extract<InviteState, { status: 'error' }> {
  const response = axios.isAxiosError(error) ? error.response : undefined
  const status = response?.status

  if (status === undefined || status >= 500) {
    return { status: 'error', message: getApiError(error).message, retryable: true }
  }

  const apiMessage: unknown = response?.data?.message
  return {
    status: 'error',
    message: typeof apiMessage === 'string' && apiMessage.trim()
      ? apiMessage
      : FALLBACK_MESSAGES[status] ?? FALLBACK_MESSAGES[404],
    retryable: false,
  }
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
