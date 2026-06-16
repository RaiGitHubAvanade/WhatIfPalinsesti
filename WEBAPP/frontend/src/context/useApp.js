import { useContext } from 'react'
import { AppContext } from './AppContextStore'

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
