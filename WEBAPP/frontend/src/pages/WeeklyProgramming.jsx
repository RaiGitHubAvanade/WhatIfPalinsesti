import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/useApp'
import { getWeeklyTable, acquireLock, releaseLock, editManualShareBatch } from '../services/apiWeeklyProgramming'
import { useSSEEvent } from '../hooks/useSSEEvent'

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

// /** Return the ISO date string (YYYY-MM-DD) of the Sunday of the current week. */
// function getCurrentWeekSunday() {
//   const today = new Date()
//   const dow = today.getDay()
//   const daysToSunday = dow === 0 ? 0 : 7 - dow
//   const sunday = new Date(today)
//   sunday.setDate(today.getDate() + daysToSunday)
//   return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
// }

function getDatePlusDays(days) {
  const today = new Date();
  const target = new Date(today);

  target.setDate(today.getDate() + days);

  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

export default function WeeklyProgramming() {
  const { state, set, clearWeeklyOverrides, applyWeeklyOverride, toast } = useApp()
  const { wCh } = state

  // ── Table state ──────────────────────────────────────────────────────────
  const [selectedDay, setSelectedDay] = useState('')
  const [rows, setRows] = useState([])
  const [weekStart, setWeekStart] = useState(null)
  const [weekLabel, setWeekLabel] = useState('')
  const [loadedChannel, setLoadedChannel] = useState(null)
  const [loading, setLoading] = useState(false)

  // ── Edit-mode state ──────────────────────────────────────────────────────
  const [isEditMode, setIsEditMode] = useState(false)
  const [lockHolder, setLockHolder]   = useState(null)  // another user's email when they hold the lock
  const [savingBatch, setSavingBatch] = useState(false)

  // ── Stable refs (avoid stale closures in callbacks/effects) ─────────────
  const clientIdRef      = useRef(crypto.randomUUID())
  const weekStartRef     = useRef(null)
  const loadedChannelRef = useRef(null)
  const isEditModeRef    = useRef(false)
  const pendingChangesRef = useRef(new Map())  // rowId → value|null

  useEffect(() => { weekStartRef.current     = weekStart },     [weekStart])
  useEffect(() => { loadedChannelRef.current = loadedChannel }, [loadedChannel])
  useEffect(() => { isEditModeRef.current    = isEditMode },    [isEditMode])

  // ── Release lock on unmount (user navigates to another page) ────────────
  useEffect(() => {
    return () => {
      if (isEditModeRef.current && weekStartRef.current) {
        releaseLock({ weekMonday: weekStartRef.current, clientId: clientIdRef.current })
      }
    }
  }, [])

  // ── Edit-mode helpers ────────────────────────────────────────────────────
  const exitEditMode = useCallback(() => {
    clearWeeklyOverrides()
    pendingChangesRef.current.clear()
    setIsEditMode(false)
    setLockHolder(null)
  }, [clearWeeklyOverrides])

  const resetWeeklyView = useCallback(() => {
    if (isEditModeRef.current && weekStartRef.current) {
      releaseLock({ weekMonday: weekStartRef.current, clientId: clientIdRef.current })
    }
    exitEditMode()
    setSelectedDay('')
    setRows([])
    setWeekStart(null)
    setWeekLabel('')
    setLoadedChannel(null)
    set({ wCh: null })
  }, [exitEditMode, set])

  const handleLoad = useCallback(async () => {
    // Release any existing lock before loading a new week
    if (isEditModeRef.current && weekStartRef.current) {
      releaseLock({ weekMonday: weekStartRef.current, clientId: clientIdRef.current })
      exitEditMode()
    } else {
      clearWeeklyOverrides()
    }
    setLockHolder(null)
    setLoading(true)
    try {
      const data = await getWeeklyTable(wCh, selectedDay)
      const nextRows = data.rows || []
      setRows(nextRows)
      setWeekStart(getMondayISO(selectedDay))
      setWeekLabel(data.week)
      setLoadedChannel(data.channel)
      if (nextRows.length === 0) {
        toast('Purtroppo non sono stati trovati programmi inerenti ai filtri selezionati', 'warning')
      }
    } catch (e) {
      toast(e.message || 'Errore caricamento palinsesto', 'error')
    } finally {
      setLoading(false)
    }
  }, [wCh, selectedDay, exitEditMode, clearWeeklyOverrides, toast])

  const handleStartEdit = useCallback(async () => {
    if (!weekStartRef.current) return
    try {
      const result = await acquireLock({ weekMonday: weekStartRef.current, clientId: clientIdRef.current })
      if (!result.acquired) {
        toast(`Modifica non disponibile: ${result.holder} sta modificando gli share manuali di questa settimana`, 'warning')
        return
      }
      setIsEditMode(true)
    } catch (e) {
      toast(e.message || 'Errore acquisizione blocco modifica', 'error')
    }
  }, [toast])

  const handleSaveEdit = useCallback(async () => {
    const changes = Object.fromEntries(pendingChangesRef.current)
    setSavingBatch(true)
    try {
      if (Object.keys(changes).length > 0) {
        await editManualShareBatch({ changes })
      }
      await releaseLock({ weekMonday: weekStartRef.current, clientId: clientIdRef.current })
      pendingChangesRef.current.clear()
      setIsEditMode(false)
      toast('Share manuali salvati con successo', 'success')
    } catch (e) {
      toast(e.message || 'Errore salvataggio share manuali', 'error')
    } finally {
      setSavingBatch(false)
    }
  }, [toast])

  const handleCancelEdit = useCallback(() => {
    if (weekStartRef.current) {
      releaseLock({ weekMonday: weekStartRef.current, clientId: clientIdRef.current })
    }
    exitEditMode()
  }, [exitEditMode])

  const handleManualChange = useCallback((rowId, overrideKey, newValue) => {
    pendingChangesRef.current.set(rowId, newValue)
    applyWeeklyOverride(overrideKey, { manual: newValue })
  }, [applyWeeklyOverride])

  // ── SSE handlers ─────────────────────────────────────────────────────────
  const handleLockAcquired = useCallback(({ weekMonday, user }) => {
    if (weekMonday !== weekStartRef.current) return
    if (isEditModeRef.current) return  // we are the acquirer — ignore
    setLockHolder(user)
  }, [])

  const handleLockReleased = useCallback(({ weekMonday }) => {
    if (weekMonday !== weekStartRef.current) return
    setLockHolder(null)
  }, [])

  const handleWeeklyChanged = useCallback(async () => {
    if (isEditModeRef.current) return  // suppress during edit mode to protect pending changes
    const ch  = loadedChannelRef.current
    const day = weekStartRef.current
    if (!ch || !day) return
    try {
      clearWeeklyOverrides()
      const data = await getWeeklyTable(ch, day)
      setRows(data.rows || [])
      setWeekLabel(data.week)
    } catch {
      // Silent background refresh — swallow errors
    }
  }, [clearWeeklyOverrides])

  useSSEEvent('weekly_lock_acquired', handleLockAcquired)
  useSSEEvent('weekly_lock_released', handleLockReleased)
  useSSEEvent('weekly_changed',       handleWeeklyChanged)

  // ── Derived values ───────────────────────────────────────────────────────
  const hasFilters = Boolean(wCh || selectedDay)

  const todayISO       = new Date().toISOString().slice(0, 10)
  const thisWeekMonday = getMondayISO(todayISO)
  const editableFromDate = weekStart == null
    ? null
    : weekStart > thisWeekMonday
      ? weekStart
      : weekStart === thisWeekMonday
        ? todayISO
        : null

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
              maxDate={getDatePlusDays(6)}
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
        editableFromDate={editableFromDate}
        isEditMode={isEditMode}
        lockHolder={lockHolder}
        savingBatch={savingBatch}
        onManualChange={handleManualChange}
        onStartEdit={handleStartEdit}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onExport={async () => {
          try {
            const { exportWeeklyToExcel } = await import('../utils/exportWeeklyExcel')
            await exportWeeklyToExcel(rows, state.wOverrides, {
              channel: loadedChannel,
              weekStart,
            })
          } catch (e) {
            toast(e.message || 'Errore esportazione', 'error')
          }
        }}
      />
    </div>
  )
}

