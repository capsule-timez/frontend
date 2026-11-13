import axios from 'axios'
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Alert } from '../components/Alert/Alert'
import { AuthCard } from '../components/AuthCard/AuthCard'
import { Button, ButtonLink } from '../components/Button/Button'
import { getApiError } from '../services/apiError'
import { acceptInvite } from '../services/inviteService'

type InviteState =
  | { status: 'loading' }
  | { status: 'accepted'; capsuleId: string }
  | { status: 'error'; message: string; retryable: boolean }

export function ConvitePage() {
  const { token = '' } = useParams()
  return <Convite key={token} token={token} />
}

function Convite({ token }: { token: string }) {
  const [state, setState] = useState<InviteState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    // Aguarda a limpeza do primeiro efeito no StrictMode antes do POST de uso único.
    queueMicrotask(async () => {
      if (controller.signal.aborted) return
      try {
        const capsuleId = await acceptInvite(token, controller.signal)
        if (!controller.signal.aborted) setState({ status: 'accepted', capsuleId })
      } catch (error) {
        if (controller.signal.aborted) return
        const response = axios.isAxiosError(error) ? error.response : undefined
        const status = response?.status
        const fallback = status === 410 ? 'Este convite expirou.'
          : status === 409 ? 'Este convite já foi utilizado.'
          : 'Este convite é inválido ou não está mais disponível.'
        const message = status && status < 500
          ? (typeof response?.data?.message === 'string' ? response.data.message : fallback)
          : getApiError(error).message
        setState({ status: 'error', message, retryable: status === undefined || status >= 500 })
      }
    })
    return () => controller.abort()
  }, [token, attempt])

  if (state.status === 'accepted') {
    return <Navigate to={`/capsulas/${encodeURIComponent(state.capsuleId)}`} replace />
  }

  return (
    <AuthCard title="Convite para cápsula" footer={<ButtonLink to="/capsulas" variant="ghost">Ver minhas cápsulas</ButtonLink>}>
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
