/**
 * @typedef {import('../models/simulation/channelScheduleViewModel').ChannelScheduleViewModel} ChannelScheduleViewModel
 * @typedef {import('../models/weekly_programming/competitorProgramsViewModel').OtherProgramViewModel} OtherProgramViewModel
 */

import { apiFetch } from './apiService'

/** @returns {Promise<OtherProgramViewModel[]>} */
export async function getTargetPrograms({ day = '' } = {}) {
  const params = new URLSearchParams()
  if (day) params.set('day', day)
  const qs = params.toString()
  const result = await apiFetch(`/api/simulation/getTargetPrograms${qs ? '?' + qs : ''}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento programmi')
  return result.data
}

/** @returns {Promise<OtherProgramViewModel[]>} */
export async function getCandidatePrograms() {
  const result = await apiFetch('/api/simulation/getCandidatePrograms')
  if (!result.success) throw new Error(result.message || 'Errore caricamento candidati')
  return result.data
}

/** @returns {Promise<ChannelScheduleViewModel>} */
export async function getSchedulePrograms({ day = '' } = {}) {
  const params = new URLSearchParams()
  if (day) params.set('day', day)
  const result = await apiFetch(`/api/simulation/getSchedulePrograms?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento palinsesto')
  return result.data
}

export async function checkScenarioLimit({ programId, scenarioType }) {
  const params = new URLSearchParams()
  params.set('program_id', programId)
  params.set('scenario_type', scenarioType)

  const result = await apiFetch(`/api/simulation/checkScenarioLimit?${params.toString()}`)
  if (!result.success) throw new Error(result.message || 'Errore validazione limite scenario')
  return result
}

/** @returns {Promise<void>} */
export async function startSostituzione(payload) {
  const result = await apiFetch('/api/simulation/sostituzione/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!result.success) throw new Error(result.message || 'Errore avvio simulazione sostituzione')
  return { data: result.data, message: result.message }
}

/** @returns {Promise<void>} */
export async function startSpostamento(payload) {
  const result = await apiFetch('/api/simulation/spostamento/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!result.success) throw new Error(result.message || 'Errore avvio simulazione spostamento')
  return { data: result.data, message: result.message }
}

/** @returns {Promise<void>} */
export async function retrySostituzione(simulationId) {
  const result = await apiFetch(`/api/simulation/sostituzione/${simulationId}/retry`, { method: 'POST' })
  if (!result.success) throw new Error(result.message || 'Errore rilancio simulazione')
}

/** @returns {Promise<void>} */
export async function retrySpostamento(simulationId) {
  const result = await apiFetch(`/api/simulation/spostamento/${simulationId}/retry`, { method: 'POST' })
  if (!result.success) throw new Error(result.message || 'Errore rilancio simulazione')
}
