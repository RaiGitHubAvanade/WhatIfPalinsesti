/**
 * @typedef {import('../models/scenarios/scenarioViewModels').ScenarioListViewModel} ScenarioListViewModel
 */

import { apiFetch } from './apiService'

/** @returns {Promise<ScenarioListViewModel>} */
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
