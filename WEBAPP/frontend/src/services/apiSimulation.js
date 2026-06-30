/**
 * @typedef {import('../models/simulation/programItemViewModel').ProgramItem} ProgramItem
 * @typedef {import('../models/simulation/programItemViewModel').ProgramListViewModel} ProgramListViewModel
 * @typedef {import('../models/simulation/competitorItemViewModel').CompetitorListViewModel} CompetitorListViewModel
 * @typedef {import('../models/simulation/simResultViewModels').SimResultSost} SimResultSost
 * @typedef {import('../models/simulation/simResultViewModels').SimResultSposta} SimResultSposta
 * @typedef {import('../models/simulation/channelScheduleViewModel').ChannelScheduleViewModel} ChannelScheduleViewModel
 * @typedef {import('../models/weekly_programming/competitorProgramsViewModel').OtherProgramViewModel} OtherProgramViewModel
 */

import { apiFetch } from './apiService'

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

/** @returns {Promise<void>} */
export async function startSostituzione(payload) {
  const result = await apiFetch('/api/simulation/sostituzione/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!result.success) throw new Error(result.message || 'Errore avvio simulazione sostituzione')
  return result.data
}

/** @returns {Promise<void>} */
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

/** @returns {Promise<OtherProgramViewModel[]>} */
export async function getTargetPrograms({ channel = '', day = '', from_time = '', to_time = '' } = {}) {
  const params = new URLSearchParams()
  if (channel)   params.set('channel', channel)
  if (day)       params.set('day', day)
  if (from_time) params.set('from_time', from_time)
  if (to_time)   params.set('to_time', to_time)
  const qs = params.toString()
  const result = await apiFetch(`/api/simulation/getTargetPrograms${qs ? '?' + qs : ''}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento programmi')
  return result.data
}

/** @returns {Promise<OtherProgramViewModel[]>} */
export async function getCandidatePrograms({ program_name = '', channel = '', target_sex = '', target_age = '', min_share = '' } = {}) {
  const params = new URLSearchParams()
  if (program_name) params.set('program_name', program_name)
  if (channel)      params.set('channel', channel)
  if (target_sex)   params.set('target_sex', target_sex)
  if (target_age)   params.set('target_age', target_age)
  if (min_share)    params.set('min_share', min_share)
  const qs = params.toString()
  const result = await apiFetch(`/api/simulation/getCandidatePrograms${qs ? '?' + qs : ''}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento candidati')
  return result.data
}

/** @returns {Promise<void>} */
export async function retrySimulation(simulationId) {
  const result = await apiFetch(`/api/simulation/${simulationId}/retry`, { method: 'POST' })
  if (!result.success) throw new Error(result.message || 'Errore rilancio simulazione')
}
