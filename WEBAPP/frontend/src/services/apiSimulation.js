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
export async function getSimulationSchedule(ch, dest_time) {
  const params = new URLSearchParams({ ch, dest_time })
  const result = await apiFetch(`/api/simulation/schedule?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento palinsesto')
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

/** @returns {Promise<void>} */
export async function retrySimulation(simulationId) {
  const result = await apiFetch(`/api/simulation/${simulationId}/retry`, { method: 'POST' })
  if (!result.success) throw new Error(result.message || 'Errore rilancio simulazione')
}
