import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import { getPalinsestoFuturoRai } from '../../services/apiSimulation'
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

export default function StepProgram() {
  const { state, set, toast } = useApp()
  const { ch, date, slot, _search, prog } = state

  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  const { fromTime, toTime } = parseSlot(slot)
  const today = new Date().toISOString().slice(0, 10)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const data = await getPalinsestoFuturoRai({
        channel: ch || '',
        day: date || today,
        from_time: fromTime,
        to_time: toTime,
      })
      setRawData(data || [])
    } catch (e) {
      toast('Errore caricamento programmi: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [ch, date, slot]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(fetchPrograms, 200)
    return () => clearTimeout(t)
  }, [fetchPrograms])

  // Apply client-side text search directly on raw OtherProgramViewModel fields
  const programs = useMemo(() => {
    if (!_search) return rawData
    const q = _search.toLowerCase()
    return rawData.filter(p => (p.program_name || '').toLowerCase().includes(q))
  }, [rawData, _search])

  const totalPages = Math.max(1, Math.ceil(programs.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = programs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleSelectProg = (p) => {
    if (prog?.canale === p.canale && prog?.from_time === p.from_time) {
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
          onChange={c => set({ ch: ch === c ? null : c, prog: null, cand: null })}
        />
        <DaySelector
          value={date || today}
          onChange={val => { if (val) set({ date: val, prog: null, cand: null }) }}
        />
        <TimeSelector
          fromTime={fromTime}
          toTime={toTime}
          onFromChange={val => set({ slot: buildSlot(val, toTime), prog: null, cand: null })}
          onToChange={val => set({ slot: buildSlot(fromTime, val), prog: null, cand: null })}
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
            const sel = prog?.canale === p.canale && prog?.from_time === p.from_time
            const hasShare = typeof p.share_storico === 'number'
            const sv = hasShare ? p.share_storico.toFixed(1) + '%' : '–'
            const cc = CH_CLS[p.canale] || ''
            const sub = []
            if (!ch) sub.push(p.canale)
            if (p.genre) sub.push(p.genre)
            if (p.target_age) sub.push(p.target_age)
            if (p.target_sex && p.target_sex !== 'Tutti' && p.target_sex !== 'All') sub.push(p.target_sex)
            return (
              <div
                key={`${p.canale}_${p.from_time}`}
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
