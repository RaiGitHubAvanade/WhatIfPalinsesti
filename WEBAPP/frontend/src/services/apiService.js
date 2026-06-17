/**
 * @typedef {import('../models/palinsestoViewModel').PalinsestoViewModel} PalinsestoViewModel
 * @typedef {import('../models/weeklyTableViewModel').WeeklyTableViewModel} WeeklyTableViewModel
 */

const BASE_URL = import.meta.env.VITE_API_URL || ''

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

// Programs
export function getPrograms(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
  const qs = params.toString()
  return apiFetch(`/api/programs${qs ? '?' + qs : ''}`)
}

export function getCandidates() {
  return apiFetch('/api/candidates')
}

// Simulation
export function simulate(orig, cand) {
  return apiFetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orig, cand }),
  })
}

export function getCompetitors(slot, forceExternal = false) {
  const params = new URLSearchParams()
  if (slot) params.set('slot', slot)
  if (forceExternal) params.set('force_external', 'true')
  return apiFetch(`/api/competitors?${params}`)
}

// Weekly
/** @returns {Promise<WeeklyTableViewModel>} */
export async function getWeeklyTable(channel, day) {
  const params = new URLSearchParams({ channel, day })
  const result = await apiFetch(`/api/weekly/getWeeklyTableDatabricks?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento palinsesto')
  return result.data
}

export async function getCompetitorPrograms({ channel, day, from_time, to_time, program_name = '' }) {
  const params = new URLSearchParams({ channel, day, from_time, to_time, program_name })
  const result = await apiFetch(`/api/weekly/getCompetitorProgramsDatabricks?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento concorrenti')
  return result.data
}

export async function editManualShare({ channel, program_name, from_time, to_time, day, value }) {
  const result = await apiFetch('/api/weekly/editManualShareDatabricks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, program_name, from_time, to_time, day, value }),
  })
  if (!result.success) throw new Error(result.message || 'Errore aggiornamento share manuale')
  return result.data
}

// Channels
export function getChannels() {
  return apiFetch('/api/channels')
}

export function getChannelSchedule(ch, isoDate) {
  return apiFetch(`/api/channels/schedule?ch=${encodeURIComponent(ch)}&date=${isoDate}`)
}

export function getAllChannelsSchedule(isoDate) {
  return apiFetch(`/api/channels/all-schedule?date=${isoDate}`)
}
