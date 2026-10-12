import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import './FormField.css'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  counter?: string
}

export function FormField({
  label,
  error,
  hint,
  counter,
  id: idProp,
  type,
  ...inputProps
}: FormFieldProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ')

  return (
    <div className="form-field">
      <div className="form-field__label-row">
        <label className="form-field__label" htmlFor={id}>
          {label}
        </label>
        {counter && <span className="form-field__counter">{counter}</span>}
      </div>
      <div className="form-field__control">
        <input
          id={id}
          className="form-field__input"
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="form-field__reveal"
            onClick={() => setRevealed((current) => !current)}
            aria-pressed={revealed}
          >
            {revealed ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
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
