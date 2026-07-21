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

/** Convert minutes to HH:MM, wrapping to 24h format. */
export function formatMinutesToTime(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return null
  const m = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Compute duration in minutes between two HH:MM values (broadcast-day aware via toMinutes). */
export function durationMinutes(start, end) {
  const startMin = toMinutes(start)
  const endMin = toMinutes(end)
  if (startMin === null || endMin === null) return null
  return endMin - startMin
}

/** Compute end HH:MM given start HH:MM and duration in minutes. */
export function endTimeFromStartAndDuration(start, duration) {
  const startMin = toMinutes(start)
  if (startMin === null || duration === null || duration === undefined) return null
  return formatMinutesToTime(startMin + duration)
}
