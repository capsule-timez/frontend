import { useEffect, useRef } from 'react'
import { Button } from '../Button/Button'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      // Esc dispara "cancel"; durante a requisição o diálogo não fecha.
      onCancel={(event) => {
        event.preventDefault()
        if (!loading) onCancel()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel()
      }}
    >
      <h2 id="confirm-dialog-title" className="confirm-dialog__title">{title}</h2>
      <p id="confirm-dialog-description" className="confirm-dialog__description">{description}</p>
      <div className="confirm-dialog__actions">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </dialog>
  )
}
