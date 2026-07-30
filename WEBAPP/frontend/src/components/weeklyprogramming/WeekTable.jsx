import WeekDay from './WeekDay'
import WeekTableInfo from './WeekTableInfo'
import './WeekTable.css'

/** @typedef {import('../../models/weekly_programming/raiProgramViewModel').RaiProgramViewModel} RaiProgramViewModel */
/** @typedef {import('../../models/weekly_programming/weeklyTableViewModel').WeeklyTableViewModel} WeeklyTableViewModel */

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

/**
 * @param {{ rows: RaiProgramViewModel[], loading: boolean, weekStart: string|null, weekLabel: string, wCh: string|null, editableFromDate: string|null, isEditMode: boolean, lockHolder: string|null, savingBatch: boolean, onManualChange: Function, onStartEdit: Function, onSaveEdit: Function, onCancelEdit: Function, onExport: () => void }} props
 */
export default function WeekTable({ rows, loading, weekStart, weekLabel, wCh, editableFromDate, isEditMode, lockHolder, savingBatch, onManualChange, onStartEdit, onSaveEdit, onCancelEdit, onExport }) {
  const groups = groupByDay(rows)

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
            onExport={onExport}
            editableFromDate={editableFromDate}
            isEditMode={isEditMode}
            lockHolder={lockHolder}
            savingBatch={savingBatch}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
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
              <th>Auditel</th>
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
                editableFromDate={editableFromDate}
                isEditMode={isEditMode}
                onManualChange={onManualChange}
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