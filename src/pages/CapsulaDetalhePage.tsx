import axios from 'axios'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, ButtonLink } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { CapsuleStatusBadge } from '../components/CapsuleStatusBadge/CapsuleStatusBadge'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { getApiErrorDetails, getCapsule } from '../services/capsuleService'
import type { Capsule } from '../types/capsule'
import { formatDateTime } from '../utils/formatDate'
import './CapsulaDetalhePage.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; capsule: Capsule }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

export function CapsulaDetalhePage() {
  const { id = '' } = useParams()
  // Remount on navigation so another capsule's content is never displayed while loading.
  return <CapsulaDetalhe key={id} id={id} />
}

function CapsulaDetalhe({ id }: { id: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getCapsule(id, controller.signal)
      .then((capsule) => {
        if (!controller.signal.aborted) setState({ status: 'success', capsule })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setState({ status: 'not-found' })
        } else {
          setState({ status: 'error', message: getApiErrorDetails(error).message })
        }
      })
    return () => controller.abort()
  }, [id, attempt])

  return (
    <section className="capsula-detalhe page-enter">
      <ButtonLink to="/capsulas" variant="ghost">Voltar para cápsulas</ButtonLink>
      {state.status === 'loading' && <p role="status" aria-busy="true">Carregando cápsula…</p>}
      {state.status === 'not-found' && (
        <EmptyState icon="alert" title="Cápsula não encontrada" />
      )}
      {state.status === 'error' && (
        <EmptyState
          icon="alert"
          title="Não foi possível carregar a cápsula"
          description={state.message}
          action={<Button variant="secondary" onClick={() => {
            setState({ status: 'loading' })
            setAttempt((value) => value + 1)
          }}>Tentar novamente</Button>}
        />
      )}
      {state.status === 'success' && (
        <>
          <PageHeader title={state.capsule.title} />
          <Card className="capsula-detalhe__content">
            <dl className="capsula-detalhe__meta">
              <div><dt>Destinatário</dt><dd>{state.capsule.recipientEmail}</dd></div>
              <div><dt>Data de entrega</dt><dd><time dateTime={state.capsule.scheduleDate}>{formatDateTime(state.capsule.scheduleDate)}</time></dd></div>
              <div><dt>Status</dt><dd><CapsuleStatusBadge status={state.capsule.status} /></dd></div>
            </dl>
            <h2>Mensagem</h2>
            <p className="capsula-detalhe__message">{state.capsule.text}</p>
          </Card>
          <Card className="capsula-detalhe__content">
            <h2>Anexos</h2>
            {state.capsule.files.length === 0 ? <p>Nenhum anexo nesta cápsula.</p> : (
              <ul className="capsula-detalhe__files">
                {state.capsule.files.map((file) => (
                  <li key={file.id}>
                    <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">{file.fileName}</a>
                    <span> ({new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(file.fileSize / 1024)} KB)</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </section>
  )
}
