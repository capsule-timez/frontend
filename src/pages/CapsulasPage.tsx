import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, ButtonLink } from '../components/Button/Button'
import { CapsuleCard, CapsuleCardSkeleton } from '../components/CapsuleCard/CapsuleCard'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { Hero } from '../components/Hero/Hero'
import { SegmentedControl } from '../components/SegmentedControl/SegmentedControl'
import { useAuth } from '../contexts/AuthContext'
import { getApiErrorDetails, listCapsules } from '../services/capsuleService'
import type { CapsuleStatus, CapsuleSummary } from '../types/capsule'
import { formatDateTime, formatRelativeTime, isInFuture } from '../utils/formatDate'
import './CapsulasPage.css'

type StatusFilter = 'ALL' | CapsuleStatus

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; capsules: CapsuleSummary[] }

const SKELETON_COUNT = 3

function sortCapsules(capsules: CapsuleSummary[]): CapsuleSummary[] {
  const upcoming = capsules
    .filter((capsule) => capsule.status === 'SCHEDULED')
    .sort((a, b) => Date.parse(a.scheduleDate) - Date.parse(b.scheduleDate))
  const history = capsules
    .filter((capsule) => capsule.status !== 'SCHEDULED')
    .sort((a, b) => Date.parse(b.scheduleDate) - Date.parse(a.scheduleDate))

  return [...upcoming, ...history]
}

function countByStatus(capsules: CapsuleSummary[], status: CapsuleStatus): number {
  return capsules.filter((capsule) => capsule.status === status).length
}

export function CapsulasPage() {
  const { user } = useAuth()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [filter, setFilter] = useState<StatusFilter>('ALL')

  const load = useCallback(
    () =>
      listCapsules()
        .then((capsules) => setState({ status: 'success', capsules: sortCapsules(capsules) }))
        .catch((error: unknown) =>
          setState({ status: 'error', message: getApiErrorDetails(error).message }),
        ),
    [],
  )

  useEffect(() => {
    void load()
  }, [load])

  function retry() {
    setState({ status: 'loading' })
    void load()
  }

  const capsules = useMemo(() => (state.status === 'success' ? state.capsules : []), [state])
  const visibleCapsules = useMemo(
    () => (filter === 'ALL' ? capsules : capsules.filter((capsule) => capsule.status === filter)),
    [capsules, filter],
  )

  const nextCapsule = capsules.find(
    (capsule) => capsule.status === 'SCHEDULED' && isInFuture(capsule.scheduleDate),
  )
  const firstName = user?.name.split(' ')[0]

  return (
    <section className="capsulas">
      <Hero
        eyebrow={firstName ? `Olá, ${firstName}` : 'Olá'}
        title={
          nextCapsule
            ? `“${nextCapsule.title}” chega ${formatRelativeTime(nextCapsule.scheduleDate)}`
            : 'Guarde algo para o futuro'
        }
        description={
          nextCapsule
            ? `Lacrada até ${formatDateTime(nextCapsule.scheduleDate)}.`
            : 'Escreva uma mensagem hoje e deixe que ela chegue quando o momento certo vier.'
        }
        actions={
          <ButtonLink to="/capsulas/nova" variant="dark" icon="plus">
            Nova cápsula
          </ButtonLink>
        }
        stats={
          state.status === 'success' && capsules.length > 0
            ? [
                { label: 'Agendadas', value: countByStatus(capsules, 'SCHEDULED') },
                { label: 'Enviadas', value: countByStatus(capsules, 'SENT') },
                { label: 'Total', value: capsules.length },
              ]
            : undefined
        }
      />

      {state.status === 'loading' && (
        <ul className="capsulas__list" aria-busy="true" aria-label="Carregando cápsulas">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <CapsuleCardSkeleton key={index} />
          ))}
        </ul>
      )}

      {state.status === 'error' && (
        <EmptyState
          icon="alert"
          title="Não foi possível carregar suas cápsulas"
          description={state.message}
          action={
            <Button variant="secondary" onClick={retry}>
              Tentar novamente
            </Button>
          }
        />
      )}

      {state.status === 'success' && capsules.length === 0 && (
        <EmptyState
          icon="hourglass"
          title="Nenhuma cápsula por aqui ainda"
          description="Escreva uma mensagem hoje e deixe que ela chegue no futuro."
          action={
            <ButtonLink to="/capsulas/nova" icon="plus">
              Criar primeira cápsula
            </ButtonLink>
          }
        />
      )}

      {state.status === 'success' && capsules.length > 0 && (
        <>
          <div className="capsulas__toolbar">
            <h2 className="capsulas__heading">Suas cápsulas</h2>
            <SegmentedControl<StatusFilter>
              label="Filtrar por status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'Todas', count: capsules.length },
                { value: 'SCHEDULED', label: 'Agendadas', count: countByStatus(capsules, 'SCHEDULED') },
                { value: 'SENT', label: 'Enviadas', count: countByStatus(capsules, 'SENT') },
                { value: 'FAILED', label: 'Com falha', count: countByStatus(capsules, 'FAILED') },
              ]}
            />
          </div>

          {visibleCapsules.length === 0 ? (
            <EmptyState
              icon="mail"
              title="Nenhuma cápsula neste filtro"
              action={
                <Button variant="secondary" onClick={() => setFilter('ALL')}>
                  Ver todas
                </Button>
              }
            />
          ) : (
     
            <ul key={filter} className="capsulas__list">
              {visibleCapsules.map((capsule, index) => (
                <CapsuleCard key={capsule.id} capsule={capsule} index={index} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
