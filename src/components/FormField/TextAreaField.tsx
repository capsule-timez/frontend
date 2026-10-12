import { useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import './FormField.css'

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
  counter?: string
}

export function TextAreaField({
  label,
  error,
  hint,
  counter,
  id: idProp,
  ...textareaProps
}: TextAreaFieldProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ')

  return (
    <div className="form-field">
      <div className="form-field__label-row">
        <label className="form-field__label" htmlFor={id}>
          {label}
        </label>
        {counter && <span className="form-field__counter">{counter}</span>}
      </div>
      <textarea
        id={id}
        className="form-field__input form-field__input--multiline"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...textareaProps}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="form-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="form-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
