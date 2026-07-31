import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '../../context/useApp'
import { getSchedulePrograms } from '../../services/apiSimulation'
import ChannelSelector from '../shared/ChannelSelector'
import DaySelector from '../shared/DaySelector'
import PaginationNav from '../shared/PaginationNav'
import { TimePicker } from './TimeSelector'
import {
  CH_CLS,
  DEFAULT_PROGRAM_PAGE_SIZE as PAGE_SIZE,
  PROGRAM_PAGE_SIZE_OPTIONS,
} from '../../utils/constants'
import { fmtDate, toMinutes } from '../../utils/dateUtils'
import './StepDestination.css'

/** @typedef {import('../../models/simulation/destinationProgramViewModel').DestinationProgramViewModel} DestinationProgramViewModel */

export default function StepDestination() {
  const { state, set, toast } = useApp()
  const { spDestCh, spDestDay, spDestTime, spScheduleIds } = state
  const today = new Date().toISOString().slice(0, 10)
  const maxDay = new Date(new Date(today).getTime() + 6 * 86400000).toISOString().slice(0, 10)

  const [schedule, setSchedule] = useState(/** @type {DestinationProgramViewModel[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const requestSeqRef = useRef(0)
  const inFlightCountRef = useRef(0)

  const fetchSchedule = useCallback(async () => {
    if (!spDestDay) {
      setPage(1)
      setSchedule([])
      set({ spScheduleIds: [], spScheduleLoading: false, spScheduleLoadedDay: '' })
      inFlightCountRef.current = 0
      setLoading(false)
      return
    }

    const requestId = ++requestSeqRef.current
    inFlightCountRef.current += 1
    setLoading(true)
    set({ spScheduleLoading: true, spScheduleLoadedDay: '' })

    try {
      const data = await getSchedulePrograms({ day: spDestDay })
      if (requestId === requestSeqRef.current) {
        setSchedule(data || [])
        setPage(1)
      }
    } catch (e) {
      if (requestId === requestSeqRef.current) {
        setSchedule([])
        setPage(1)
      }
      toast(e.message || 'Errore caricamento palinsesto', 'error')
    } finally {
      inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1)
      const hasInFlight = inFlightCountRef.current > 0
      setLoading(hasInFlight)

      if (requestId === requestSeqRef.current) {
        set({
          spScheduleLoading: hasInFlight,
          spScheduleLoadedDay: spDestDay,
        })
      } else if (!hasInFlight) {
        set({ spScheduleLoading: false })
      }
    }
  }, [spDestDay]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(fetchSchedule, 0)
    return () => clearTimeout(t)
  }, [fetchSchedule])

  const filteredSchedule = useMemo(() => (
    schedule
      .filter((p) => !spDestCh || p.channel === spDestCh)
      .filter((p) => {
        if (!spDestTime) return true
        const selected = toMinutes(spDestTime)
        const from = toMinutes(p.from_time)
        if (selected === null || from === null) return false
        return from >= (selected - 120) && from <= (selected + 120)
      })
  ), [schedule, spDestCh, spDestTime])

  const filteredScheduleIds = useMemo(() => (
    filteredSchedule
      .map((p) => p.id)
      .filter((id) => id !== null && id !== undefined && id !== '')
      .map((id) => String(id))
  ), [filteredSchedule])

  useEffect(() => {
    const isSame =
      spScheduleIds.length === filteredScheduleIds.length
      && spScheduleIds.every((id, idx) => id === filteredScheduleIds[idx])

    if (!isSame) {
      set({ spScheduleIds: filteredScheduleIds })
    }
  }, [filteredScheduleIds, set, spScheduleIds])

  const totalPages = Math.max(1, Math.ceil(filteredSchedule.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredSchedule.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="card psel-card">

      {/* Filter bar */}
      <div className="psel-filter-bar">
        {/* Date */}
        <DaySelector
          value={spDestDay || ''}
          minDate={today}
          maxDate={maxDay}
          onChange={val => set({ spDestDay: val })}
        />

        {/* Channel */}
        <ChannelSelector
          selected={spDestCh}
          onChange={c => set({ spDestCh: spDestCh === c ? null : c })}
        />

        {/* Time */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Orario</span>
          <TimePicker
            value={spDestTime || ''}
            onChange={val => set({ spDestTime: val || null })}
          />
        </div>
      </div>

      {/* Schedule preview */}
      {!spDestCh || !spDestDay || !spDestTime ? (
        <div className="dest-placeholder">
          Seleziona <strong>canale</strong>, <strong>data</strong> e <strong>orario</strong> di destinazione.
        </div>
      ) : loading ? (
        <div className="psel-loading">Caricamento…</div>
      ) : (
        <>
          <div className="psel-list-hdr psel-list-hdr-pad" style={{ marginTop: 16 }}>
            <span className="psel-list-lbl">
              Palinsesto · {spDestCh}{spDestDay ? ` · ${fmtDate(spDestDay)}` : ''}
            </span>
            <span className="psel-list-cnt">
              Share Previsto
            </span>
          </div>

          {filteredSchedule.length === 0 ? (
            <p className="psel-empty">Nessun programma trovato in questo intervallo.</p>
          ) : (
            <div className="psel-list-body psel-list-readonly">
              <div className="psel-readonly-hint">
                ℹ️ Visualizzazione informativa del palinsesto per l&apos;intervallo selezionato
              </div>
              {pageItems.map((p) => {
                const sv = typeof p.share_predicted === 'number' ? p.share_predicted.toFixed(1) + '%' : '–'
                const cc = CH_CLS[spDestCh] || ''
                const sub = [p.genre, p.target_age, p.target_sex]
                  .filter(Boolean)

                return (
                  <div key={p.id} className={`prow prow-readonly${cc ? ' ' + cc : ''}`}>
                    <span className="prow-time">
                      {p.from_time}
                      {p.to_time && <span className="prow-end"> - {p.to_time}</span>}
                    </span>
                    <div className="prow-body">
                      <span className="prow-title">{p.program_name}</span>
                      {sub.length > 0 && <span className="prow-sub">{sub.join(' · ')}</span>}
                    </div>
                    <span className="prow-share">{sv}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {filteredSchedule.length > 0 && (
            <PaginationNav
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSizeValue={pageSize}
              pageSizeOptions={PROGRAM_PAGE_SIZE_OPTIONS}
              onPageSizeChange={value => {
                setPageSize(value)
                setPage(1)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
