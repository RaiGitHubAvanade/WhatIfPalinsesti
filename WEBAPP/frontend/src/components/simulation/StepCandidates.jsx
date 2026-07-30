import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/useApp'
import { getCandidatePrograms } from '../../services/apiSimulation'
import {
  CH_CLS,
  PROGRAM_PAGE_SIZE as PAGE_SIZE,
  PROGRAM_PAGE_SIZE_OPTIONS,
} from '../../utils/constants'
import CustomSelect from '../shared/CustomSelect'
import ChannelSelector from '../shared/ChannelSelector'
import PaginationNav from '../shared/PaginationNav'
import TextInputFilter from '../shared/TextInputFilter'
import { durationMinutes } from '../../utils/dateUtils'
import './StepCandidates.css'

/** @typedef {import('../../models/simulation/candidateProgramViewModel').CandidateProgramViewModel} CandidateProgramViewModel */

export default function StepCandidates() {
  const { state, set, toast } = useApp()
  const { cand, prog } = state

  const [search, setSearch] = useState('')
  const [ch, setCh] = useState('')
  const [targetSex, setTargetSex] = useState('')
  const [targetAge, setTargetAge] = useState('')
  const [genre, setGenre] = useState('')
  const [shareMin, setShareMin] = useState('')

  const [rawData, setRawData] = useState(/** @type {CandidateProgramViewModel[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const sharePredicted = prog?.share_predicted ?? null
  const duration = (prog?.from_time && prog?.to_time)
    ? durationMinutes(prog.from_time, prog.to_time)
    : null

  // Derive distinct filter options from loaded data — always consistent with available candidates
  const availableTargetAges = useMemo(
    () => [...new Set(rawData.map(p => p.target_age).filter(Boolean))].sort(),
    [rawData]
  )
  const availableGenres = useMemo(
    () => [...new Set(rawData.map(p => p.genre).filter(Boolean))].sort(),
    [rawData]
  )

  // Re-fetch candidates when the target program changes
  useEffect(() => {
    let cancelled = false
    getCandidatePrograms({ share_predicted: sharePredicted, duration })
      .then(data => { if (!cancelled) setRawData(data || []) })
      .catch(e => { if (!cancelled) toast(e.message || 'Errore caricamento candidati', 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sharePredicted, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side filtering
  const candidates_filtered = useMemo(() => {
    let result = rawData
    if (ch) result = result.filter(p => p.channel === ch)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => (p.program_name || '').toLowerCase().includes(q))
    }
    if (targetSex) result = result.filter(p => p.target_sex === targetSex)
    if (targetAge) result = result.filter(p => p.target_age === targetAge)
    if (genre) result = result.filter(p => p.genre === genre)
    if (shareMin) result = result.filter(p => typeof p.share_storico === 'number' && p.share_storico > parseFloat(shareMin))
    return result
  }, [rawData, ch, search, targetSex, targetAge, genre, shareMin])

  const displayed = candidates_filtered

  const totalPages = Math.max(1, Math.ceil(displayed.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageItems = displayed.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="card psel-card">
      {/* Filter bar */}
      <div className="psel-filter-bar">
        <TextInputFilter
          label="Cerca"
          value={search}
          placeholder="Titolo..."
          onChange={v => { setSearch(v); setPage(1) }}
          className="psel-fg-search"
        />

        {/* Channel */}
        <ChannelSelector
          selected={ch}
          onChange={c => { setCh(ch === c ? '' : c); set({ cand: null }); setPage(1) }}
        />

        {/* Target sesso */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Sesso</span>
          <CustomSelect
            value={targetSex}
            onChange={v => { setTargetSex(v); set({ cand: null }); setPage(1) }}
            options={[
              { value: '', label: 'Tutti' },
              { value: 'Uomo', label: 'Uomo' },
              { value: 'Donna', label: 'Donna' },
            ]}
          />
        </div>

        {/* Target età */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Età</span>
          <CustomSelect
            value={targetAge}
            onChange={v => { setTargetAge(v); set({ cand: null }); setPage(1) }}
            options={[
              { value: '', label: 'Tutte' },
              ...availableTargetAges.map(a => ({ value: a, label: a })),
            ]}
          />
        </div>

        {/* Share minima */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Share minimo</span>
          <CustomSelect
            value={shareMin}
            onChange={v => { setShareMin(v); set({ cand: null }); setPage(1) }}
            options={[
              { value: '', label: 'Nessuno' },
              ...['10', '20', '30', '40', '50', '60', '70', '80'].map(s => ({ value: s, label: s + '%' })),
            ]}
          />
        </div>

        {/* Genere */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Genere</span>
          <CustomSelect
            value={genre}
            onChange={v => { setGenre(v); set({ cand: null }); setPage(1) }}
            options={[
              { value: '', label: 'Tutti' },
              ...availableGenres.map(g => ({ value: g, label: g })),
            ]}
          />
        </div>
      </div>

      {/* Candidate list */}
      {loading ? (
        <div className="psel-loading">Caricamento...</div>
      ) : (
        <>
          <div className="psel-list-hdr psel-list-hdr-pad">
            <span className="psel-list-lbl">Programmi trovati</span>
            <span className="psel-list-cnt">
              Share Storico
            </span>
          </div>

          {displayed.length === 0 ? (
            <p className="psel-empty">
              Nessun programma trovato con questi filtri. Prova a rimuovere alcuni criteri.
            </p>
          ) : (
            <div className="psel-list-body" id="cand-list-items">
              {pageItems.map((p) => {
                const sel = cand?.channel === p.channel && cand?.program_name === p.program_name
                const sv = typeof p.share_storico === 'number' ? p.share_storico.toFixed(1) + '%' : '-'
                const cc = CH_CLS[p.channel] || ''
                const subMeta = [
                  p.genre ? `Genere: ${p.genre}` : null,
                  p.target_sex ? `Sesso: ${p.target_sex}` : null,
                  p.target_age ? `Età: ${p.target_age}` : null,
                  p.duration_minutes ? `Durata: ${p.duration_minutes} min` : null,
                ].filter(Boolean)

                return (
                  <div
                    key={`${p.channel}|${p.program_name}`}
                    className={`prow${cc ? ' ' + cc : ''}${sel ? ' sel' : ''}`}
                    tabIndex={0}
                    onClick={() => set({ cand: sel ? null : p })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') set({ cand: sel ? null : p }) }}
                  >
                    <div className="prow-body">
                      <span className="prow-title">{p.program_name}</span>
                      <span className="prow-sub">
                        <span className={`prow-ch-name${cc ? ' ' + cc : ''}`}>{p.channel || 'N/A'}</span>
                        {subMeta.length > 0 && ` · ${subMeta.join(' · ')}`}
                      </span>
                    </div>
                    <span className="prow-share">{sv}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <PaginationNav
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
              rangeStart={(safePage - 1) * pageSize + 1}
              rangeEnd={Math.min(safePage * pageSize, displayed.length)}
              totalItems={displayed.length}
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
