import WeekDay from './WeekDay'
import WeekTableInfo from './WeekTableInfo'
import './WeekTable.css'

/** @typedef {import('../../models/palinsestoViewModel').PalinsestoViewModel} PalinsestoViewModel */
/** @typedef {import('../../models/weeklyTableViewModel').WeeklyTableViewModel} WeeklyTableViewModel */

/** Group a flat rows array into [{day, rows, baseIdx}] preserving order. */
function groupByDay(rows) {
  const groups = []
  const seen = new Map()
  rows.forEach((row, idx) => {
    const key = row.day || ''
    if (!seen.has(key)) {
      seen.set(key, groups.length)
      groups.push({ day: key, rows: [], baseIdx: idx })
    }
    groups[seen.get(key)].rows.push(row)
  })
  return groups
}

/** Returns the ISO date string (YYYY-MM-DD) of the Monday of the current week. */
function getCurrentWeekMondayISO() {
  const today = new Date()
  const dow = today.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

/**
 * @param {{ rows: PalinsestoViewModel[], loading: boolean, weekStart: string|null, weekLabel: string, wCh: string|null, wOverrides: Object }} props
 */
export default function WeekTable({ rows, loading, weekStart, weekLabel, wCh, wOverrides }) {
  const groups = groupByDay(rows)
  const isCurrentWeek = Boolean(weekStart) && weekStart === getCurrentWeekMondayISO()

  return (
    <div>
      {rows.length === 0 && !loading ? (
            <div className="pw-weekly-status">
            Seleziona un canale e una settimana, poi premi "Carica Palinsesto".
            </div>
      ) : loading ? (
        
        <div className="pw-weekly-wrap">
            <div className="pw-weekly-status">
            Caricamento in corso…
            </div>
        </div>
      ) : (
        
        <>
          <WeekTableInfo
            weekStart={weekStart}
            weekLabel={weekLabel}
            wCh={wCh}
          />
    <div className="pw-weekly-wrap">
          <table>
          <thead>
            <tr>
              <th>Giorno</th>
              <th>Orario</th>
              <th>Programma</th>
              <th>Previsto</th>
              <th>Manuale</th>
              <th>Reale</th>
              <th>Scostamento</th>
              <th>Altri Canali</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g, gIdx) => (
              <WeekDay
                key={g.day}
                rows={g.rows}
                baseIdx={g.baseIdx}
                gIdx={gIdx}
                weekStart={weekStart}
                wCh={wCh}
                isCurrentWeek={isCurrentWeek}
              />
            ))}
          </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  )
}