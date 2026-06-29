import { useState } from 'react'
import { useApp } from '../../context/useApp'
import OtherChannelsModal from './OtherChannelsModal'
import { editManualShare } from '../../services/apiWeeklyProgramming'
import './DayRow.css'

/** @typedef {import('../../models/weekly_programming/programViewModel').ProgramViewModel} ProgramViewModel */

/**
 * @param {{ row: ProgramViewModel, idx: number, showDay: boolean, dayIso: string|null, wCh: string|null, isCurrentWeek: boolean }} props
 */
export default function DayRow({ row, showDay, dayIso, wCh, isCurrentWeek }) {
  const { state, applyWeeklyOverride, toast } = useApp()
  const overrideKey = `${dayIso}|${row.from_time}|${row.to_time}`
  const override = state.wOverrides[overrideKey]
  const [editingManuale, setEditingManuale] = useState(false)
  const [editManualeVal, setEditManualeVal] = useState('')
  const [showAltriCanali, setShowAltriCanali] = useState(false)

  const displayProg = override?.prog ?? row.program_name
  // If the user has explicitly set (or cleared) the value, use that; otherwise fall back to the DB value.
  const manualeVal = (override && 'manual' in override) ? override.manual : (row.share_manual ?? null)

  // Scostamento uses Manuale if set, otherwise Previsto from API
  const baseForDelta = manualeVal != null ? manualeVal : row.share_expected
  const delta = row.share_real != null && baseForDelta != null
    ? (row.share_real - baseForDelta).toFixed(1)
    : null
  const deltaNum = delta != null ? parseFloat(delta) : null
  const rowClass = deltaNum != null ? (deltaNum > 10 ? 'sP' : deltaNum < -10 ? 'sN' : '') : ''

  const handleSaveManuale = async () => {
    const trimmed = editManualeVal.trim()
    let newValue = null
    if (trimmed !== '') {
      const num = parseFloat(trimmed)
      if (isNaN(num)) { setEditingManuale(false); return }
      newValue = num
    }

    // Skip if nothing changed
    if (newValue === manualeVal) { setEditingManuale(false); return }

    // Optimistically update local state — always store manual explicitly (null = cleared)
    applyWeeklyOverride(overrideKey, { ...(override || {}), manual: newValue })
    setEditingManuale(false)

    // Persist to backend
    try {
      await editManualShare({
        channel: wCh,
        program_name: row.program_name,
        from_time: row.from_time,
        to_time: row.to_time,
        day: dayIso,
        value: newValue,
      })
    } catch (e) {
      toast('Errore salvataggio share manuale: ' + e.message)
    }
  }

  return (
    <tr className={rowClass}>
      <td
        className={`pw-dr-day${showDay ? '' : ' pw-dr-day--hidden'}`}
        aria-hidden={showDay ? undefined : 'true'}
      >
        {showDay ? row.day : '\u00A0'}
      </td>
      <td className="pw-dr-time">
        {row.from_time && row.to_time ? `${row.from_time}–${row.to_time}` : (row.from_time || '--')}
      </td>
      <td className="pw-dr-prog">{displayProg}</td>
      <td className="pw-dr-prev">
        {row.share_expected != null ? row.share_expected + '%' : <span className="pw-muted-italic">—</span>}
      </td>
      <td className="pw-dr-manual">
        {/* View state — always rendered so the cell keeps its size */}
        <span className="pw-prev-view" style={{ visibility: editingManuale ? 'hidden' : 'visible' }}>
          <span className="pw-prev-value">
            {manualeVal != null ? manualeVal + '%' : <span className="pw-muted-italic">—</span>}
          </span>
          {isCurrentWeek && (
            <button
              className="pw-edit-btn"
              onClick={() => { setEditManualeVal(manualeVal ?? ''); setEditingManuale(true) }}
              title="Modifica manuale"
            >✏️</button>
          )}
        </span>
        {/* Edit state — absolutely positioned so it doesn't affect layout */}
        {editingManuale && (
          <span className="pw-prev-edit">
            <input
              className="pw-prev-input"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={editManualeVal}
              onChange={e => setEditManualeVal(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveManuale()
                if (e.key === 'Escape') setEditingManuale(false)
              }}
            />
            <span className="pw-unit">%</span>
            <button className="btn-inline pw-ok-btn" onClick={handleSaveManuale}>OK</button>
          </span>
        )}
      </td>
      <td className="pw-dr-real">
        {row.share_real != null ? row.share_real + '%' : <span className="pw-muted">—</span>}
      </td>
      <td>
        {deltaNum != null ? (
          <span className={`pw-scost-pill ${deltaNum > 0 ? 'pw-scost-pos' : 'pw-scost-neg'}`}>
            {deltaNum > 0 ? '+' : ''}{deltaNum}%
          </span>
        ) : <span className="pw-muted">—</span>}
      </td>
      <td>
        <button
          className="ac-btn"
          onClick={() => setShowAltriCanali(true)}
          title="Visualizza programmazione altri canali"
        >
          Mostra
        </button>
        {showAltriCanali && (
          <OtherChannelsModal
            channel={wCh}
            day={dayIso}
            from_time={row.from_time}
            to_time={row.to_time}
            program_name={row.program_name}
            onClose={() => setShowAltriCanali(false)}
          />
        )}
      </td>
    </tr>
  )
}
