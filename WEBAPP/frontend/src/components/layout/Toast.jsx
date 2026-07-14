import { useEffect } from 'react'
import { useApp } from '../../context/useApp'
import './Toast.css'

export default function Toast() {
  const { state, clearToast } = useApp()
  const { toast } = state
  const type = toast?.type || 'error'
  const role = type === 'error' ? 'alert' : 'status'

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 8000)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="toast-container">
      <div className={`toast toast-${type}`} key={toast.id} role={role} aria-live="polite">{toast.msg}</div>
    </div>
  )
}

