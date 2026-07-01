import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import { getTargetPrograms } from '../../services/apiSimulation'
import ChannelSelector from '../shared/ChannelSelector'
import DaySelector from '../shared/DaySelector'
import TimeSelector from './TimeSelector'
import TextInputFilter from '../shared/TextInputFilter'
import './StepProgram.css'

const PAGE_SIZE = 8
const CH_CLS = { 'Rai 1': 'prow-r1', 'Rai 2': 'prow-r2', 'Rai 3': 'prow-r3' }

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  const days = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function parseSlot(slot) {
  if (!slot) return { fromTime: '', toTime: '' }
  if (/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(slot)) {
    const [f, t] = slot.split('-')
    return { fromTime: f, toTime: t }
  }
  if (/^\d{2}:\d{2}-$/.test(slot)) return { fromTime: slot.slice(0, 5), toTime: '' }
  if (/^-\d{2}:\d{2}$/.test(slot)) return { fromTime: '', toTime: slot.slice(1) }
  return { fromTime: '', toTime: '' }
}

function buildSlot(from, to) {
  if (from && to) return `${from}-${to}`
  if (from) return `${from}-`
  if (to) return `-${to}`
  return null
}

/** Convert HH:MM to minutes, adding 1440 for post-midnight hours (< 06:00). */
function toMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  const base = h * 60 + m
  return h < 6 ? base + 1440 : base
}

export default function StepProgram() {
  const { state, set, toast } = useApp()
  const { ch, date, slot, _search, prog } = state

  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  const { fromTime, toTime } = parseSlot(slot)
  const today = new Date().toISOString().slice(0, 10)
  const maxDay = new Date(new Date(today).getTime() + 6 * 86400000).toISOString().slice(0, 10)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const data = await getTargetPrograms({ day: date || today })
      setRawData(data || [])
    } catch (e) {
      toast('Errore caricamento programmi: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(fetchPrograms, 200)
    return () => clearTimeout(t)
  }, [fetchPrograms])

  // Client-side filtering: channel, time overlap, text search
  const programs = useMemo(() => {
    let result = rawData
    if (ch) result = result.filter(p => p.channel === ch)
    if (fromTime || toTime) {
      const ft = fromTime ? toMinutes(fromTime) : null
      const tt = toTime ? toMinutes(toTime) : null
      result = result.filter(p => {
        if (!p.from_time || !p.to_time) return false
        const ps = toMinutes(p.from_time)
        const pe = toMinutes(p.to_time)
        if (ft !== null && ps <= ft) return false   // keep only programs starting after "Da"
        if (tt !== null && pe >= tt) return false   // keep only programs ending before "A"
        return true
      })
    }
    if (_search) {
      const q = _search.toLowerCase()
      result = result.filter(p => (p.program_name || '').toLowerCase().includes(q))
    }
    // Sort by broadcast-day order: 06:00 → 23:30 → 00:00 → 02:00
    result = [...result].sort((a, b) => {
      const ta = a.from_time ? toMinutes(a.from_time) : Infinity
      const tb = b.from_time ? toMinutes(b.from_time) : Infinity
      return ta - tb
    })
    return result
  }, [rawData, ch, fromTime, toTime, _search])

  const totalPages = Math.max(1, Math.ceil(programs.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = programs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleSelectProg = (p) => {
    if (prog?.channel === p.channel && prog?.from_time === p.from_time) {
      set({ prog: null, cand: null })
    } else {
      set({ prog: p, cand: null })
    }
  }

  return (
    <div className="card psel-card">
      <div className="psel-filter-bar">
        <TextInputFilter
          label="Cerca"
          value={_search || ''}
          placeholder="Titolo…"
          onChange={v => set({ _search: v })}
          className="psel-fg-search"
        />
        <ChannelSelector
          selected={ch}
          onChange={c => { set({ ch: ch === c ? null : c, prog: null, cand: null }); setPage(1) }}
        />
        <DaySelector
          value={date || today}
          minDate={today}
          maxDate={maxDay}
          onChange={val => { if (val) set({ date: val, prog: null, cand: null }) }}
        />
        <TimeSelector
          fromTime={fromTime}
          toTime={toTime}
          onFromChange={val => { set({ slot: buildSlot(val, toTime), prog: null, cand: null }); setPage(1) }}
          onToChange={val => { set({ slot: buildSlot(fromTime, val), prog: null, cand: null }); setPage(1) }}
          hasClear={!!slot}
          onClear={() => set({ slot: null, prog: null, cand: null })}
        />
      </div>

      <div className="psel-list-hdr psel-list-hdr-pad">
        <span className="psel-list-lbl">
          {`${ch || 'Tutti i canali'} · ${fmtDate(date || today)}`}
        </span>
        <span className="psel-list-cnt">
          Share Previsto
        </span>
      </div>

      {loading ? (
        <div className="psel-loading">Caricamento…</div>
      ) : programs.length === 0 ? (
        <p className="psel-empty">Nessun programma trovato. Prova a modificare i filtri.</p>
      ) : (
        <div className="psel-list-body">
          {pageItems.map((p) => {
            const sel = prog?.channel === p.channel && prog?.from_time === p.from_time
            const hasShare = typeof p.share_predicted === 'number'
            const sv = hasShare ? p.share_predicted.toFixed(1) + '%' : '–'
            const cc = CH_CLS[p.channel] || ''
            const sub = []
            if (p.genre) sub.push(p.channel)
            if (p.genre) sub.push(p.genre)
            if (p.target_age) sub.push(p.target_age)
            if (p.target_sex && p.target_sex !== 'Tutti' && p.target_sex !== 'All') sub.push(p.target_sex)
            return (
              <div
                key={`${p.channel || ''}_${p.from_time || ''}_${p.program_name || ''}`}
                className={`prow${cc ? ' ' + cc : ''}${sel ? ' sel' : ''}${!hasShare ? ' prow-disabled' : ''}`}
                tabIndex={hasShare ? 0 : -1}
                onClick={() => hasShare && handleSelectProg(p)}
                onKeyDown={(e) => { if (hasShare && (e.key === 'Enter' || e.key === ' ')) handleSelectProg(p) }}
              >
                <span className="prow-time">
                  {p.from_time}
                  {p.to_time && <span className="prow-end">–{p.to_time}</span>}
                </span>
                <div className="prow-body">
                  <span className="prow-title">{p.program_name || '—'}</span>
                  {sub.length > 0 && <span className="prow-sub">{sub.join(' · ')}</span>}
                </div>
                <span className="prow-share">{sv}</span>
              </div>
            )
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="psel-pager">
          <button className="psel-pager-nav" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>←</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 2)
            .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push('…'); acc.push(n); return acc }, [])
            .map((item, i) =>
              item === '…'
                ? <span key={`ell-${i}`} className="psel-pager-ell">…</span>
                : <button key={item} className={`psel-pager-num${safePage === item ? ' active' : ''}`} onClick={() => setPage(item)}>{item}</button>
            )}
          <button className="psel-pager-nav" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>→</button>
          <span className="psel-pager-info">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, programs.length)} di {programs.length}</span>
        </div>
      )}
    </div>
  )
}
