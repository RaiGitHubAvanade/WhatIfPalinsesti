import ExcelJS from 'exceljs'
import { sanitizeFilenameSegment, styleWorksheetHeader, downloadBuffer } from './exportExcel'

// ─────────────────────────────────────────────────────────────────────────────
// Filename builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the xlsx filename encoding the active filters (channel + week Monday ISO).
 * @param {{ channel: string, weekStart: string }} params
 * @returns {string}  e.g. "palinsesto_rai1_2026-06-15_2026-07-06.xlsx"
 */
export function buildWeeklyExportFilename({ channel, weekStart }) {
  const today = new Date().toISOString().slice(0, 10)
  const parts = ['palinsesto']
  if (channel) parts.push(sanitizeFilenameSegment(channel))
  if (weekStart) parts.push(weekStart) // already ISO date — safe
  parts.push(today)
  return parts.join('_') + '.xlsx'
}

// ─────────────────────────────────────────────────────────────────────────────
// Data flattener
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flatten weekly rows into a flat array of row objects, applying wOverrides.
 * Replicates the same display logic as DayRow.jsx.
 *
 * @param {import('../models/weekly_programming/raiProgramViewModel').RaiProgramViewModel[]} rows
 * @param {Record<string, { prog?: string, manual?: number|null }>} wOverrides
 * @param {string|null} channel
 * @returns {object[]}
 */
export function flattenWeeklyRowsForExport(rows, wOverrides, channel) {
  return rows.map(row => {
    const overrideKey = `${row.day}|${row.from_time}|${row.to_time}`
    const override = wOverrides[overrideKey]

    // Replicate DayRow display logic
    const displayProg = override?.prog ?? row.program_name ?? ''
    const manualeVal = (override && 'manual' in override) ? override.manual : (row.share_manual ?? null)
    const baseForDelta = manualeVal != null ? manualeVal : row.share_expected
    const scostamento = row.share_real != null && baseForDelta != null
      ? parseFloat((row.share_real - baseForDelta).toFixed(1))
      : null

    return {
      'Canale':             channel ?? '',
      'Data':               row.day ?? '',
      'Orario':             row.from_time && row.to_time
                              ? `${row.from_time}–${row.to_time}`
                              : (row.from_time ?? ''),
      'Programma':          displayProg,
      'Previsto (%)':       row.share_expected ?? '',
      'Manuale (%)':        manualeVal ?? '',
      'Auditel (%)':        row.share_real ?? '',
      'Scostamento (pp)':   scostamento ?? '',
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Column width hints
// ─────────────────────────────────────────────────────────────────────────────

const COL_WIDTHS = {
  'Canale':           14,
  'Data':             14,
  'Orario':           14,
  'Programma':        34,
  'Previsto (%)':     14,
  'Manuale (%)':      14,
  'Auditel (%)':      14,
  'Scostamento (pp)': 18,
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate and download an xlsx file from the loaded weekly rows.
 *
 * @param {import('../models/weekly_programming/raiProgramViewModel').RaiProgramViewModel[]} rows
 * @param {Record<string, { prog?: string, manual?: number|null }>} wOverrides
 * @param {{ channel: string|null, weekStart: string|null }} meta
 * @returns {Promise<void>}
 */
export async function exportWeeklyToExcel(rows, wOverrides, meta) {
  const flatRows = flattenWeeklyRowsForExport(rows, wOverrides, meta.channel)

  // ── Build workbook ─────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RAI What-If'
  wb.created = new Date()

  const ws = wb.addWorksheet('Palinsesto')

  const headers = Object.keys(flatRows[0])

  ws.columns = headers.map(h => ({
    header: h,
    key:    h,
    width:  COL_WIDTHS[h] ?? 18,
  }))

  // Style header row
  styleWorksheetHeader(ws)

  flatRows.forEach(row => ws.addRow(row))

  // Freeze the header row
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  // ── Write to buffer and trigger download ────────────────────────────────────
  downloadBuffer(
    await wb.xlsx.writeBuffer(),
    buildWeeklyExportFilename({ channel: meta.channel ?? '', weekStart: meta.weekStart ?? '' }),
  )
}
