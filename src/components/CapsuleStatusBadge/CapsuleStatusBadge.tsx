import type { CapsuleStatus } from '../../types/capsule'
import { Badge, type BadgeTone } from '../Badge/Badge'
import type { IconName } from '../Icon/Icon'

const STATUS_BADGES: Record<CapsuleStatus, { label: string; tone: BadgeTone; icon: IconName }> = {
  SCHEDULED: { label: 'Agendada', tone: 'warning', icon: 'lock' },
  SENT: { label: 'Enviada', tone: 'success', icon: 'check' },
  FAILED: { label: 'Falha no envio', tone: 'danger', icon: 'alert' },
}

export function CapsuleStatusBadge({ status }: { status: CapsuleStatus }) {
  const { label, tone, icon } = STATUS_BADGES[status]

  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  )
}
