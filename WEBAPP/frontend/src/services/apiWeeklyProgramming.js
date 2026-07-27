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

/** @returns {Promise<void>} */
export async function editManualShareBatch({ changes }) {
  const result = await apiFetch('/api/weekly/editManualShareBatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes }),
  })
  if (!result.success) throw new Error(result.message || 'Errore salvataggio batch share manuali')
}

const _BASE = import.meta.env.VITE_API_URL || ''

/**
 * Attempt to acquire the weekly edit lock for *weekMonday*.
 * Returns { acquired: true } or { acquired: false, holder: string }.
 * Uses raw fetch (not apiFetch) to handle the 409 without throwing.
 */
export async function acquireLock({ weekMonday, clientId }) {
  const res = await fetch(`${_BASE}/api/weekly/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekMonday, clientId }),
  })
  const data = await res.json()
  if (res.status === 409) {
    return { acquired: false, holder: data.data?.holder ?? 'altro utente' }
  }
  if (!res.ok) throw new Error(data.message || 'Errore acquisizione lock')
  return { acquired: true }
}

/** Release the weekly edit lock. Best-effort — never throws. */
export async function releaseLock({ weekMonday, clientId }) {
  try {
    await apiFetch('/api/weekly/lock', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekMonday, clientId }),
    })
  } catch {
    // Silent — release failures must never block the UI
  }
}
