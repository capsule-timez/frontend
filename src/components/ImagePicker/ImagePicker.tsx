import { useId, useRef } from 'react'
import type { SelectedImage } from '../../hooks/useImageSelection'
import { ALLOWED_IMAGE_TYPES } from '../../utils/imageValidation'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import './ImagePicker.css'

interface ImagePickerProps {
  items: SelectedImage[]
  rejections: string[]
  /** Quantas imagens ainda cabem na cápsula. */
  maxFiles: number
  disabled?: boolean
  onAdd: (files: FileList) => void
  onRemove: (key: string) => void
}

export function ImagePicker({ items, rejections, maxFiles, disabled, onAdd, onRemove }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const full = items.length >= maxFiles

  return (
    <div className="image-picker">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) onAdd(event.target.files)
          // Permite escolher o mesmo arquivo de novo depois de removê-lo.
          event.target.value = ''
        }}
      />
      <div className="image-picker__bar">
        <Button
          variant="secondary"
          icon="plus"
          disabled={disabled || full}
          aria-describedby={hintId}
          onClick={() => inputRef.current?.click()}
        >
          Escolher imagens
        </Button>
        <span id={hintId} className="image-picker__hint">
          {items.length}/{maxFiles} · JPEG, PNG ou WebP · até 10 MB cada
        </span>
      </div>

      {rejections.length > 0 && (
        <ul className="image-picker__errors" role="alert">
          {rejections.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <ul className="image-picker__grid">
          {items.map((item) => (
            <li key={item.key} className={`image-picker__item image-picker__item--${item.status}`}>
              <img src={item.previewUrl} alt={`Miniatura de ${item.file.name}`} />
              <span className="image-picker__name">{item.file.name}</span>
              {item.status === 'uploading' && (
                <span className="image-picker__status" role="status">
                  <span className="btn__spinner" aria-hidden="true" /> Enviando…
                </span>
              )}
              {item.status === 'error' && (
                <span className="image-picker__error" role="alert">{item.error}</span>
              )}
              <button
                type="button"
                className="image-picker__remove"
                aria-label={`Remover ${item.file.name}`}
                disabled={disabled || item.status === 'uploading'}
                onClick={() => onRemove(item.key)}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
