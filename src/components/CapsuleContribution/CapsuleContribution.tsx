import { useState, type FormEvent } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useImageSelection } from '../../hooks/useImageSelection'
import { contributeToCapsule, getApiErrorDetails } from '../../services/capsuleService'
import type { Capsule } from '../../types/capsule'
import { CONTRIBUTION_TEXT_MAX_LENGTH, validateContributionText } from '../../utils/capsuleValidation'
import { isInFuture } from '../../utils/formatDate'
import { MAX_IMAGES_PER_CONTRIBUTION } from '../../utils/imageValidation'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { ContributionList } from '../ContributionList/ContributionList'
import { TextAreaField } from '../FormField/TextAreaField'
import { ImagePicker } from '../ImagePicker/ImagePicker'
import './CapsuleContribution.css'

interface CapsuleContributionProps {
  capsule: Pick<Capsule, 'id' | 'status' | 'contributionDeadline' | 'contributions'>
  onContributed: () => Promise<void>
}

export function CapsuleContribution({ capsule, onContributed }: CapsuleContributionProps) {
  const toast = useToast()
  const images = useImageSelection(MAX_IMAGES_PER_CONTRIBUTION)
  const [text, setText] = useState('')
  const [textError, setTextError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deadlinePassed, setDeadlinePassed] = useState(false)

  const contributions = capsule.contributions ?? []
  // O detalhe não traz o prazo; se ele já passou, a API responde 409 e o formulário fecha.
  const isOpen = capsule.status === 'SCHEDULED' && !deadlinePassed &&
    (!capsule.contributionDeadline || isInFuture(capsule.contributionDeadline))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const error = validateContributionText(text, images.items.length)
    setTextError(error)
    if (error) return

    setIsSubmitting(true)
    try {
      await contributeToCapsule(capsule.id, {
        text: text.trim() || undefined,
        images: images.items.map((item) => item.file),
      })
      setText('')
      images.clear()
      toast.success('Contribuição enviada!')
      await onContributed()
    } catch (err) {
      const details = getApiErrorDetails(err)
      if (details.code === 'CONTRIBUTION_DEADLINE_PASSED') setDeadlinePassed(true)
      toast.error('Não foi possível enviar a contribuição', { description: details.message })
      setTextError(details.fieldErrors.text)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="capsula-detalhe__content capsule-contribution">
      <h2>Contribuições</h2>

      {contributions.length > 0
        ? <ContributionList contributions={contributions} />
        : <p>Ninguém contribuiu ainda.</p>}

      {isOpen ? (
        <form className="capsule-contribution__form" onSubmit={handleSubmit} noValidate>
          <h3>Nova contribuição</h3>
          <p className="capsule-contribution__hint">
            Envie um texto, até {MAX_IMAGES_PER_CONTRIBUTION} imagens ou os dois. Você pode contribuir
            mais de uma vez até o prazo, e cada contribuição fica visível para os participantes e não
            pode ser alterada depois de enviada.
          </p>
          <TextAreaField
            id="capsule-contribution-text"
            name="text"
            label="Sua mensagem (opcional com imagens)"
            counter={`${text.length.toLocaleString('pt-BR')}/${CONTRIBUTION_TEXT_MAX_LENGTH.toLocaleString('pt-BR')}`}
            maxLength={CONTRIBUTION_TEXT_MAX_LENGTH}
            rows={5}
            value={text}
            error={textError}
            disabled={isSubmitting}
            onChange={(event) => {
              setText(event.target.value)
              setTextError(undefined)
            }}
          />
          <ImagePicker
            items={images.items}
            rejections={images.rejections}
            maxFiles={MAX_IMAGES_PER_CONTRIBUTION}
            disabled={isSubmitting}
            onAdd={(files) => {
              images.add(files)
              setTextError(undefined)
            }}
            onRemove={images.remove}
          />
          <div className="capsule-contribution__actions">
            <Button type="submit" icon="send" loading={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar contribuição'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="capsule-contribution__hint">O prazo para contribuições desta cápsula terminou.</p>
      )}
    </Card>
  )
}
