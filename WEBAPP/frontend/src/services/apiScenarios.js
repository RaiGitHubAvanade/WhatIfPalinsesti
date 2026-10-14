/**
 * @typedef {import('../models/scenarios/scenarioViewModels').ScenarioListViewModel} ScenarioListViewModel
 * @typedef {import('../models/scenarios/scenarioViewModels').ScenCompetitorProgramsViewModel} ScenCompetitorProgramsViewModel
 */

import { apiFetch } from './apiService'
import { chunkArray } from '../utils/scenarioUtils'
import { simulationKey } from '../utils/predictionUtils'

export async function getFeatures(simulations, requestOptions = {}) {
  const unique = [...new Map(simulations.map(item => [simulationKey(item.simulation_type, item.id), item])).values()]
  const items = []
  for (const chunk of chunkArray(unique, 500)) {
    const result = await apiFetch('/api/scenarios/features', {
      ...requestOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulations: chunk }),
    })
    if (!result.success) throw new Error(result.message || 'Errore caricamento dettagli simulazioni')
    const found = new Set(result.data.items.map(item => simulationKey(item.simulation_type, item.id)))
    if (chunk.some(item => !found.has(simulationKey(item.simulation_type, item.id)))) {
      throw new Error('Una simulazione non e piu disponibile. Aggiorna gli scenari e riprova.')
    }
    items.push(...result.data.items)
  }
  return items
}

/** @returns {Promise<ScenarioListViewModel>} */
export async function getScenarios(requestOptions = {}) {
  const result = await apiFetch('/api/scenarios', requestOptions)
  if (!result.success) throw new Error(result.message || 'Errore caricamento scenari')
  return result.data
}

/** @returns {Promise<{items: Array<{id: string, status: 'Running'|'Completed'|'Failed', share_result: number|null, last_error: string|null, modified_date: string|null}>}>} */
export async function getSimulationsStatus(simulationIds, requestOptions = {}) {
  const result = await apiFetch('/api/scenarios/simulations/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ simulation_ids: simulationIds }),
    ...requestOptions,
  })
  if (!result.success) throw new Error(result.message || 'Errore recupero stato simulazioni')
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

/** @returns {Promise<void>} */
export async function deleteAllOwnedScenarios() {
  const result = await apiFetch('/api/scenarios/delete_mine', { method: 'DELETE' })
  if (!result.success) throw new Error(result.message || 'Errore eliminazione scenari')
}

/** @returns {Promise<void>} */
export async function editScenarioName(scenarioId, scenarioName) {
  const result = await apiFetch(`/api/scenarios/${scenarioId}/edit_scenario_name`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_name: scenarioName }),
  })
  if (!result.success) throw new Error(result.message || 'Errore aggiornamento nome scenario')
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
