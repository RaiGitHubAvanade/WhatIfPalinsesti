import DayRow from './DayRow'
import './WeekDay.css'

/** @typedef {import('../../models/palinsestoViewModel').PalinsestoViewModel} PalinsestoViewModel */

/**
 * WeekDay renders all prime-time program rows for a single calendar day.
 * @param {{ rows: PalinsestoViewModel[], baseIdx: number, gIdx: number, weekStart: string|null, wCh: string|null, isCurrentWeek: boolean }} props
 */
export default function WeekDay({ rows, baseIdx, gIdx, weekStart, wCh, isCurrentWeek }) {
  const dayIso = computeDayIso(weekStart, gIdx)

  return (
    <>
      {rows.map((row, i) => (
        <DayRow
          key={baseIdx + i}
          row={row}
          idx={baseIdx + i}
          showDay={i === 0}
          dayIso={dayIso}
          wCh={wCh}
          isCurrentWeek={isCurrentWeek}
        />
      ))}
      <tr className="pw-day-separator" aria-hidden="true">
        <td colSpan={8} />
      </tr>
    </>
  )
}

function computeDayIso(weekStart, gIdx) {
  if (!weekStart || gIdx == null) return null
  try {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + gIdx)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return null
  }
}
