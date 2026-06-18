import DayRow from './DayRow'
import './WeekDay.css'

/** @typedef {import('../../models/palinsestoViewModel').PalinsestoViewModel} PalinsestoViewModel */

/**
 * WeekDay renders all prime-time program rows for a single calendar day.
 * @param {{ rows: PalinsestoViewModel[], baseIdx: number, dayIso: string|null, dayLabel: string, wCh: string|null, isCurrentWeek: boolean }} props
 */
export default function WeekDay({ rows, baseIdx, dayIso, dayLabel, wCh, isCurrentWeek }) {
  return (
    <>
      {rows.map((row, i) => (
        <DayRow
          key={baseIdx + i}
          row={{ ...row, day: dayLabel }}
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

