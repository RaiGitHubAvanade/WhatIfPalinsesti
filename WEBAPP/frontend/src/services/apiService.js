const BASE_URL = import.meta.env.VITE_API_URL || ''

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const text = (await res.text()).trim()
    throw new Error(`API error ${res.status}: ${text || 'Servizio temporaneamente non disponibile. Riprova più tardi.'}`)
  }
  return res.json()
}