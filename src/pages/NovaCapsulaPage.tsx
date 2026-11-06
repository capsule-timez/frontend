import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../components/Alert/Alert'
import { Button, ButtonLink } from '../components/Button/Button'
import { Card } from '../components/Card/Card'
import { FormField } from '../components/FormField/FormField'
import { TextAreaField } from '../components/FormField/TextAreaField'
import { Icon, type IconName } from '../components/Icon/Icon'
import { ImagePicker } from '../components/ImagePicker/ImagePicker'
import { InviteCode } from '../components/InviteCode/InviteCode'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useImageSelection } from '../hooks/useImageSelection'
import { createCapsule, getApiErrorDetails } from '../services/capsuleService'
import type { CapsuleType, CreateCapsuleInput } from '../types/capsule'
import { formatDateTime, formatRelativeTime } from '../utils/formatDate'
import { MAX_IMAGES_PER_CAPSULE } from '../utils/imageValidation'
import {
  TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  getMinContributionDeadline,
  getMinScheduleDate,
  toDateTimeLocalValue,
  validateCapsuleForm,
  validateContributionDeadline,
  validateScheduleDate,
  type CapsuleFormErrors,
  type CapsuleFormField,
  type CapsuleFormValues,
  type RecipientMode,
} from '../utils/capsuleValidation'
import './NovaCapsulaPage.css'

const INITIAL_VALUES: CapsuleFormValues = {
  type: 'INDIVIDUAL',
  title: '',
  text: '',
  scheduleDate: '',
  contributionDeadline: '',
  recipientMode: 'self',
  recipientEmail: '',
}

const FIELD_ORDER: CapsuleFormField[] = [
  'title',
  'text',
  'scheduleDate',
  'contributionDeadline',
  'recipientEmail',
]

const FIELD_IDS: Record<CapsuleFormField, string> = {
  title: 'capsule-title',
  text: 'capsule-text',
  scheduleDate: 'capsule-schedule-date',
  contributionDeadline: 'capsule-contribution-deadline',
  recipientEmail: 'capsule-recipient-email',
}

const CAPSULE_TYPE_OPTIONS: { type: CapsuleType; label: string; description: string; icon: IconName }[] =
  [
    { type: 'INDIVIDUAL', label: 'Individual', description: 'Só você escreve', icon: 'user' },
    { type: 'GROUP', label: 'Em grupo', description: 'Convide pessoas com um código', icon: 'users' },
  ]

/** Datas vazias não são sinalizadas enquanto o usuário preenche, só no envio. */
function validateDates({ scheduleDate, contributionDeadline }: CapsuleFormValues): CapsuleFormErrors {
  return {
    scheduleDate: scheduleDate ? validateScheduleDate(scheduleDate) : undefined,
    contributionDeadline: contributionDeadline
      ? validateContributionDeadline(contributionDeadline, scheduleDate)
      : undefined,
  }
}

function toCreateInput(values: CapsuleFormValues, recipientEmail: string): CreateCapsuleInput {
  const input: CreateCapsuleInput = {
    title: values.title.trim(),
    text: values.text.trim(),
    recipientEmail,
    scheduleDate: new Date(values.scheduleDate).toISOString(),
  }

  // Cápsula individual segue sem os campos de grupo: a API atual rejeita campos
  // desconhecidos, e enviá-los quebraria a criação antes do backend de grupo existir.
  if (values.type !== 'GROUP') return input

  return {
    ...input,
    type: 'GROUP',
    contributionDeadline: new Date(values.contributionDeadline).toISOString(),
  }
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
  const [createdGroup, setCreatedGroup] = useState<{ id: string; inviteCode: string } | null>(null)
  const images = useImageSelection(MAX_IMAGES_PER_CAPSULE)

  const minScheduleDate = toDateTimeLocalValue(getMinScheduleDate())
  const minContributionDeadline = toDateTimeLocalValue(getMinContributionDeadline())
  const scheduleIso =
    values.scheduleDate && !errors.scheduleDate && !validateScheduleDate(values.scheduleDate)
      ? new Date(values.scheduleDate).toISOString()
      : null

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const field = event.target.name as keyof CapsuleFormValues
    const value = event.target.value

    setValues((current) => ({ ...current, [field]: value }))

    if (field === 'scheduleDate' || field === 'contributionDeadline') {
      setErrors((current) => ({ ...current, ...validateDates({ ...values, [field]: value }) }))
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
    setErrors((current) => ({ ...current, ...validateDates({ ...values, scheduleDate: value }) }))
  }

  function handleTypeChange(type: CapsuleType) {
    setValues((current) => ({ ...current, type, contributionDeadline: '' }))
    setErrors((current) => ({ ...current, contributionDeadline: undefined }))
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
      const capsule = await createCapsule(toCreateInput(values, recipientEmail))
      const uploads = images.items.length > 0 ? await images.upload(capsule.id) : { sent: 0, failed: 0 }
      if (uploads.failed > 0) {
        toast.error('Cápsula criada, mas algumas imagens não foram enviadas', {
          description: 'Abra a cápsula para tentar enviar as imagens novamente.',
        })
      } else {
        toast.success('Cápsula agendada!', {
          description: `“${capsule.title}” será entregue ${formatRelativeTime(capsule.scheduleDate)}.`,
        })
      }
      if (values.type === 'GROUP' && capsule.inviteCode) {
        setCreatedGroup({ id: capsule.id, inviteCode: capsule.inviteCode })
        return
      }
      navigate(uploads.failed > 0 ? `/capsulas/${capsule.id}` : '/capsulas')
    } catch (error) {
      const details = getApiErrorDetails(error)
      const apiErrors: CapsuleFormErrors = {}
      for (const field of FIELD_ORDER) {
        if (details.fieldErrors[field]) apiErrors[field] = details.fieldErrors[field]
      }

      if (details.code === 'VALIDATION_ERROR' && Object.keys(apiErrors).length > 0) {
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

  if (createdGroup) {
    return (
      <section className="nova-capsula page-enter">
        <PageHeader
          title="Cápsula em grupo criada!"
          description="Compartilhe o código de convite com quem vai participar."
        />
        <Card className="nova-capsula__created">
          <InviteCode code={createdGroup.inviteCode} />
          <p className="nova-capsula__created-hint">
            Quem receber o código entra pela opção “Entrar com código” em Minhas cápsulas. O código
            continua disponível no detalhe da cápsula.
          </p>
          <div className="nova-capsula__actions">
            <ButtonLink to="/capsulas" variant="ghost">
              Minhas cápsulas
            </ButtonLink>
            <ButtonLink to={`/capsulas/${encodeURIComponent(createdGroup.id)}`}>Ver cápsula</ButtonLink>
          </div>
        </Card>
      </section>
    )
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
            Individual ou em grupo?
          </legend>
          <div className="nova-capsula__options">
            {CAPSULE_TYPE_OPTIONS.map((option) => (
              <label key={option.type} className="nova-capsula__option">
                <input
                  type="radio"
                  name="capsuleType"
                  value={option.type}
                  checked={values.type === option.type}
                  onChange={() => handleTypeChange(option.type)}
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
        </fieldset>

        <fieldset className="nova-capsula__step">
          <legend className="nova-capsula__step-title">
            <span className="nova-capsula__step-number">2</span>
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
            <span className="nova-capsula__step-number">3</span>
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
          {values.type === 'GROUP' && (
            <FormField
              {...fieldProps('contributionDeadline')}
              label="Prazo para contribuições"
              hint="Depois desse prazo, ninguém mais entra na cápsula com o código de convite."
              type="datetime-local"
              min={minContributionDeadline}
              max={values.scheduleDate || undefined}
              value={values.contributionDeadline}
              onChange={handleChange}
            />
          )}
        </fieldset>

        <fieldset className="nova-capsula__step">
          <legend className="nova-capsula__step-title">
            <span className="nova-capsula__step-number">4</span>
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
            <span className="nova-capsula__step-number">5</span>
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
