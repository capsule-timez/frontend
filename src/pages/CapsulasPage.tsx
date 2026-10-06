import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getApiErrorDetails, listCapsules } from '../services/capsuleService'
import type { CapsuleStatus, CapsuleSummary } from '../types/capsule'
import './CapsulasPage.css'

const STATUS_LABELS: Record<CapsuleStatus, string> = {
  SCHEDULED: 'Agendada',
  SENT: 'Enviada',
  FAILED: 'Falha no envio',
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; capsules: CapsuleSummary[] }

export function CapsulasPage() {
  const location = useLocation()
  const createdTitle = (location.state as { created?: string } | null)?.created
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    listCapsules()
      .then((capsules) => {
        if (active) setState({ status: 'success', capsules })
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: getApiErrorDetails(error).message })
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="capsulas">
      <header className="capsulas__header">
        <h1>Minhas cápsulas</h1>
        <Link to="/capsulas/nova" className="button">
          Nova cápsula
        </Link>
      </header>

      {createdTitle && (
        <div className="alert alert--success" role="status">
          Cápsula “{createdTitle}” criada e agendada.
        </div>
      )}

      {state.status === 'loading' && <p className="field__hint">Carregando cápsulas…</p>}

      {state.status === 'error' && <div className="alert alert--error">{state.message}</div>}

      {state.status === 'success' && state.capsules.length === 0 && (
        <div className="capsulas__empty">
          <p>Você ainda não criou nenhuma cápsula.</p>
          <Link to="/capsulas/nova" className="button">
            Criar cápsula
          </Link>
        </div>
      )}

      {state.status === 'success' && state.capsules.length > 0 && (
        <ul className="capsulas__list">
          {state.capsules.map((capsule) => (
            <li key={capsule.id} className="capsulas__card">
              <div className="capsulas__card-header">
                <h2 className="capsulas__title">{capsule.title}</h2>
                <span className={`capsulas__status capsulas__status--${capsule.status.toLowerCase()}`}>
                  {STATUS_LABELS[capsule.status]}
                </span>
              </div>
              <dl className="capsulas__meta">
                <div>
                  <dt>Entrega</dt>
                  <dd>{new Date(capsule.scheduleDate).toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                  <dt>Destinatário</dt>
                  <dd>{capsule.recipientEmail}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
