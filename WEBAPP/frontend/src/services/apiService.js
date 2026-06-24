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


// Weekly
/** @returns {Promise<WeeklyTableViewModel>} */
export async function getWeeklyTable(channel, day) {
  const params = new URLSearchParams({ channel, day })
  const result = await apiFetch(`/api/weekly/getWeeklyTable?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento palinsesto')
  return result.data
}

export async function getCompetitorPrograms({ channel, day, from_time, to_time, program_name = '' }) {
  const params = new URLSearchParams({ channel, day, from_time, to_time, program_name })
  const result = await apiFetch(`/api/weekly/getCompetitorPrograms?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento concorrenti')
  return result.data
}

export async function editManualShare({ channel, program_name, from_time, to_time, day, value }) {
  const result = await apiFetch('/api/weekly/editManualShare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, program_name, from_time, to_time, day, value }),
  })
  if (!result.success) throw new Error(result.message || 'Errore aggiornamento share manuale')
  return result.data
}

// ─── Simulation-specific endpoints ────────────────────────────────────────────

/**
 * @typedef {import('../models/simulationViewModel').ProgramListViewModel} ProgramListViewModel
 * @typedef {import('../models/simulationViewModel').CompetitorListViewModel} CompetitorListViewModel
 * @typedef {import('../models/simulationViewModel').SimResultSost} SimResultSost
 * @typedef {import('../models/simulationViewModel').SimResultSposta} SimResultSposta
 * @typedef {import('../models/simulationViewModel').ChannelScheduleViewModel} ChannelScheduleViewModel
 */

/** @returns {Promise<ProgramListViewModel>} */
export async function getSimulationPrograms(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') params.set(k, v) })
  const qs = params.toString()
  const result = await apiFetch(`/api/simulation/programs${qs ? '?' + qs : ''}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento programmi')
  return result.data
}

/** @returns {Promise<ProgramListViewModel>} */
export async function getSimulationCandidates(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') params.set(k, v) })
  const qs = params.toString()
  const result = await apiFetch(`/api/simulation/candidates${qs ? '?' + qs : ''}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento candidati')
  return result.data
}

/** @returns {Promise<SimResultSost|SimResultSposta>} */
export async function runSimulation(payload) {
  const result = await apiFetch('/api/simulation/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!result.success) throw new Error(result.message || 'Errore simulazione')
  return result.data
}

/** @returns {Promise<CompetitorListViewModel>} */
export async function getSimulationCompetitors(slot = null) {
  const params = new URLSearchParams()
  if (slot) params.set('slot', slot)
  const qs = params.toString()
  const result = await apiFetch(`/api/simulation/competitors${qs ? '?' + qs : ''}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento competitor')
  return result.data
}

/** @returns {Promise<ChannelScheduleViewModel>} */
export async function getSimulationSchedule(ch, dest_time) {
  const params = new URLSearchParams({ ch, dest_time })
  const result = await apiFetch(`/api/simulation/schedule?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento palinsesto')
  return result.data
}