import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../context/useApp'
import { getSimulationPrograms } from '../../services/apiService'
import ChannelSelector from '../shared/ChannelSelector'
import DaySelector from '../shared/DaySelector'
import TimeSelector from './TimeSelector'
import TextInputFilter from '../shared/TextInputFilter'
import './StepProgram.css'

/** @typedef {import('../../models/simulationViewModel').ProgramItem} ProgramItem */

const PAGE_SIZE = 8

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

function mapEtaToRange(eta) {
  if (!eta || eta === 'Tutti' || eta === 'All') return 'Tutti'
  if (eta.startsWith('15') || eta === '18-24' || eta === '15-34') return '15-24'
  if (eta.startsWith('25') || eta === '18-44' || eta === '25-54' || eta === '35-54') return '25-44'
  if (eta.startsWith('45') || eta === '35-64' || eta === '45-64') return '45-64'
  if (eta.startsWith('55') || eta.startsWith('65')) return '65+'
  return 'Tutti'
}

export default function StepProgram() {
  const { state, set, toast } = useApp()
  const { ch, date, slot, _search, prog } = state

  const [programs, setPrograms] = useState(/** @type {ProgramItem[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  const { fromTime, toTime } = parseSlot(slot)
  const today = new Date().toISOString().slice(0, 10)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    setPage(1)
    try {
      const data = await getSimulationPrograms({
        ch: ch || '',
        date: date || today,
        from_time: fromTime,
        to_time: toTime,
        search: _search || '',
      })
      setPrograms(data.programs || [])
    } catch (e) {
      toast('Errore caricamento programmi: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [ch, date, slot, _search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(fetchPrograms, 200)
    return () => clearTimeout(t)
  }, [fetchPrograms])

  const totalPages = Math.max(1, Math.ceil(programs.length / PAGE_SIZE))
  const pageItems = programs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSelectProg = (p) => {
    if (prog?.id === p.id) {
      set({ prog: null, cand: null })
    } else {
      set({ prog: p, cand: null })
    }
  }

  const canNext = !!prog
  const CH_CLS = { 'Rai 1': 'prow-r1', 'Rai 2': 'prow-r2', 'Rai 3': 'prow-r3' }

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
          onChange={val => set({ date: val, prog: null, cand: null })}
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
          {ch ? `${ch} · ${fmtDate(date || today)}` : 'Tutti i canali'}
        </span>
        <span className="psel-list-cnt">
          {loading ? '…' : `${programs.length} programm${programs.length === 1 ? 'a' : 'i'}`}
        </span>
      </div>

      {loading ? (
        <div className="psel-loading">Caricamento…</div>
      ) : programs.length === 0 ? (
        <p className="psel-empty">Nessun programma trovato. Prova a modificare i filtri.</p>
      ) : (
        <div className="psel-list-body">
          {pageItems.map((p) => {
            const sel = prog?.id === p.id
            const sv = typeof p.share === 'number' ? p.share.toFixed(1) + '%' : '–'
            const cc = CH_CLS[p.ch] || ''
            const sub = []
            if (!ch) sub.push(p.ch)
            if (p.genre) sub.push(p.genre)
            if (p.dur) sub.push(p.dur + ' min')
            if (p.eta) sub.push(p.eta)
            if (p.sesso && p.sesso !== 'Tutti' && p.sesso !== 'All') sub.push(p.sesso)
            return (
              <div
                key={p.id}
                className={`prow${cc ? ' ' + cc : ''}${sel ? ' sel' : ''}`}
                tabIndex={0}
                onClick={() => handleSelectProg(p)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectProg(p) }}
              >
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

      {!loading && totalPages > 1 && (
        <div className="psel-pager">
          <button className="psel-pager-nav" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
            .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push('…'); acc.push(n); return acc }, [])
            .map((item, i) =>
              item === '…'
                ? <span key={`ell-${i}`} className="psel-pager-ell">…</span>
                : <button key={item} className={`psel-pager-num${page === item ? ' active' : ''}`} onClick={() => setPage(item)}>{item}</button>
            )}
          <button className="psel-pager-nav" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</button>
          <span className="psel-pager-info">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, programs.length)} di {programs.length}</span>
        </div>
      )}

      <div className="psel-action-bar">
        {prog ? (
          <div className="psel-sel-info psel-sel-active">
            <span className="psel-sel-tick">✓</span>
            <div className="psel-sel-prog-details">
              <span className="psel-sel-prog-name">{prog.title}</span>
              <span className="psel-sel-prog-tags">
                {[prog.ch, `Genere: ${prog.sesso || 'Tutti'}`, `Età: ${mapEtaToRange(prog.eta)}`].join(' · ')}
              </span>
            </div>
            {typeof prog.share === 'number' && (
              <span className="psel-sel-prog-share">{prog.share.toFixed(1)}%</span>
            )}
            <button className="psel-deselect-btn" title="Deseleziona" onClick={() => set({ prog: null, cand: null })}>×</button>
          </div>
        ) : (
          <div className="psel-sel-info psel-sel-empty">Nessun programma selezionato</div>
        )}
        <button className="btn-next" disabled={!canNext} onClick={() => canNext && set({ step: 1 })}>
          Tipo di Simulazione →
        </button>
      </div>
    </div>
  )
}
