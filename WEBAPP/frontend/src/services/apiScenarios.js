/**
 * @typedef {import('../models/scenarios/scenarioViewModels').ScenarioListViewModel} ScenarioListViewModel
 * @typedef {import('../models/scenarios/scenarioViewModels').ScenCompetitorProgramsViewModel} ScenCompetitorProgramsViewModel
 */

import { apiFetch } from './apiService'

/** @returns {Promise<ScenarioListViewModel>} */
export async function getScenarios({ search = '', type = '', date = '' } = {}, requestOptions = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (type)   params.set('type', type)
  if (date)   params.set('date', date)
  const qs = params.toString()
  const result = await apiFetch(`/api/scenarios${qs ? '?' + qs : ''}`, requestOptions)
  if (!result.success) throw new Error(result.message || 'Errore caricamento scenari')
  return result.data
}

/** @returns {Promise<void>} */
export async function deleteSimulationSostituzione(simulationId) {
  const result = await apiFetch(`/api/scenarios/simulation/sostituzione/${simulationId}/delete`, { method: 'DELETE' })
  if (!result.success) throw new Error(result.message || 'Errore eliminazione simulazione')
}

/** @returns {Promise<void>} */
export async function deleteSimulationSpostamento(simulationId) {
  const result = await apiFetch(`/api/scenarios/simulation/spostamento/${simulationId}/delete`, { method: 'DELETE' })
  if (!result.success) throw new Error(result.message || 'Errore eliminazione simulazione')
}

/** @returns {Promise<void>} */
export async function deleteScenario(scenarioId) {
  const result = await apiFetch(`/api/scenarios/${scenarioId}/delete`, { method: 'DELETE' })
  if (!result.success) throw new Error(result.message || 'Errore eliminazione scenario')
}

/** @returns {Promise<ScenCompetitorProgramsViewModel>} */
export async function getScenCompetitorPrograms({ channel, day, from_time }) {
  const params = new URLSearchParams({ channel, day, from_time })
  const result = await apiFetch(`/api/scenarios/simulation/getCompetitorPrograms?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento competitor')
  return result.data
}

/** @returns {Promise<void>} */
export async function toggleEventoForte(id) {
  const result = await apiFetch('/api/scenarios/simulation/toggle_evento_forte', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!result.success) throw new Error(result.message || 'Errore toggle evento forte')
}
