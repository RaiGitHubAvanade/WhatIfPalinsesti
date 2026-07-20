import { NETWORK_RETRY_DELAY_MS } from '../utils/constants'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export async function apiFetch(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, options)
  } catch {
    // Transient DNS / network failure (ERR_NAME_NOT_RESOLVED, ERR_NETWORK_CHANGED, etc.)
    // Retry once after a short delay before surfacing the error to the user.
    await new Promise(resolve => setTimeout(resolve, NETWORK_RETRY_DELAY_MS))
    res = await fetch(`${BASE_URL}${path}`, options)
  }
  if (!res.ok) {
    const text = (await res.text()).trim()
    throw new Error(`API error ${res.status}: ${text || 'Servizio temporaneamente non disponibile. Riprova più tardi.'}`)
  }
  return res.json()
}