import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import { getTargetPrograms } from '../../services/apiSimulation'
import ChannelSelector from '../shared/ChannelSelector'
import DaySelector from '../shared/DaySelector'
import PaginationNav from '../shared/PaginationNav'
import TimeSelector from './TimeSelector'
import TextInputFilter from '../shared/TextInputFilter'
import {
  CH_CLS,
  PROGRAM_PAGE_SIZE as PAGE_SIZE,
  PROGRAM_PAGE_SIZE_OPTIONS,
  TARGET_PROGRAMS_CACHE_TTL_MS,
} from '../../utils/constants'
import { fmtDate, toMinutes } from '../../utils/dateUtils'
import './StepProgram.css'

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
  const { ch, date, slot, _search, prog, targetProgramsCache } = state

  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const { fromTime, toTime } = parseSlot(slot)
  const today = new Date().toISOString().slice(0, 10)
  const maxDay = new Date(new Date(today).getTime() + 6 * 86400000).toISOString().slice(0, 10)
  const effectiveDate = date || today

  useEffect(() => {
    const { date: cachedDate, loadedAt } = targetProgramsCache
    const cacheValid = cachedDate === effectiveDate
      && loadedAt !== null
      && (Date.now() - loadedAt) < TARGET_PROGRAMS_CACHE_TTL_MS
    if (cacheValid) return

    let cancelled = false
    const t = setTimeout(async () => {
      if (cancelled) return
      setLoading(true)
      setPage(1)
      try {
        const data = await getTargetPrograms({ day: effectiveDate })
        if (!cancelled) {
          set({ targetProgramsCache: { date: effectiveDate, data: data || [], loadedAt: Date.now() } })
        }
      } catch (e) {
        if (!cancelled) toast(e.message || 'Errore caricamento programmi', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [effectiveDate, targetProgramsCache]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side filtering: channel, time overlap, text search
  const programs = useMemo(() => {
    let result = targetProgramsCache.data
    if (ch) result = result.filter(p => p.channel === ch)
    if (fromTime || toTime) {
      const ft = fromTime ? toMinutes(fromTime) : null
      const tt = toTime ? toMinutes(toTime) : null
      result = result.filter(p => {
        if (!p.from_time || !p.to_time) return false
        const ps = toMinutes(p.from_time)
        const pe = toMinutes(p.to_time)
        if (ft !== null && ps < ft) return false    // keep programs starting at or after "Da"
        if (tt !== null && pe > tt) return false   // keep only programs ending before "A"
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
  }, [targetProgramsCache.data, ch, fromTime, toTime, _search])

  const totalPages = Math.max(1, Math.ceil(programs.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageItems = programs.slice((safePage - 1) * pageSize, safePage * pageSize)

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
            const subMeta = []
            if (p.genre) subMeta.push(p.genre)
            if (p.target_age) subMeta.push(p.target_age)
            if (p.target_sex && p.target_sex !== 'Tutti' && p.target_sex !== 'All') subMeta.push(p.target_sex)
            if (p.duration_minutes) subMeta.push(`${p.duration_minutes} min`)
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
                  {p.to_time && <span className="prow-end"> - {p.to_time}</span>}
                </span>
                <div className="prow-body">
                  <span className="prow-title">{p.program_name || '—'}</span>
                  <span className="prow-sub">
                    <span className={`prow-ch-name${cc ? ' ' + cc : ''}`}>{p.channel}</span>
                    {subMeta.length > 0 && ` · ${subMeta.join(' · ')}`}
                  </span>
                </div>
                <span className="prow-share">{sv}</span>
              </div>
            )
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <PaginationNav
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
          rangeStart={(safePage - 1) * pageSize + 1}
          rangeEnd={Math.min(safePage * pageSize, programs.length)}
          totalItems={programs.length}
          pageSizeValue={pageSize}
          pageSizeOptions={PROGRAM_PAGE_SIZE_OPTIONS}
          onPageSizeChange={value => {
            setPageSize(value)
            setPage(1)
          }}
        />
      )}
    </div>
  )
}
