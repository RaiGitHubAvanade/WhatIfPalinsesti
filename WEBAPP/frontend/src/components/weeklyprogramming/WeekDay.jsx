import DayRow from './DayRow'
import './WeekDay.css'

/** @typedef {import('../../models/weekly_programming/raiProgramViewModel').RaiProgramViewModel} RaiProgramViewModel */

/**
 * WeekDay renders all prime-time program rows for a single calendar day.
 * @param {{ rows: PalinsestoViewModel[], dayIso: string|null, dayLabel: string, wCh: string|null, editableFromDate: string|null, isEditMode: boolean, onManualChange: Function }} props
 */
export default function WeekDay({ rows, dayIso, dayLabel, wCh, editableFromDate, isEditMode, onManualChange }) {
  return (
    <>
      {rows.map((row, i) => (
        <DayRow
          key={`${dayIso}|${row.from_time}|${row.to_time}`}
          row={{ ...row, day: dayLabel }}
          showDay={i === 0}
          dayIso={dayIso}
          wCh={wCh}
          editableFromDate={editableFromDate}
          isEditMode={isEditMode}
          onManualChange={onManualChange}
        />
      ))}
      <tr className="pw-day-separator" aria-hidden="true">
        <td colSpan={8} />
      </tr>
    </>
  )
}

