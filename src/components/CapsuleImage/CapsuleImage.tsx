import { useState } from 'react'
import type { CapsuleFile } from '../../types/capsule'
import { Icon } from '../Icon/Icon'
import { Skeleton } from '../Skeleton/Skeleton'
import './CapsuleImage.css'

type ImageStatus = 'loading' | 'loaded' | 'error'

interface CapsuleImageProps {
  file: CapsuleFile
}

export function CapsuleImage({ file }: CapsuleImageProps) {
  const [status, setStatus] = useState<ImageStatus>('loading')

  return (
    <figure className={`capsule-image capsule-image--${status}`}>
      <div className="capsule-image__frame">
        {status === 'loading' && (
          <span className="capsule-image__placeholder" role="status" aria-label={`Carregando ${file.fileName}`}>
            <Skeleton height="100%" />
          </span>
        )}
        {status === 'error' ? (
          <div className="capsule-image__error" role="alert">
            <Icon name="alert" size={22} />
            <span>Não foi possível carregar a imagem.</span>
          </div>
        ) : (
          <a
            href={file.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver ${file.fileName} em tamanho original`}
          >
            <img
              src={file.downloadUrl}
              alt={file.fileName}
              loading="lazy"
              onLoad={() => setStatus('loaded')}
              onError={() => setStatus('error')}
            />
          </a>
        )}
      </div>
      <figcaption className="capsule-image__caption">
        <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer">{file.fileName}</a>
      </figcaption>
    </figure>
  )
}
