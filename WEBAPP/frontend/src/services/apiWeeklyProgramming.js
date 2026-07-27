/**
 * @typedef {import('../models/weekly_programming/weeklyTableViewModel').WeeklyTableViewModel} WeeklyTableViewModel
 * @typedef {import('../models/weekly_programming/competitorProgramsViewModel').CompetitorProgramsViewModel} CompetitorProgramsViewModel
 */

import { apiFetch } from './apiService'

/** @returns {Promise<WeeklyTableViewModel>} */
export async function getWeeklyTable(channel, day) {
  const params = new URLSearchParams({ channel, day })
  const result = await apiFetch(`/api/weekly/getWeeklyTable?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento palinsesto')
  return result.data
}

/** @returns {Promise<CompetitorProgramsViewModel>} */
export async function getCompetitorPrograms({ channel, day, from_time, to_time, program_name = '' }) {
  const params = new URLSearchParams({ channel, day, from_time, to_time, program_name })
  const result = await apiFetch(`/api/weekly/getCompetitorPrograms?${params}`)
  if (!result.success) throw new Error(result.message || 'Errore caricamento concorrenti')
  return result.data
}

/** @returns {Promise<void>} */
export async function editManualShare({ id, value, date }) {
  const result = await apiFetch('/api/weekly/editManualShare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, value, date }),
  })
  if (!result.success) throw new Error(result.message || 'Errore aggiornamento share manuale')
  return result.data
}
