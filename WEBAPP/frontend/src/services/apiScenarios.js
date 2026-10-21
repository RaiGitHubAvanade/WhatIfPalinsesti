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

/**
 * @typedef {Object} SimulationContextElement
 * @property {string} key
 * @property {string} label
 * @property {string|null} program_name
 * @property {string|null} channel
 * @property {number|null} share_storico        percentage (e.g. 11.3)
 * @property {number|null} occurrences_count
 * @property {string|null} from_time
 * @property {string|null} to_time
 * @property {SimulationContextElement[]} children
 *
 * @typedef {Object} SimulationOccurrence
 * @property {string} element_key
 * @property {string} element_label
 * @property {string} role                     short label: Selezionato, Precedente, Successivo, Competitor, Sostituito, Coinvolto
 * @property {string|null} scenario_program
 * @property {string|null} historical_program
 * @property {string|null} broadcast_type     storico_programmi.Tipo_Trasmissione
 * @property {string|null} direction_genre
 * @property {string|null} channel
 * @property {string|null} date
 * @property {string|null} day_type           Weekday / Weekend
 * @property {string|null} day_name           Lunedì ... Domenica
 * @property {string|null} from_time
 * @property {string|null} to_time
 * @property {number|null} duration_minutes
 * @property {number|null} share               percentage (e.g. 11.3)
 * @property {number|null} amr                 thousands (000)
 * @property {number|null} platea              thousands (000)
 * @property {number|null} share_men           percentage of the program audience (e.g. 54.6)
 * @property {number|null} share_women         percentage of the program audience (e.g. 45.4)
 * @property {number|null} amr_men             thousands (000)
 * @property {number|null} amr_women           thousands (000)
 *
 * @typedef {Object} SimulationContext
 * @property {string} simulation_id
 * @property {'sostituzione'|'spostamento'} simulation_type
 * @property {SimulationContextElement[]} elements
 * @property {SimulationOccurrence[]} occurrences
 */

/** @returns {Promise<SimulationContext>} */
export async function getSimulationContext(simulationType, simulationId, requestOptions = {}) {
  let result
  try {
    result = await apiFetch(
      `/api/scenarios/simulation/${encodeURIComponent(simulationType)}/${encodeURIComponent(simulationId)}/context`,
      requestOptions,
    )
  } catch (error) {
    // apiFetch embeds the raw response body in the message: surface the backend message when available.
    const body = /^API error \d+: (\{.*\})$/s.exec(error?.message || '')?.[1]
    let message
    try { message = body ? JSON.parse(body).message : null } catch { message = null }
    if (message) throw new Error(message, { cause: error })
    throw error
  }
  if (!result.success) throw new Error(result.message || 'Errore caricamento contesto simulazione')
  return result.data
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
