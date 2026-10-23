import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../components/Alert/Alert'
import { Button, ButtonLink } from '../components/Button/Button'
import { FormField } from '../components/FormField/FormField'
import { TextAreaField } from '../components/FormField/TextAreaField'
import { Icon, type IconName } from '../components/Icon/Icon'
import { ImagePicker } from '../components/ImagePicker/ImagePicker'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useImageSelection } from '../hooks/useImageSelection'
import { createCapsule, getApiErrorDetails } from '../services/capsuleService'
import { formatDateTime, formatRelativeTime } from '../utils/formatDate'
import { MAX_IMAGES_PER_CAPSULE } from '../utils/imageValidation'
import {
  TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  getMinScheduleDate,
  toDateTimeLocalValue,
  validateCapsuleForm,
  validateScheduleDate,
  type CapsuleFormErrors,
  type CapsuleFormField,
  type CapsuleFormValues,
  type RecipientMode,
} from '../utils/capsuleValidation'
import './NovaCapsulaPage.css'

const INITIAL_VALUES: CapsuleFormValues = {
  title: '',
  text: '',
  scheduleDate: '',
  recipientMode: 'self',
  recipientEmail: '',
}

const FIELD_ORDER: CapsuleFormField[] = ['title', 'text', 'scheduleDate', 'recipientEmail']

const FIELD_IDS: Record<CapsuleFormField, string> = {
  title: 'capsule-title',
  text: 'capsule-text',
  scheduleDate: 'capsule-schedule-date',
  recipientEmail: 'capsule-recipient-email',
}

/** Atalhos de data: a maioria das cápsulas é "daqui a um tempo", não uma data exata. */
const SCHEDULE_PRESETS: { label: string; apply: (date: Date) => void }[] = [
  { label: 'Amanhã', apply: (date) => date.setDate(date.getDate() + 1) },
  { label: 'Em 1 semana', apply: (date) => date.setDate(date.getDate() + 7) },
  { label: 'Em 1 mês', apply: (date) => date.setMonth(date.getMonth() + 1) },
  { label: 'Em 1 ano', apply: (date) => date.setFullYear(date.getFullYear() + 1) },
]

const RECIPIENT_OPTIONS: { mode: RecipientMode; label: string; description: string; icon: IconName }[] =
  [
    { mode: 'self', label: 'Para mim', description: 'Chega no seu e-mail', icon: 'user' },
    { mode: 'other', label: 'Para outra pessoa', description: 'Escolha o destinatário', icon: 'send' },
  ]

export function NovaCapsulaPage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [values, setValues] = useState<CapsuleFormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<CapsuleFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const images = useImageSelection(MAX_IMAGES_PER_CAPSULE)

  const minScheduleDate = toDateTimeLocalValue(getMinScheduleDate())
  const scheduleIso =
    values.scheduleDate && !errors.scheduleDate && !validateScheduleDate(values.scheduleDate)
      ? new Date(values.scheduleDate).toISOString()
      : null

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const field = event.target.name as keyof CapsuleFormValues
    const value = event.target.value

    setValues((current) => ({ ...current, [field]: value }))

    if (field === 'scheduleDate') {
      // Data no passado é sinalizada assim que escolhida, sem esperar o envio.
      setErrors((current) => ({
        ...current,
        scheduleDate: value ? validateScheduleDate(value) : undefined,
      }))
    } else if (field in errors) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  function handlePreset(apply: (date: Date) => void) {
    const date = new Date()
    apply(date)
    date.setSeconds(0, 0)

    const value = toDateTimeLocalValue(date)
    setValues((current) => ({ ...current, scheduleDate: value }))
    setErrors((current) => ({ ...current, scheduleDate: validateScheduleDate(value) }))
  }

  function handleRecipientModeChange(mode: RecipientMode) {
    setValues((current) => ({ ...current, recipientMode: mode }))
    setErrors((current) => ({ ...current, recipientEmail: undefined }))
  }

  function focusFirstError(fieldErrors: CapsuleFormErrors) {
    const first = FIELD_ORDER.find((field) => fieldErrors[field])
    if (first) document.getElementById(FIELD_IDS[first])?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const validationErrors = validateCapsuleForm(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      focusFirstError(validationErrors)
      return
    }

    const recipientEmail =
      values.recipientMode === 'self' ? (user?.email ?? '') : values.recipientEmail.trim()

    setIsSubmitting(true)
    try {
      const capsule = await createCapsule({
        title: values.title.trim(),
        text: values.text.trim(),
        recipientEmail,
        scheduleDate: new Date(values.scheduleDate).toISOString(),
      })
      // A cápsula já existe; falha em imagens não a desfaz, o usuário reenvia pelo detalhe.
      const uploads = images.items.length > 0 ? await images.upload(capsule.id) : { sent: 0, failed: 0 }
      if (uploads.failed > 0) {
        toast.error('Cápsula criada, mas algumas imagens não foram enviadas', {
          description: 'Abra a cápsula para tentar enviar as imagens novamente.',
        })
        navigate(`/capsulas/${capsule.id}`)
        return
      }
      toast.success('Cápsula agendada!', {
        description: `“${capsule.title}” será entregue ${formatRelativeTime(capsule.scheduleDate)}.`,
      })
      navigate('/capsulas')
    } catch (error) {
      const details = getApiErrorDetails(error)

      if (details.code === 'VALIDATION_ERROR' && Object.keys(details.fieldErrors).length > 0) {
        const apiErrors: CapsuleFormErrors = {}
        for (const field of FIELD_ORDER) {
          if (details.fieldErrors[field]) apiErrors[field] = details.fieldErrors[field]
        }
        setErrors(apiErrors)
        focusFirstError(apiErrors)
        setFormError('Revise os campos destacados.')
      } else if (details.code === 'UNAUTHORIZED' || details.code === 'TOKEN_EXPIRED') {
        setFormError('Sessão inválida ou expirada. Faça login novamente.')
      } else {
        setFormError(details.message)
        toast.error('Não foi possível criar a cápsula', { description: details.message })
      }
      setIsSubmitting(false)
    }
  }

  function fieldProps(field: CapsuleFormField) {
    return {
      id: FIELD_IDS[field],
      name: field,
      error: errors[field],
    }
  }

  return (
    <section className="nova-capsula page-enter">
      <PageHeader
        title="Nova cápsula"
        description="Escreva hoje, entregue no futuro. Ela fica lacrada até o momento escolhido."
      />

      <form className="nova-capsula__form" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}

        <fieldset className="nova-capsula__step">
          <legend className="nova-capsula__step-title">
            <span className="nova-capsula__step-number">1</span>
            Escreva a mensagem
          </legend>
          <FormField
            {...fieldProps('title')}
            label="Título"
            counter={`${values.title.length}/${TITLE_MAX_LENGTH}`}
            type="text"
            maxLength={TITLE_MAX_LENGTH}
            value={values.title}
            onChange={handleChange}
            placeholder="Para mim daqui a um ano"
          />
          <TextAreaField
            {...fieldProps('text')}
            label="Mensagem"
            counter={`${values.text.length.toLocaleString('pt-BR')}/${TEXT_MAX_LENGTH.toLocaleString('pt-BR')}`}
            maxLength={TEXT_MAX_LENGTH}
            rows={8}
            value={values.text}
            onChange={handleChange}
            placeholder="O que você quer dizer ao futuro?"
          />
        </fieldset>

        <fieldset className="nova-capsula__step nova-capsula__step--highlight">
          <legend className="nova-capsula__step-title">
            <span className="nova-capsula__step-number">2</span>
            Quando entregar?
          </legend>
          <div className="nova-capsula__presets" role="group" aria-label="Atalhos de data">
            {SCHEDULE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="nova-capsula__preset"
                onClick={() => handlePreset(preset.apply)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <FormField
            {...fieldProps('scheduleDate')}
            label="Data e hora de entrega"
            type="datetime-local"
            min={minScheduleDate}
            value={values.scheduleDate}
            onChange={handleChange}
          />
          {scheduleIso && (
            <p className="nova-capsula__preview" key={scheduleIso}>
              <Icon name="lock" size={16} />
              <span>
                Lacrada até <strong>{formatDateTime(scheduleIso)}</strong> (
                {formatRelativeTime(scheduleIso)})
              </span>
            </p>
          )}
        </fieldset>

        <fieldset className="nova-capsula__step">
          <legend className="nova-capsula__step-title">
            <span className="nova-capsula__step-number">3</span>
            Para quem?
          </legend>
          <div className="nova-capsula__options">
            {RECIPIENT_OPTIONS.map((option) => (
              <label key={option.mode} className="nova-capsula__option">
                <input
                  type="radio"
                  name="recipientMode"
                  value={option.mode}
                  checked={values.recipientMode === option.mode}
                  onChange={() => handleRecipientModeChange(option.mode)}
                />
                <span className="nova-capsula__option-icon">
                  <Icon name={option.icon} size={20} />
                </span>
                <span>
                  <span className="nova-capsula__option-label">{option.label}</span>
                  <span className="nova-capsula__option-description">{option.description}</span>
                </span>
              </label>
            ))}
          </div>

          {values.recipientMode === 'self' ? (
            <p className="nova-capsula__self">
              <Icon name="mail" size={16} />
              Será entregue em <strong>{user?.email}</strong>
            </p>
          ) : (
            <FormField
              {...fieldProps('recipientEmail')}
              label="E-mail do destinatário"
              type="email"
              autoComplete="email"
              value={values.recipientEmail}
              onChange={handleChange}
              placeholder="pessoa@exemplo.com"
            />
          )}
        </fieldset>

        <fieldset className="nova-capsula__step">
          <legend className="nova-capsula__step-title">
            <span className="nova-capsula__step-number">4</span>
            Imagens (opcional)
          </legend>
          <ImagePicker
            items={images.items}
            rejections={images.rejections}
            maxFiles={MAX_IMAGES_PER_CAPSULE}
            disabled={isSubmitting}
            onAdd={images.add}
            onRemove={images.remove}
          />
        </fieldset>

        <div className="nova-capsula__actions">
          <ButtonLink to="/capsulas" variant="ghost">
            Cancelar
          </ButtonLink>
          <Button type="submit" icon="lock" loading={isSubmitting}>
            {isSubmitting ? (images.isUploading ? 'Enviando imagens…' : 'Lacrando…') : 'Lacrar cápsula'}
          </Button>
        </div>
      </form>
    </section>
  )
}
