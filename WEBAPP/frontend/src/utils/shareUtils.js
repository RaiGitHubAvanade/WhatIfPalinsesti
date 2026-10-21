import { SHARE_DECIMALS } from './constants'

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Format a share percentage (e.g. 8.4) as "8.40%".
 * @param {number|null|undefined} value
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatShare(value, fallback = '—') {
  return isFiniteNumber(value) ? `${value.toFixed(SHARE_DECIMALS)}%` : fallback
}

/**
 * Format a share number without the percent sign (e.g. 8.4 -> "8.40").
 * @param {number|null|undefined} value
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatShareNumber(value, fallback = '—') {
  return isFiniteNumber(value) ? value.toFixed(SHARE_DECIMALS) : fallback
}

/**
 * Format a signed share delta (e.g. 0.1 -> "+0.10").
 * @param {number|null|undefined} value
 * @param {string} [fallback='—']
 * @returns {string}
 */
export function formatShareDelta(value, fallback = '—') {
  return isFiniteNumber(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(SHARE_DECIMALS)}` : fallback
}

/**
 * Round a share value to the display precision, keeping it numeric (null-safe).
 * @param {number|null|undefined} value
 * @returns {number|null}
 */
export function roundShare(value) {
  return isFiniteNumber(value) ? Number(value.toFixed(SHARE_DECIMALS)) : null
}

/** ExcelJS number formats matching the display precision. */
export const SHARE_EXCEL_NUMFMT = `0.${'0'.repeat(SHARE_DECIMALS)}`
export const SHARE_EXCEL_PERCENT_NUMFMT = `${SHARE_EXCEL_NUMFMT}%`
