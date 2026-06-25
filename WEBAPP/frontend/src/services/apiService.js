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

export async function startSostituzione(payload) {
  const result = await apiFetch('/api/simulation/sostituzione/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!result.success) throw new Error(result.message || 'Errore avvio simulazione sostituzione')
  return result.data
}

export async function startSpostamento(payload) {
  const result = await apiFetch('/api/simulation/spostamento/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!result.success) throw new Error(result.message || 'Errore avvio simulazione spostamento')
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

// ─── Scenarios ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SimulationSost
 * @property {string} id
 * @property {string|null} new_program_name
 * @property {number|null} new_program_share_storico
 * @property {number|null} share_result
 * @property {string} status
 * @property {string|null} creation_date
 * @property {string|null} modified_date
 * @property {string|null} last_error
 * @property {boolean} is_retry
 */

/**
 * @typedef {Object} SimulationSposta
 * @property {string} id
 * @property {string|null} new_channel
 * @property {string|null} new_date
 * @property {string|null} new_from_time
 * @property {number|null} share_result
 * @property {string} status
 * @property {string|null} creation_date
 * @property {string|null} modified_date
 * @property {string|null} last_error
 * @property {boolean} is_retry
 */

/**
 * @typedef {Object} ScenarioItem
 * @property {string} id
 * @property {string} scenario_type
 * @property {string} program_name
 * @property {string} program_channel
 * @property {string|null} program_date
 * @property {string|null} program_from_time
 * @property {number|null} program_share_predict
 * @property {string|null} creation_date
 * @property {(SimulationSost|SimulationSposta)[]} simulations
 */

export async function getScenarios({ search = '', type = '', date = '' } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (type)   params.set('type', type)
  if (date)   params.set('date', date)
  const qs = params.toString()
  const result = await apiFetch(`/api/scenarios${qs ? '?' + qs : ''}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento scenari')
  return result.data
}

export async function getPalinsestoFuturoRai({ channel = '', day = '', from_time = '', to_time = '' } = {}) {
  const params = new URLSearchParams()
  if (channel)   params.set('channel', channel)
  if (day)       params.set('day', day)
  if (from_time) params.set('from_time', from_time)
  if (to_time)   params.set('to_time', to_time)
  const qs = params.toString()
  const result = await apiFetch(`/api/simulation/getPalinsestoFuturoRai${qs ? '?' + qs : ''}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento palinsesto')
  return result.data
}