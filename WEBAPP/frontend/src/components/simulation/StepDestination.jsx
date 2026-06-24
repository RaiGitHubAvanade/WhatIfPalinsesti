import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../context/useApp'
import { getSimulationSchedule } from '../../services/apiService'
import ChannelSelector from '../shared/ChannelSelector'
import DaySelector from '../shared/DaySelector'
import './StepDestination.css'

/** @typedef {import('../../models/simulationViewModel').ScheduleItem} ScheduleItem */

const PAGE_SIZE = 8
const DEST_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30',
  '23:00', '23:30', '00:00', '01:00', '02:00',
]

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

      <div className="sect-label" style={{ marginTop: 20 }}>Configura contesto di destinazione</div>

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
          <select
            className="psel-select dest-time-select"
            value={spDestTime || ''}
            onChange={(e) => set({ spDestTime: e.target.value || null })}
          >
            <option value="">Seleziona orario…</option>
            {DEST_HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule preview */}
      {!spDestCh || !spDestTime ? (
        <div className="dest-placeholder">
          Seleziona <strong>canale</strong>, <strong>data</strong> e <strong>orario</strong>{' '}
          per visualizzare il palinsesto di destinazione.
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
