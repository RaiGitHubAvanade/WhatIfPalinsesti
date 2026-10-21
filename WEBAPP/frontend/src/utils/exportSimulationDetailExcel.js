import ExcelJS from 'exceljs'
import { sanitizeFilenameSegment, styleWorksheetHeader, downloadBuffer } from './exportExcel'
import { getFeatureExplanationsFromResponse } from './predictionUtils'
import { SHARE_EXCEL_PERCENT_NUMFMT } from './shareUtils'

const SCENARIO_LABELS = {
  sostituzione: 'Sostituzione Programma',
  spostamento: 'Spostamento Programma',
}

const CENTER = { alignment: { horizontal: 'center' } }

const OCCURRENCE_COLUMNS = [
  { header: 'Ruolo',             key: 'role',             width: 14 },
  { header: 'Programma',         key: 'scenario_program', width: 32 },
  { header: 'Tipo Trasmissione', key: 'broadcast_type',   width: 18 },
  { header: 'Dir. Genere',       key: 'direction_genre',  width: 24 },
  { header: 'Data',              key: 'date',             width: 12, style: { ...CENTER, numFmt: 'dd/mm/yyyy' } },
  { header: 'Tipo Giorno',       key: 'day_name',         width: 12, style: CENTER },
  { header: 'Ora Inizio',        key: 'from_time',        width: 11, style: CENTER },
  { header: 'Ora Fine',          key: 'to_time',          width: 11, style: CENTER },
  { header: 'Durata (min)',      key: 'duration_minutes', width: 12, style: { ...CENTER, numFmt: '0' } },
  { header: 'Canale',            key: 'channel',          width: 12, style: CENTER },
  { header: 'Share',             key: 'share',            width: 10, style: { ...CENTER, numFmt: SHARE_EXCEL_PERCENT_NUMFMT } },
  { header: 'AMR (000)',         key: 'amr',              width: 12, style: { ...CENTER, numFmt: '#,##0' } },
  { header: 'Platea (000)',      key: 'platea',           width: 12, style: { ...CENTER, numFmt: '#,##0' } },
  { header: 'Share Uomini',      key: 'share_men',        width: 13, style: { ...CENTER, numFmt: SHARE_EXCEL_PERCENT_NUMFMT } },
  { header: 'Share Donne',       key: 'share_women',      width: 13, style: { ...CENTER, numFmt: SHARE_EXCEL_PERCENT_NUMFMT } },
  { header: 'AMR Uomini (000)',  key: 'amr_men',          width: 14, style: { ...CENTER, numFmt: '#,##0' } },
  { header: 'AMR Donne (000)',   key: 'amr_women',        width: 14, style: { ...CENTER, numFmt: '#,##0' } },
]

const ROLE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }

const FEATURE_COLUMNS = [
  { header: 'Feature Name',  key: 'feature_name',  width: 45 },
  { header: 'Feature Value', key: 'feature_value', width: 30 },
  { header: 'Shap Value',    key: 'shap_value',    width: 14, style: { numFmt: '0.0000' } },
]

function isoToExcelDate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** API percentages (e.g. 10.6) -> Excel fractions (0.106) so the '0.0%' format renders "10.6%". */
function percentToFraction(value) {
  return typeof value === 'number' ? value / 100 : null
}

function toOccurrenceRow(occurrence) {
  return {
    role: occurrence.role,
    scenario_program: occurrence.scenario_program,
    broadcast_type: occurrence.broadcast_type,
    direction_genre: occurrence.direction_genre,
    date: isoToExcelDate(occurrence.date),
    day_name: occurrence.day_name,
    from_time: occurrence.from_time,
    to_time: occurrence.to_time,
    duration_minutes: occurrence.duration_minutes,
    channel: occurrence.channel,
    share: percentToFraction(occurrence.share),
    amr: occurrence.amr,
    platea: occurrence.platea,
    share_men: percentToFraction(occurrence.share_men),
    share_women: percentToFraction(occurrence.share_women),
    amr_men: occurrence.amr_men,
    amr_women: occurrence.amr_women,
  }
}

function toDisplayName(name) {
  return String(name || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Same ordering as the "Fattori rilevanti" chart: |shap| desc, then shap desc, then name. */
function sortFeatures(features) {
  return features
    .filter(feature => feature && Number.isFinite(Number(feature.shap_value)))
    .map(feature => ({ ...feature, shap_value: Number(feature.shap_value), name: toDisplayName(feature.feature_name) }))
    .sort((a, b) => (Math.abs(b.shap_value) - Math.abs(a.shap_value)) || (b.shap_value - a.shap_value) || a.name.localeCompare(b.name))
}

/**
 * Write a sheet with a description line on row 1 and a styled header on row 2.
 * @param {import('exceljs').Workbook} wb
 */
function addSheet(wb, name, description, columns, rows) {
  const ws = wb.addWorksheet(name)
  ws.columns = columns.map(({ key, width, style }) => ({ key, width, style }))

  ws.addRow([description])
  ws.mergeCells(1, 1, 1, columns.length)
  const descriptionCell = ws.getCell(1, 1)
  descriptionCell.font = { italic: true, color: { argb: 'FF6B7A99' } }
  descriptionCell.alignment = { vertical: 'middle', wrapText: true }
  ws.getRow(1).height = 22

  ws.addRow(columns.map(column => column.header))
  styleWorksheetHeader(ws, 2)

  rows.forEach(row => ws.addRow(row))
  ws.views = [{ state: 'frozen', ySplit: 2 }]
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: columns.length } }
  return ws
}

/**
 * Build the "Scarica Dettaglio" filename.
 * @returns {string} e.g. "dettaglio_sostituzione_un-posto-al-sole_la-volta-buona_2026-08-03.xlsx"
 */
export function buildSimulationDetailFilename({ simulationType, programName, targetName, date }) {
  const parts = ['dettaglio', simulationType]
  if (programName) parts.push(sanitizeFilenameSegment(programName))
  if (targetName) parts.push(sanitizeFilenameSegment(targetName))
  if (date) parts.push(date)
  return parts.filter(Boolean).join('_') + '.xlsx'
}

/**
 * Generate and download the simulation detail workbook.
 *
 * @param {object} params
 * @param {'sostituzione'|'spostamento'} params.simulationType
 * @param {import('../services/apiScenarios').SimulationContext} params.context
 * @param {unknown} params.featureExplanations  feature explanations as returned by /api/scenarios/features
 * @param {string} params.filename
 */
export async function exportSimulationDetailToExcel({ simulationType, context, featureExplanations, filename }) {
  const scenarioLabel = SCENARIO_LABELS[simulationType] || simulationType

  const wb = new ExcelJS.Workbook()
  wb.creator = 'RAI What-If'
  wb.created = new Date()

  const occurrencesSheet = addSheet(
    wb,
    'Dettaglio Occorrenze',
    `Occorrenze storiche utilizzate dal modello per lo scenario di ${scenarioLabel}`,
    OCCURRENCE_COLUMNS,
    (context?.occurrences || []).map(toOccurrenceRow),
  )
  occurrencesSheet.getColumn(1).eachCell((cell, rowNumber) => {
    if (rowNumber > 2) cell.fill = ROLE_FILL
  })

  addSheet(
    wb,
    'Features e Valori Shap',
    `Fattori rilevanti (feature e valori SHAP) della previsione per lo scenario di ${scenarioLabel}`,
    FEATURE_COLUMNS,
    sortFeatures(getFeatureExplanationsFromResponse(featureExplanations)).map(feature => ({
      feature_name: feature.name,
      feature_value: feature.feature_value ?? 'N/D',
      shap_value: feature.shap_value,
    })),
  )

  downloadBuffer(await wb.xlsx.writeBuffer(), filename)
}
