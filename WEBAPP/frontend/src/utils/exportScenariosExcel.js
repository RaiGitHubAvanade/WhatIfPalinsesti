import ExcelJS from 'exceljs'
import { sanitizeFilenameSegment, styleWorksheetHeader, downloadBuffer } from './exportExcel'
import { getFeatureExplanationsFromResponse, simulationKey } from './predictionUtils'

function stripAfterAt(value) {
  const text = String(value || '').trim()
  const atIndex = text.indexOf('@')
  return atIndex >= 0 ? text.slice(0, atIndex) : text
}

// ─────────────────────────────────────────────────────────────────────────────
// Filename builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the xlsx filename encoding the active filters.
 * @param {{ typeFilter: string, dateFilter: string, search: string, onlyMineFilter?: boolean, userName?: string }} filters
 * @returns {string}  e.g. "scenari_sostituzione_2025-01-15_cerca-tg1_2026-07-06.xlsx"
 */
export function buildExportFilename({ typeFilter, dateFilter, search, onlyMineFilter, userName }) {
  const today = new Date().toISOString().slice(0, 10)
  const parts = ['scenari']
  if (onlyMineFilter) {
    const localUserName = stripAfterAt(userName || 'me') || 'me'
    parts.push(sanitizeFilenameSegment(localUserName))
  }
  if (typeFilter) parts.push(sanitizeFilenameSegment(typeFilter))
  if (dateFilter) parts.push(dateFilter) // already ISO date — safe
  if (search) parts.push('cerca-' + sanitizeFilenameSegment(search))
  parts.push(today)
  return parts.join('_') + '.xlsx'
}

// ─────────────────────────────────────────────────────────────────────────────
// Data flattener
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flatten filtered scenarios into a flat array of row objects.
 * Only simulations with status 'Completed' are included.
 * Returns an empty array if no Completed simulations exist.
 *
 * @param {Array<{ id: string, sc: object }>} filtered  — already-filtered scenarios from Scenarios.jsx
 * @returns {object[]}
 */
export function flattenScenariosForExport(filtered) {
  const rows = []

  for (const { id, sc } of filtered) {
    const completedItems = sc.items.filter(item => item._status === 'Completed')
    if (completedItems.length === 0) continue

    const scenarioTitle = sc.title || sc.anchor?.program_name || `Scenario ${id}`
    const scenarioBase = {
      'ID Scenario':              id,
      'Titolo Scenario':          scenarioTitle,
      'Tipo':                     sc.type === 'sostituzione' ? 'Sostituzione' : sc.type === 'spostamento' ? 'Spostamento' : sc.type ?? '',
      'Programma Originale':      sc.anchor?.program_name   ?? '',
      'Canale Originale':         sc.anchor?.channel        ?? '',
      'Data Messa in Onda':       sc.anchor?.date           ?? '',
      'Ora Originale':            sc.anchor?.from_time      ? sc.anchor.from_time.slice(0, 5) : '',
      'Share Originale Previsto (%)': sc.anchor?.share_predicted ?? '',
      'Creato da':                sc.createdBy              ?? '',
      'Creato il':                sc.createdAt              ?? '',
    }

    completedItems.forEach((item, idx) => {
      const r = item.result ?? {}
      const shapValuesJson = r.feature_explanations
        ? JSON.stringify(getFeatureExplanationsFromResponse(r.feature_explanations))
        : ''

      // ── sostituzione-specific ──────────────────────────────────────────────
      const isSost = item.mode === 'sostituzione'
      const sostCols = {
        'Programma Sostituto':                   isSost ? (r.cand_title   ?? '') : '',
        'Share Storico Sostituto (%)':           isSost ? (r.cand_share   ?? '') : '',
        'Share Previsto Post-Sostituzione (%)':  isSost ? (r.predicted_share ?? '') : '',
        'Delta Sostituzione (pp)':               isSost ? (r.delta        ?? '') : '',
      }

      // ── spostamento-specific ───────────────────────────────────────────────
      const isSposta = item.mode === 'spostamento'
      const spostaCols = {
        'Canale Destinazione':                    isSposta ? (r.dest_ch         ?? '') : '',
        'Data Destinazione':                      isSposta ? (r.dest_date       ?? '') : '',
        'Ora Destinazione':                       isSposta ? (r.dest_time ? r.dest_time.slice(0, 5) : '') : '',
        'Share Previsto Post-Spostamento (%)':    isSposta ? (r.dest_slot_share ?? '') : '',
        'Delta Spostamento (pp)':                 isSposta ? (r.delta           ?? '') : '',
      }

      rows.push({
        ...scenarioBase,
        'N° Simulazione':  idx + 1,
        'ID Simulazione':  item._sim_id ?? '',
        'Stato':           item._status ?? '',
        'Valori Shap':     shapValuesJson,
        ...sostCols,
        ...spostaCols,
      })
    })
  }

  return rows
}

export function flattenFeatureExplanationsForExport(filtered) {
  const rows = []
  for (const { id, sc } of filtered) {
    for (const item of sc.items.filter(simulation => simulation._status === 'Completed')) {
      const featureExplanations = getFeatureExplanationsFromResponse(item.result?.feature_explanations)
      const predictedShare = item.mode === 'sostituzione'
        ? item.result?.predicted_share
        : item.result?.dest_slot_share
      for (const feature of featureExplanations) {
        rows.push({
          'ID Scenario': id,
          'ID Simulazione': item._sim_id,
          'Tipo': item.mode,
          'Predizione': 1,
          'Share Previsto (%)': predictedShare ?? null,
          'Feature': feature.feature_name,
          'Valore Feature': feature.feature_value ?? null,
          'Valore Shap': feature.shap_value ?? null,
        })
      }
    }
  }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// Column width hints (keyed by exact header name)
// ─────────────────────────────────────────────────────────────────────────────

const COL_WIDTHS = {
  'ID Scenario':                           20,
  'Titolo Scenario':                       30,
  'Tipo':                                  14,
  'Programma Originale':                   30,
  'Canale Originale':                      16,
  'Data Messa in Onda':                    18,
  'Ora Originale':                         12,
  'Share Originale Previsto (%)':          24,
  'Creato da':                             22,
  'Creato il':                             20,
  'N° Simulazione':                        14,
  'ID Simulazione':                        34,
  'Stato':                                 12,
  'Valori Shap':                           40,
  'Programma Sostituto':                   30,
  'Share Storico Sostituto (%)':           24,
  'Share Previsto Post-Sostituzione (%)':  30,
  'Delta Sostituzione (pp)':               20,
  'Canale Destinazione':                   18,
  'Data Destinazione':                     18,
  'Ora Destinazione':                      14,
  'Share Previsto Post-Spostamento (%)':   30,
  'Delta Spostamento (pp)':                20,
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate and download an xlsx file from the filtered scenarios.
 *
 * @param {Array<{ id: string, sc: object }>} filtered  filtered scenario list
 * @param {{ typeFilter: string, dateFilter: string, search: string, onlyMineFilter?: boolean, userName?: string }} filters
 * @returns {{ ok: boolean, reason?: 'no_scenarios' | 'no_completed' }}
 */
export async function exportScenariosToExcel(filtered, filters) {
  // ── 1. Guard: nothing to export ──────────────────────────────────────────
  if (filtered.length === 0) {
    return { ok: false, reason: 'no_scenarios' }
  }

  const simulations = filtered.flatMap(({ sc }) => sc.items
    .filter(item => item._status === 'Completed')
    .map(item => ({ id: item._sim_id, simulation_type: item.mode })))
  if (simulations.length === 0) {
    return { ok: false, reason: 'no_completed' }
  }

  const { getFeatures } = await import('../services/apiScenarios')
  const responses = await getFeatures(simulations)
  if (responses.some(item => !item.feature_explanations)) {
    throw new Error('Dettagli non disponibili per alcune simulazioni. Verifica la migrazione dei dati.')
  }
  const byId = new Map(responses.map(item => [simulationKey(item.simulation_type, item.id), item.feature_explanations]))
  const enriched = filtered.map(({ id, sc }) => ({
    id,
    sc: {
      ...sc,
      items: sc.items.map(item => ({
        ...item,
        result: { ...item.result, feature_explanations: byId.get(simulationKey(item.mode, item._sim_id)) },
      })),
    },
  }))
  const rows = flattenScenariosForExport(enriched)

  // ── 2. Build workbook ────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RAI What-If'
  wb.created = new Date()

  const ws = wb.addWorksheet('Scenari')

  // Derive column order from first row (guarantees consistent ordering)
  const headers = Object.keys(rows[0])

  ws.columns = headers.map(h => ({
    header: h,
    key:    h,
    width:  COL_WIDTHS[h] ?? 18,
  }))

  // Style header row
  styleWorksheetHeader(ws)

  // Add data rows
  rows.forEach(row => ws.addRow(row))

  // Freeze the header row
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const featureRows = flattenFeatureExplanationsForExport(enriched)
  const featuresSheet = wb.addWorksheet('Fattori rilevanti')
  const featureHeaders = ['ID Scenario', 'ID Simulazione', 'Tipo', 'Predizione', 'Share Previsto (%)', 'Feature', 'Valore Feature', 'Valore Shap']
  featuresSheet.columns = featureHeaders.map(header => ({ header, key: header, width: header === 'Feature' ? 45 : 24 }))
  styleWorksheetHeader(featuresSheet)
  featureRows.forEach(row => featuresSheet.addRow(row))
  featuresSheet.views = [{ state: 'frozen', ySplit: 1 }]
  featuresSheet.autoFilter = 'A1:H1'

  // ── 3. Write to buffer and trigger download ───────────────────────────────
  downloadBuffer(await wb.xlsx.writeBuffer(), buildExportFilename(filters))

  return { ok: true }
}
