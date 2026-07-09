import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../context/useApp'
import { getSchedulePrograms } from '../../services/apiSimulation'
import ChannelSelector from '../shared/ChannelSelector'
import DaySelector from '../shared/DaySelector'
import { TimePicker } from './TimeSelector'
import { CH_CLS, PROGRAM_PAGE_SIZE as PAGE_SIZE } from '../../utils/constants'
import { fmtDate } from '../../utils/dateUtils'
import './StepDestination.css'

/** @typedef {import('../../models/weekly_programming/competitorProgramsViewModel').OtherProgramViewModel} OtherProgramViewModel */

function toMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  const base = h * 60 + m
  return h < 6 ? base + 1440 : base
}

export default function StepDestination() {
  const { state, set, toast } = useApp()
  const { spDestCh, spDestDay, spDestTime } = state
  const today = new Date().toISOString().slice(0, 10)
  const maxDay = new Date(new Date(today).getTime() + 6 * 86400000).toISOString().slice(0, 10)

  const [schedule, setSchedule] = useState(/** @type {OtherProgramViewModel[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  const fetchSchedule = useCallback(async () => {
    if (!spDestDay) {
      setPage(1)
      setSchedule([])
      set({ spScheduleIds: [] })
      return
    }
    setLoading(true)
    try {
      const data = await getSchedulePrograms({ day: spDestDay })
      setSchedule(data || [])
      setPage(1)
    } catch (e) {
      toast('Errore caricamento palinsesto: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [spDestDay]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(fetchSchedule, 0)
    return () => clearTimeout(t)
  }, [fetchSchedule])

  const filteredSchedule = schedule
    .filter((p) => !spDestCh || p.channel === spDestCh)
    .filter((p) => {
      if (!spDestTime) return true
      const selected = toMinutes(spDestTime)
      const from = toMinutes(p.from_time)
      if (selected === null || from === null) return false
      return from >= (selected - 120) && from <= (selected + 120)
    })

  useEffect(() => {
    set({ spScheduleIds: filteredSchedule.map(p => p.id).filter(Boolean) })
  }, [filteredSchedule, set])

  const totalPages = Math.max(1, Math.ceil(filteredSchedule.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredSchedule.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="card psel-card">

      {/* Filter bar */}
      <div className="psel-filter-bar">
        {/* Channel */}
        <ChannelSelector
          selected={spDestCh}
          onChange={c => set({ spDestCh: spDestCh === c ? null : c })}
        />

        {/* Date */}
        <DaySelector
          value={spDestDay || ''}
          minDate={today}
          maxDate={maxDay}
          onChange={val => set({ spDestDay: val })}
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
              {filteredSchedule.length} programm{filteredSchedule.length === 1 ? 'a' : 'i'}
            </span>
          </div>

          {filteredSchedule.length === 0 ? (
            <p className="psel-empty">Nessun programma trovato in questo intervallo.</p>
          ) : (
            <div className={`psel-list-body psel-list-readonly${totalPages > 1 ? ' psel-list-body--paged' : ''}`}>
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
                      {p.to_time && <span className="prow-end">–{p.to_time}</span>}
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
          {totalPages > 1 && (
            <div className="psel-pager">
              <button className="psel-pager-nav" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2)
                .reduce((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i - 1] > 1) acc.push('…')
                  acc.push(n)
                  return acc
                }, [])
                .map((item, i) =>
                  item === '…'
                    ? <span key={`ell-${i}`} className="psel-pager-ell">…</span>
                    : (
                      <button
                        key={item}
                        className={`psel-pager-num${safePage === item ? ' active' : ''}`}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    )
                )}
              <button className="psel-pager-nav" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
