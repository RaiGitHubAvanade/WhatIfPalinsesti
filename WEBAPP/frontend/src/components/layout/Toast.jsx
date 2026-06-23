import { useEffect } from 'react'
import { useApp } from '../../context/useApp'
import './Toast.css'

export default function Toast() {
  const { state, clearToast } = useApp()
  const { toast } = state

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 3200)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="toast-container">
      <div className="toast" key={toast.id}>{toast.msg}</div>
    </div>
  )
}

