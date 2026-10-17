import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, ButtonLink } from '../components/Button/Button'
import { CapsuleCard, CapsuleCardSkeleton } from '../components/CapsuleCard/CapsuleCard'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Hero } from '../components/Hero/Hero'
import { SegmentedControl } from '../components/SegmentedControl/SegmentedControl'
import { useAuth } from '../contexts/AuthContext'
import { getApiErrorDetails, listCapsules } from '../services/capsuleService'
import type { CapsuleStatus, CapsuleSummary, PaginatedResponse } from '../types/capsule'
import './CapsulasPage.css'

type StatusFilter = 'ALL' | CapsuleStatus
type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; result: PaginatedResponse<CapsuleSummary> }

export function CapsulasPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status')
  const filter: StatusFilter = status === 'SCHEDULED' || status === 'SENT' || status === 'FAILED' ? status : 'ALL'
  const requestedPage = Number(searchParams.get('page') ?? 1)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1

  function navigate(nextFilter: StatusFilter, nextPage: number) {
    setSearchParams((current) => {
      const params = new URLSearchParams(current)
      if (nextFilter === 'ALL') params.delete('status')
      else params.set('status', nextFilter)
      params.set('page', String(nextPage))
      return params
    })
  }

  return (
    <section className="capsulas">
      <Hero
        eyebrow={user ? `Olá, ${user.name.split(' ')[0]}` : 'Olá'}
        title="Suas mensagens para o futuro"
        description="Acompanhe suas cápsulas e os próximos envios."
        actions={<ButtonLink to="/capsulas/nova" variant="dark" icon="plus">Nova cápsula</ButtonLink>}
      />
      <div className="capsulas__toolbar">
        <h2 className="capsulas__heading">Suas cápsulas</h2>
        <SegmentedControl<StatusFilter> label="Filtrar por status" value={filter}
          onChange={(value) => navigate(value, 1)}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'SCHEDULED', label: 'Agendadas' },
            { value: 'SENT', label: 'Enviadas' },
            { value: 'FAILED', label: 'Falharam' },
          ]}
        />
      </div>
      <CapsuleResults key={`${filter}:${page}`} filter={filter} page={page}
        onPageChange={(value) => navigate(filter, value)} onClearFilter={() => navigate('ALL', 1)} />
    </section>
  )
}

function CapsuleResults({ filter, page, onPageChange, onClearFilter }: {
  filter: StatusFilter
  page: number
  onPageChange: (page: number) => void
  onClearFilter: () => void
}) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    listCapsules({ status: filter === 'ALL' ? undefined : filter, page }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ status: 'success', result })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', message: getApiErrorDetails(error).message })
      })
    return () => controller.abort()
  }, [filter, page, attempt])

  if (state.status === 'loading') return (
    <ul className="capsulas__list" aria-busy="true" aria-label="Carregando cápsulas">
      {Array.from({ length: 3 }, (_, index) => <CapsuleCardSkeleton key={index} />)}
    </ul>
  )
  if (state.status === 'error') return (
    <EmptyState icon="alert" title="Não foi possível carregar suas cápsulas" description={state.message}
      action={<Button variant="secondary" onClick={() => {
        setState({ status: 'loading' })
        setAttempt((value) => value + 1)
      }}>Tentar novamente</Button>} />
  )

  const { data: capsules, meta } = state.result
  return (
    <>
      {capsules.length > 0 ? (
        <ul className="capsulas__list">
          {capsules.map((capsule, index) => <CapsuleCard key={capsule.id} capsule={capsule} index={index} />)}
        </ul>
      ) : (
        <EmptyState icon="hourglass"
          title={page > 1 ? 'Nenhuma cápsula nesta página' : filter === 'ALL' ? 'Nenhuma cápsula por aqui ainda' : 'Nenhuma cápsula neste filtro'}
          action={page > 1 ? <Button variant="secondary" onClick={() => onPageChange(1)}>Voltar à primeira página</Button>
            : filter !== 'ALL' ? <Button variant="secondary" onClick={onClearFilter}>Ver todas</Button>
              : <ButtonLink to="/capsulas/nova" icon="plus">Criar primeira cápsula</ButtonLink>} />
      )}
      {meta.totalPages > 0 && (
        <nav className="capsulas__pagination" aria-label="Paginação de cápsulas">
          <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</Button>
          <span role="status">Página {page} de {meta.totalPages} · {meta.total} cápsulas</span>
          <Button variant="secondary" disabled={page >= meta.totalPages} onClick={() => onPageChange(page + 1)}>Próxima</Button>
        </nav>
      )}
    </>
  )
}
