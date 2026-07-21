import { DAYS } from './constants'

/**
 * Format an ISO date string as "dom dd/MM".
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return `${DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Format an ISO date string as "dd/MM/yyyy".
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function fmtDateShort(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

/** Convert HH:MM to minutes, adding 1440 for post-midnight hours (< 06:00). */
export function toMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  const base = h * 60 + m
  return h < 6 ? base + 1440 : base
}
