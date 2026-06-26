import { useState } from 'react'
import { useApp } from '../context/useApp'
import { getWeeklyTable } from '../services/apiWeeklyProgramming'

/** @typedef {import('../models/weekly_programming/programViewModel').ProgramViewModel} ProgramViewModel */
/** @typedef {import('../models/weekly_programming/weeklyTableViewModel').WeeklyTableViewModel} WeeklyTableViewModel */
import ChannelSelector from '../components/shared/ChannelSelector'
import DaySelector from '../components/shared/DaySelector'
import WeekTable from '../components/weeklyprogramming/WeekTable'
import './WeeklyProgramming.css'

/** Return the ISO date string (YYYY-MM-DD) of the Monday of the week containing dayISO. */
function getMondayISO(dayISO) {
  const d = new Date(dayISO + 'T00:00:00')
  const dow = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Return the ISO date string (YYYY-MM-DD) of the Sunday of the current week. */
function getCurrentWeekSunday() {
  const today = new Date()
  const dow = today.getDay()
  const daysToSunday = dow === 0 ? 0 : 7 - dow
  const sunday = new Date(today)
  sunday.setDate(today.getDate() + daysToSunday)
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
}

export default function WeeklyProgramming() {
  const { state, set, clearWeeklyOverrides, toast } = useApp()
  const { wCh } = state

  const [selectedDay, setSelectedDay] = useState('')
  /** @type {[PalinsestoViewModel[], React.Dispatch<React.SetStateAction<PalinsestoViewModel[]>>]} */
  const [rows, setRows] = useState([])
  const [weekStart, setWeekStart] = useState(null)
  const [weekLabel, setWeekLabel] = useState('')
  const [loadedChannel, setLoadedChannel] = useState(null)
  const [loading, setLoading] = useState(false)

  const resetWeeklyView = () => {
    setSelectedDay('')
    setRows([])
    setWeekStart(null)
    setWeekLabel('')
    setLoadedChannel(null)
    clearWeeklyOverrides()
    set({ wCh: null })
  }

  const handleLoad = async () => {
    if (!wCh) { toast('Seleziona un canale'); return }
    if (!selectedDay) { toast('Seleziona un giorno'); return }
    setLoading(true)
    clearWeeklyOverrides()
    try {
      /** @type {WeeklyTableViewModel} */
      const data = await getWeeklyTable(wCh, selectedDay)
      setRows(data.rows || [])
      setWeekStart(getMondayISO(selectedDay))
      setWeekLabel(data.week)
      setLoadedChannel(data.channel)
    } catch (e) {
      toast('Errore caricamento palinsesto: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const hasFilters = Boolean(wCh || selectedDay)

  return (
    <div>
      <div className="page-sub">Visualizza e modifica il palinsesto settimanale dalle 20:30 alle 23:30. Puoi inserire manualmente le previsioni share.</div>

      {/* Controls */}
      <div className="pw-controls">
        <div className="pw-controls-inner">
          <div className="pw-ctrl-group">
            <ChannelSelector
              selected={wCh}
              onChange={c => set({ wCh: c })}
            />
          </div>

          <div className="pw-ctrl-sep" />

          <div className="pw-ctrl-group">
            <DaySelector
              label="Settimana"
              value={selectedDay}
              onChange={setSelectedDay}
              maxDate={getCurrentWeekSunday()}
            />
          </div>

          <div className="pw-ctrl-sep" />

          <div className="pw-ctrl-cta pw-ctrl-cta-row">
            {hasFilters && (
              <button
                className="btn-inline ghost pw-reset-btn"
                onClick={resetWeeklyView}
                disabled={loading}
              >
                ↩ Reset
              </button>
            )}
            <button
              className="btn-inline primary pw-load-btn"
              onClick={handleLoad}
              disabled={loading || !wCh || !selectedDay}
            >
              {loading ? 'Caricamento…' : '📥 Carica Palinsesto'}
            </button>
          </div>
        </div>

      </div>

      {/* Table */}
      <WeekTable
        rows={rows}
        loading={loading}
        weekStart={weekStart}
        weekLabel={weekLabel}
        wCh={loadedChannel}
      />
    </div>
  )
}

