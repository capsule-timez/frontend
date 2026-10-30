import axios from 'axios'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { CapsuleImage } from '../components/CapsuleImage/CapsuleImage'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Icon } from '../components/Icon/Icon'
import { getApiErrorDetails, getPublicCapsule } from '../services/capsuleService'
import type { PublicCapsule } from '../types/capsule'
import { formatDateTime } from '../utils/formatDate'
import './CapsulaPublicaPage.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; capsule: PublicCapsule }
  | { status: 'not-found' }
  | { status: 'error'; message: string }

export function CapsulaPublicaPage() {
  const { token = '' } = useParams()
  return <CapsulaPublica key={token} token={token} />
}

function CapsulaPublica({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getPublicCapsule(token, controller.signal)
      .then((capsule) => {
        if (!controller.signal.aborted) setState({ status: 'success', capsule })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        if (status === 404 || status === 400) {
          setState({ status: 'not-found' })
        } else {
          setState({ status: 'error', message: getApiErrorDetails(error).message })
        }
      })
    return () => controller.abort()
  }, [token, attempt])

  return (
    <section className="capsula-publica page-enter">
      {state.status === 'loading' && <p role="status" aria-busy="true">Abrindo cápsula…</p>}
      {state.status === 'not-found' && (
        <EmptyState
          icon="hourglass"
          title="Cápsula não encontrada"
          description="Este link é inválido ou a cápsula ainda não foi entregue. Confira se o endereço está igual ao do e-mail recebido."
        />
      )}
      {state.status === 'error' && (
        <EmptyState
          icon="alert"
          title="Não foi possível abrir a cápsula"
          description={state.message}
          action={<Button variant="secondary" onClick={() => {
            setState({ status: 'loading' })
            setAttempt((value) => value + 1)
          }}>Tentar novamente</Button>}
        />
      )}
      {state.status === 'success' && <CapsuleContent capsule={state.capsule} />}
    </section>
  )
}

function CapsuleContent({ capsule }: { capsule: PublicCapsule }) {
  const images = capsule.files.filter((file) => file.mimeType.startsWith('image/'))
  const others = capsule.files.filter((file) => !file.mimeType.startsWith('image/'))

  return (
    <>
      <header className="capsula-publica__header">
        <p className="capsula-publica__eyebrow">
          <Icon name="mail" size={16} />
          Uma cápsula do tempo para você
        </p>
        <h1 className="capsula-publica__title">{capsule.title}</h1>
        <dl className="capsula-publica__meta">
          <div><dt>Enviada por</dt><dd>{capsule.creatorName}</dd></div>
          <div><dt>Entregue em</dt><dd><time dateTime={capsule.sentAt}>{formatDateTime(capsule.sentAt)}</time></dd></div>
        </dl>
      </header>
      <Card className="capsula-publica__content">
        <h2>Mensagem</h2>
        <p className="capsula-publica__message">{capsule.text}</p>
      </Card>
      {images.length > 0 && (
        <Card className="capsula-publica__content">
          <h2>Imagens</h2>
          <ul className="capsula-publica__gallery">
            {images.map((file) => (
              <li key={file.id}>
                <CapsuleImage key={file.downloadUrl} file={file} />
              </li>
            ))}
          </ul>
        </Card>
      )}
      {others.length > 0 && (
        <Card className="capsula-publica__content">
          <h2>Outros anexos</h2>
          <ul className="capsula-publica__files">
            {others.map((file) => (
              <li key={file.id}>
                <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">{file.fileName}</a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
