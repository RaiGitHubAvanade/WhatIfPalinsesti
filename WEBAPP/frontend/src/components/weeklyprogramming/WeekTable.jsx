import WeekDay from './WeekDay'
import WeekTableInfo from './WeekTableInfo'
import './WeekTable.css'

/** @typedef {import('../../models/programViewModel').ProgramViewModel} ProgramViewModel */
/** @typedef {import('../../models/weeklyTableViewModel').WeeklyTableViewModel} WeeklyTableViewModel */

const _DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

/** Returns display label "Mer 17/06" from an ISO date string "2026-06-18". */
function isoToDayLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  const dow = d.getDay()
  const offset = dow === 0 ? 6 : dow - 1  // Mon=0 … Sun=6
  return _DAY_NAMES[offset] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
}

/** Group a flat rows array into [{day, rows}] preserving order. */
function groupByDay(rows) {
  const map = new Map()
  for (const row of rows) {
    const key = row.day || ''
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
  }
  return [...map.entries()].map(([day, rows]) => ({ day, rows }))
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
 * @param {{ rows: ProgramViewModel[], loading: boolean, weekStart: string|null, weekLabel: string, wCh: string|null }} props
 */
export default function WeekTable({ rows, loading, weekStart, weekLabel, wCh }) {
  const groups = groupByDay(rows)
  const isCurrentWeek = weekStart === getCurrentWeekMondayISO()

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
            {groups.map((g) => (
              <WeekDay
                key={g.day}
                rows={g.rows}
                dayIso={g.day}
                dayLabel={isoToDayLabel(g.day)}
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