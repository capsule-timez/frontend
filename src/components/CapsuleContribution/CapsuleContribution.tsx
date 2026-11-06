import { useState, type FormEvent } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useImageSelection } from '../../hooks/useImageSelection'
import { contributeToCapsule, getApiErrorDetails } from '../../services/capsuleService'
import type { Capsule } from '../../types/capsule'
import { TEXT_MAX_LENGTH, validateContributionText } from '../../utils/capsuleValidation'
import { formatDateTime, isInFuture } from '../../utils/formatDate'
import { MAX_IMAGES_PER_PARTICIPANT } from '../../utils/imageValidation'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { CapsuleImage } from '../CapsuleImage/CapsuleImage'
import { TextAreaField } from '../FormField/TextAreaField'
import { ImagePicker } from '../ImagePicker/ImagePicker'
import './CapsuleContribution.css'

interface CapsuleContributionProps {
  capsule: Capsule
  onContributed: () => Promise<void>
}

export function CapsuleContribution({ capsule, onContributed }: CapsuleContributionProps) {
  const toast = useToast()
  const images = useImageSelection(MAX_IMAGES_PER_PARTICIPANT)
  const [text, setText] = useState('')
  const [textError, setTextError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const contribution = capsule.myContribution ?? null
  const deadline = capsule.contributionDeadline
  const isOpen = capsule.status === 'SCHEDULED' && Boolean(deadline && isInFuture(deadline))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!contribution) {
      const error = validateContributionText(text)
      setTextError(error)
      if (error) return
    }

    setIsSubmitting(true)
    try {
      if (!contribution) await contributeToCapsule(capsule.id, text.trim())
      const { failed } = images.items.length > 0 ? await images.upload(capsule.id) : { failed: 0 }
      if (failed > 0) {
        toast.error('A imagem não foi enviada', { description: 'Veja o erro na miniatura e tente novamente.' })
      } else {
        toast.success('Contribuição enviada!')
      }
      await onContributed()
    } catch (error) {
      const details = getApiErrorDetails(error)
      toast.error(details.message)
      setTextError(details.fieldErrors.text)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="capsula-detalhe__content capsule-contribution">
      <h2>Sua contribuição</h2>

      {contribution && (
        <>
          <p className="capsule-contribution__text">{contribution.text}</p>
          {contribution.file && <CapsuleImage key={contribution.file.downloadUrl} file={contribution.file} />}
        </>
      )}

      {!contribution && !isOpen && <p>Você não enviou uma contribuição para esta cápsula.</p>}

      {isOpen && deadline && (!contribution || !contribution.file) && (
        <form className="capsule-contribution__form" onSubmit={handleSubmit} noValidate>
          <p className="capsule-contribution__hint">
            {contribution ? 'Você ainda pode anexar 1 imagem' : 'Deixe 1 texto e 1 imagem'} até{' '}
            <time dateTime={deadline}>{formatDateTime(deadline)}</time>. As contribuições ficam
            lacradas até a entrega e, depois de enviadas, não podem ser alteradas.
          </p>
          {!contribution && (
            <TextAreaField
              id="capsule-contribution-text"
              name="text"
              label="Sua mensagem"
              counter={`${text.length.toLocaleString('pt-BR')}/${TEXT_MAX_LENGTH.toLocaleString('pt-BR')}`}
              maxLength={TEXT_MAX_LENGTH}
              rows={5}
              value={text}
              error={textError}
              onChange={(event) => {
                setText(event.target.value)
                setTextError(undefined)
              }}
            />
          )}
          <ImagePicker
            items={images.items}
            rejections={images.rejections}
            maxFiles={MAX_IMAGES_PER_PARTICIPANT}
            disabled={isSubmitting}
            onAdd={images.add}
            onRemove={images.remove}
          />
          {(!contribution || images.items.length > 0) && (
            <div className="capsule-contribution__actions">
              <Button type="submit" icon="send" loading={isSubmitting}>
                {isSubmitting ? 'Enviando…' : contribution ? 'Enviar imagem' : 'Enviar contribuição'}
              </Button>
            </div>
          )}
        </form>
      )}
    </Card>
  )
}
