import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { CapsuleStatus, CapsuleSummary } from '../../types/capsule'
import { formatDateTime, formatRelativeTime, isInFuture } from '../../utils/formatDate'
import { Card } from '../Card/Card'
import { CapsuleStatusBadge } from '../CapsuleStatusBadge/CapsuleStatusBadge'
import { Icon, type IconName } from '../Icon/Icon'
import { Skeleton } from '../Skeleton/Skeleton'
import './CapsuleCard.css'

const STATUS_ICONS: Record<CapsuleStatus, IconName> = {
  SCHEDULED: 'lock',
  SENT: 'check',
  FAILED: 'alert',
}

function getHighlight(capsule: CapsuleSummary): string {
  switch (capsule.status) {
    case 'SENT':
      return `Entregue ${formatRelativeTime(capsule.sentAt ?? capsule.scheduleDate)}`
    case 'FAILED':
      return 'Não foi possível entregar esta cápsula'
    case 'SCHEDULED':
      return isInFuture(capsule.scheduleDate)
        ? `Será entregue ${formatRelativeTime(capsule.scheduleDate)}`
        : 'Entrega em andamento'
  }
}

function getDeliveryProgress(capsule: CapsuleSummary): number {
  const start = Date.parse(capsule.createdAt)
  const end = Date.parse(capsule.scheduleDate)

  if (!(end > start)) return 1

  return Math.min(Math.max((Date.now() - start) / (end - start), 0), 1)
}

interface CapsuleCardProps {
  capsule: CapsuleSummary
  index?: number
}

export function CapsuleCard({ capsule, index = 0 }: CapsuleCardProps) {
  const progress = capsule.status === 'SCHEDULED' ? getDeliveryProgress(capsule) : null

  return (
    <Card
      as="li"
      className={`capsule-card capsule-card--${capsule.status.toLowerCase()}`}
      style={{ '--i': Math.min(index, 8) } as CSSProperties}
    >
      <div className="capsule-card__top">
        <span className="capsule-card__icon">
          <Icon name={STATUS_ICONS[capsule.status]} size={20} />
        </span>
        <CapsuleStatusBadge status={capsule.status} />
        {capsule.fileCount > 0 && (
          <span
            className="capsule-card__files"
            title={`${capsule.fileCount} ${capsule.fileCount === 1 ? 'anexo' : 'anexos'}`}
          >
            <Icon name="paperclip" />
            {capsule.fileCount}
            <span className="sr-only">{capsule.fileCount === 1 ? 'anexo' : 'anexos'}</span>
          </span>
        )}
      </div>

      <h2 className="capsule-card__title">
        <Link className="capsule-card__link" to={`/capsulas/${encodeURIComponent(capsule.id)}`}>
          {capsule.title}
        </Link>
      </h2>
      <p className="capsule-card__highlight">{getHighlight(capsule)}</p>

      {progress !== null && (
        <div className="capsule-card__progress-row" aria-hidden="true">
          <div className="capsule-card__progress">
            <span
              className="capsule-card__progress-fill"
              style={{ '--progress': `${Math.round(progress * 100)}%` } as CSSProperties}
            />
          </div>
          <span className="capsule-card__progress-label">{Math.round(progress * 100)}%</span>
        </div>
      )}

      <dl className="capsule-card__meta">
        <div className="capsule-card__meta-row">
          <dt>
            <Icon name="calendar" />
            <span className="sr-only">Data de entrega</span>
          </dt>
          <dd>
            <time dateTime={capsule.scheduleDate}>{formatDateTime(capsule.scheduleDate)}</time>
          </dd>
        </div>
        <div className="capsule-card__meta-row">
          <dt>
            <Icon name="mail" />
            <span className="sr-only">Destinatário</span>
          </dt>
          <dd>{capsule.recipientEmail}</dd>
        </div>
      </dl>
    </Card>
  )
}

export function CapsuleCardSkeleton() {
  return (
    <Card as="li" className="capsule-card" aria-hidden="true">
      <div className="capsule-card__top">
        <Skeleton width="2.5rem" height="2.5rem" />
        <Skeleton width="5.5rem" height="1.4rem" />
      </div>
      <Skeleton width="70%" height="1.35rem" />
      <Skeleton width="45%" />
      <Skeleton width="80%" />
    </Card>
  )
}
