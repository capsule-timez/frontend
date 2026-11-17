import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { getApiErrorDetails, updateCapsule } from '../../services/capsuleService'
import type { Capsule, UpdateCapsuleInput } from '../../types/capsule'
import {
  TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  getMinScheduleDate,
  toDateTimeLocalValue,
  validateCapsuleEdit,
  type CapsuleEditValues,
  type CapsuleFormErrors,
} from '../../utils/capsuleValidation'
import { Alert } from '../Alert/Alert'
import { Button } from '../Button/Button'
import { Card } from '../Card/Card'
import { FormField } from '../FormField/FormField'
import { TextAreaField } from '../FormField/TextAreaField'
import './CapsuleEditForm.css'

type EditField = keyof CapsuleEditValues

const FIELDS: EditField[] = ['title', 'text', 'recipientEmail', 'scheduleDate']

function initialValues(capsule: Capsule): CapsuleEditValues {
  return {
    title: capsule.title,
    text: capsule.text,
    recipientEmail: capsule.recipientEmail,
    scheduleDate: toDateTimeLocalValue(new Date(capsule.scheduleDate)),
  }
}

/** Só os campos que mudaram, no formato do PATCH. */
function changes(capsule: Capsule, values: CapsuleEditValues): UpdateCapsuleInput {
  const input: UpdateCapsuleInput = {}
  const title = values.title.trim()
  const text = values.text.trim()
  const recipientEmail = values.recipientEmail.trim()
  const scheduleDate = new Date(values.scheduleDate).toISOString()

  if (title !== capsule.title) input.title = title
  if (text !== capsule.text) input.text = text
  if (recipientEmail !== capsule.recipientEmail) input.recipientEmail = recipientEmail
  if (values.scheduleDate !== initialValues(capsule).scheduleDate) input.scheduleDate = scheduleDate
  return input
}

interface CapsuleEditFormProps {
  capsule: Capsule
  onCancel: () => void
  /** Chamado depois de salvar; recebe `true` quando a cápsula deixou de ser editável. */
  onDone: (notEditable?: boolean) => Promise<void> | void
}

export function CapsuleEditForm({ capsule, onCancel, onDone }: CapsuleEditFormProps) {
  const toast = useToast()
  const [values, setValues] = useState<CapsuleEditValues>(() => initialValues(capsule))
  const [errors, setErrors] = useState<CapsuleFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const field = event.target.name as EditField
    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function focusFirstError(fieldErrors: CapsuleFormErrors) {
    const first = FIELDS.find((field) => fieldErrors[field])
    if (first) document.getElementById(`capsule-edit-${first}`)?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const validationErrors = validateCapsuleEdit(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      focusFirstError(validationErrors)
      return
    }

    const input = changes(capsule, values)
    if (Object.keys(input).length === 0) {
      onCancel()
      return
    }

    setIsSubmitting(true)
    try {
      await updateCapsule(capsule.id, input)
      toast.success('Cápsula atualizada!')
      await onDone()
    } catch (error) {
      const details = getApiErrorDetails(error)
      const apiErrors: CapsuleFormErrors = {}
      for (const field of FIELDS) {
        if (details.fieldErrors[field]) apiErrors[field] = details.fieldErrors[field]
      }

      if (details.code === 'CAPSULE_NOT_EDITABLE' || details.code === 'NOT_FOUND') {
        toast.error('Não foi possível salvar', { description: details.message })
        await onDone(true)
        return
      }
      if (Object.keys(apiErrors).length > 0) {
        setErrors(apiErrors)
        focusFirstError(apiErrors)
        setFormError('Revise os campos destacados.')
      } else {
        setFormError(details.message)
      }
      setIsSubmitting(false)
    }
  }

  function fieldProps(field: EditField) {
    return { id: `capsule-edit-${field}`, name: field, error: errors[field], disabled: isSubmitting }
  }

  return (
    <Card className="capsula-detalhe__content capsule-edit">
      <h2>Editar cápsula</h2>
      <form className="capsule-edit__form" onSubmit={handleSubmit} noValidate>
        {formError && <Alert tone="error">{formError}</Alert>}
        <FormField
          {...fieldProps('title')}
          label="Título"
          counter={`${values.title.length}/${TITLE_MAX_LENGTH}`}
          type="text"
          maxLength={TITLE_MAX_LENGTH}
          value={values.title}
          onChange={handleChange}
        />
        <TextAreaField
          {...fieldProps('text')}
          label="Mensagem"
          counter={`${values.text.length.toLocaleString('pt-BR')}/${TEXT_MAX_LENGTH.toLocaleString('pt-BR')}`}
          maxLength={TEXT_MAX_LENGTH}
          rows={8}
          value={values.text}
          onChange={handleChange}
        />
        <FormField
          {...fieldProps('recipientEmail')}
          label="E-mail do destinatário"
          type="email"
          autoComplete="email"
          value={values.recipientEmail}
          onChange={handleChange}
        />
        <FormField
          {...fieldProps('scheduleDate')}
          label="Data e hora de entrega"
          type="datetime-local"
          min={toDateTimeLocalValue(getMinScheduleDate())}
          value={values.scheduleDate}
          onChange={handleChange}
        />
        <div className="capsule-edit__actions">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" icon="check" loading={isSubmitting}>
            {isSubmitting ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
