/**
 * Shared ExcelJS utilities used by all export modules.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Filename helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize a string so it is safe to use inside a filename.
 * Lowercases, replaces whitespace with dashes, strips unsafe characters,
 * and truncates to 30 characters.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeFilenameSegment(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .slice(0, 30)
}

// ─────────────────────────────────────────────────────────────────────────────
// Worksheet header styling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply standard header row styling to an ExcelJS worksheet.
 * Must be called after ws.columns has been set.
 * @param {import('exceljs').Worksheet} ws
 */
export function styleWorksheetHeader(ws) {
  const headerRow = ws.getRow(1)
  headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  headerRow.height    = 36
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser download trigger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger a browser file download from an ExcelJS writeBuffer result.
 * @param {ArrayBuffer} buffer
 * @param {string} filename
 */
export function downloadBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
