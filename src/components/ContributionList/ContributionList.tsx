import type { CapsuleContribution } from '../../types/capsule'
import { formatDateTime } from '../../utils/formatDate'
import { CapsuleImage } from '../CapsuleImage/CapsuleImage'
import './ContributionList.css'

interface ContributionListProps {
  contributions: CapsuleContribution[]
  label?: string
}

export function ContributionList({ contributions, label = 'Contribuições' }: ContributionListProps) {
  return (
    <ul className="contribution-list" aria-label={label}>
      {contributions.map((contribution) => (
        <li key={contribution.id} className="contribution-list__item">
          <p className="contribution-list__header">
            <strong>{contribution.author.name}</strong>
            <time dateTime={contribution.createdAt}>{formatDateTime(contribution.createdAt)}</time>
          </p>
          {contribution.text && <p className="contribution-list__text">{contribution.text}</p>}
          {contribution.files.length > 0 && (
            <ul className="contribution-list__gallery" aria-label={`Imagens de ${contribution.author.name}`}>
              {contribution.files.map((file) => (
                <li key={file.id}>
                  <CapsuleImage key={file.downloadUrl} file={file} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
