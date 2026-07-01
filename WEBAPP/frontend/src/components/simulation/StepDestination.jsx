import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../context/useApp'
import { getSimulationSchedule } from '../../services/apiSimulation'
import ChannelSelector from '../shared/ChannelSelector'
import DaySelector from '../shared/DaySelector'
import { TimePicker } from './TimeSelector'
import './StepDestination.css'

/** @typedef {import('../../models/simulation/channelScheduleViewModel').ScheduleItem} ScheduleItem */

const PAGE_SIZE = 8

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  const days = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function StepDestination() {
  const { state, set, toast } = useApp()
  const { spDestCh, spDestDay, spDestTime } = state

  const [schedule, setSchedule] = useState(/** @type {ScheduleItem[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  const fetchSchedule = useCallback(async () => {
    if (!spDestCh || !spDestTime) { setPage(1); setSchedule([]); return }
    setLoading(true)
    try {
      const data = await getSimulationSchedule(spDestCh, spDestTime)
      setSchedule(data.programs || [])
      setPage(1)
    } catch (e) {
      toast('Errore caricamento palinsesto: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [spDestCh, spDestTime]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(fetchSchedule, 0)
    return () => clearTimeout(t)
  }, [fetchSchedule])

  const totalPages = Math.max(1, Math.ceil(schedule.length / PAGE_SIZE))
  const pageItems = schedule.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const CH_CLS = { 'Rai 1': 'prow-r1', 'Rai 2': 'prow-r2', 'Rai 3': 'prow-r3' }

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
      {!spDestCh || !spDestTime ? (
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
              {schedule.length} programm{schedule.length === 1 ? 'a' : 'i'}
            </span>
          </div>

          {schedule.length === 0 ? (
            <p className="psel-empty">Nessun programma trovato in questo intervallo.</p>
          ) : (
            <div className="psel-list-body psel-list-readonly">
              <div className="psel-readonly-hint">
                ℹ️ Visualizzazione informativa del palinsesto per l&apos;intervallo selezionato
              </div>
              {pageItems.map((p) => {
                const sv = typeof p.share === 'number' ? p.share.toFixed(1) + '%' : '–'
                const cc = CH_CLS[spDestCh] || ''
                const sub = [p.tipo, p.genre !== p.tipo ? p.genre : null, p.dur ? `${p.dur} min` : null]
                  .filter(Boolean)

                return (
                  <div key={p.id} className={`prow prow-readonly${cc ? ' ' + cc : ''}`}>
                    <span className="prow-time">
                      {p.time}
                      {p.end && <span className="prow-end">–{p.end}</span>}
                    </span>
                    <div className="prow-body">
                      <span className="prow-title">{p.title}</span>
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
              <button className="psel-pager-nav" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
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
                        className={`psel-pager-num${page === item ? ' active' : ''}`}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    )
                )}
              <button className="psel-pager-nav" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
