import ExcelJS from 'exceljs'
import { sanitizeFilenameSegment, styleWorksheetHeader, downloadBuffer } from './exportExcel'

// ─────────────────────────────────────────────────────────────────────────────
// Filename builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the xlsx filename encoding the active filters.
 * @param {{ typeFilter: string, dateFilter: string, search: string }} filters
 * @returns {string}  e.g. "scenari_sostituzione_2025-01-15_cerca-tg1_2026-07-06.xlsx"
 */
export function buildExportFilename({ typeFilter, dateFilter, search }) {
  const today = new Date().toISOString().slice(0, 10)
  const parts = ['scenari']
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
      'Creato il':                sc.createdAt              ?? '',
    }

    completedItems.forEach((item, idx) => {
      const r = item.result ?? {}

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
        ...sostCols,
        ...spostaCols,
      })
    })
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
  'Creato il':                             20,
  'N° Simulazione':                        14,
  'ID Simulazione':                        34,
  'Stato':                                 12,
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
 * @param {{ typeFilter: string, dateFilter: string, search: string }} filters
 * @returns {{ ok: boolean, reason?: 'no_scenarios' | 'no_completed' }}
 */
export async function exportScenariosToExcel(filtered, filters) {
  // ── 1. Guard: nothing to export ──────────────────────────────────────────
  if (filtered.length === 0) {
    return { ok: false, reason: 'no_scenarios' }
  }

  const rows = flattenScenariosForExport(filtered)

  if (rows.length === 0) {
    return { ok: false, reason: 'no_completed' }
  }

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

  // ── 3. Write to buffer and trigger download ───────────────────────────────
  downloadBuffer(await wb.xlsx.writeBuffer(), buildExportFilename(filters))

  return { ok: true }
}
