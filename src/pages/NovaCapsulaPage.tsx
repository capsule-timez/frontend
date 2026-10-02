import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createCapsule, getApiErrorDetails } from '../services/capsuleService'
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

export function NovaCapsulaPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [values, setValues] = useState<CapsuleFormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<CapsuleFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const minScheduleDate = toDateTimeLocalValue(getMinScheduleDate())

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
      navigate('/capsulas', { state: { created: capsule.title } })
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
        setFormError('Sessão mockada inválida ou expirada. Verifique VITE_MOCK_ACCESS_TOKEN.')
      } else {
        setFormError(details.message)
      }
      setIsSubmitting(false)
    }
  }

  function fieldProps(field: CapsuleFormField) {
    const errorId = `${FIELD_IDS[field]}-error`
    return {
      id: FIELD_IDS[field],
      name: field,
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field] ? errorId : undefined,
    }
  }

  function renderError(field: CapsuleFormField) {
    if (!errors[field]) return null
    return (
      <span id={`${FIELD_IDS[field]}-error`} className="field__error" role="alert">
        {errors[field]}
      </span>
    )
  }

  return (
    <section className="nova-capsula">
      <header className="nova-capsula__header">
        <h1>Nova cápsula</h1>
        <p className="field__hint">Escreva hoje, entregue no futuro.</p>
      </header>

      <form className="nova-capsula__form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="alert alert--error">{formError}</div>}

        <div className="field">
          <div className="nova-capsula__label-row">
            <label className="field__label" htmlFor={FIELD_IDS.title}>
              Título
            </label>
            <span className="field__hint">
              {values.title.length}/{TITLE_MAX_LENGTH}
            </span>
          </div>
          <input
            {...fieldProps('title')}
            className="field__input"
            type="text"
            maxLength={TITLE_MAX_LENGTH}
            value={values.title}
            onChange={handleChange}
            placeholder="Para mim daqui a um ano"
          />
          {renderError('title')}
        </div>

        <div className="field">
          <div className="nova-capsula__label-row">
            <label className="field__label" htmlFor={FIELD_IDS.text}>
              Mensagem
            </label>
            <span className="field__hint">
              {values.text.length.toLocaleString('pt-BR')}/
              {TEXT_MAX_LENGTH.toLocaleString('pt-BR')}
            </span>
          </div>
          <textarea
            {...fieldProps('text')}
            className="field__input nova-capsula__textarea"
            maxLength={TEXT_MAX_LENGTH}
            rows={8}
            value={values.text}
            onChange={handleChange}
            placeholder="O que você quer dizer ao futuro?"
          />
          {renderError('text')}
        </div>

        <fieldset className="nova-capsula__schedule">
          <legend className="nova-capsula__schedule-title">Quando entregar?</legend>
          <div className="field">
            <label className="field__label" htmlFor={FIELD_IDS.scheduleDate}>
              Data e hora de entrega
            </label>
            <input
              {...fieldProps('scheduleDate')}
              className="field__input"
              type="datetime-local"
              min={minScheduleDate}
              value={values.scheduleDate}
              onChange={handleChange}
            />
            <span className="field__hint">A cápsula fica lacrada até esse momento.</span>
            {renderError('scheduleDate')}
          </div>
        </fieldset>

        <fieldset className="nova-capsula__recipient">
          <legend className="field__label">Para quem?</legend>
          <div className="nova-capsula__options">
            <label className="nova-capsula__option">
              <input
                type="radio"
                name="recipientMode"
                value="self"
                checked={values.recipientMode === 'self'}
                onChange={() => handleRecipientModeChange('self')}
              />
              Para mim
            </label>
            <label className="nova-capsula__option">
              <input
                type="radio"
                name="recipientMode"
                value="other"
                checked={values.recipientMode === 'other'}
                onChange={() => handleRecipientModeChange('other')}
              />
              Para outra pessoa
            </label>
          </div>

          {values.recipientMode === 'self' ? (
            <p className="field__hint">
              Será entregue no seu e-mail: <strong>{user?.email}</strong>
            </p>
          ) : (
            <div className="field">
              <label className="field__label" htmlFor={FIELD_IDS.recipientEmail}>
                E-mail do destinatário
              </label>
              <input
                {...fieldProps('recipientEmail')}
                className="field__input"
                type="email"
                autoComplete="email"
                value={values.recipientEmail}
                onChange={handleChange}
                placeholder="pessoa@exemplo.com"
              />
              {renderError('recipientEmail')}
            </div>
          )}
        </fieldset>

        <div className="nova-capsula__actions">
          <Link to="/capsulas" className="button button--secondary">
            Cancelar
          </Link>
          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Criando…' : 'Criar cápsula'}
          </button>
        </div>
      </form>
    </section>
  )
}
