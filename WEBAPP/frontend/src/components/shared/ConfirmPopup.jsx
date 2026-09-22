import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './ConfirmPopup.css'

export default function ConfirmPopup({
  open,
  title = 'Conferma',
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <>
      <div className="cf-popup-backdrop" onClick={onCancel} />
      <div className="cf-popup" role="dialog" aria-modal="true" aria-label={title}>
        <div className="cf-popup-title">{title}</div>
        <div className="cf-popup-message">{message}</div>
        <div className="cf-popup-actions">
          <button type="button" className="cf-popup-btn cf-popup-btn--cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="cf-popup-btn cf-popup-btn--confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
