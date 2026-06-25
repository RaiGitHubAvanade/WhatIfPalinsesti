import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../context/useApp'
import { getCandidatePrograms } from '../../services/apiSimulation'
import './StepCandidates.css'
import TextInputFilter from '../shared/TextInputFilter'

/** @typedef {import('../../models/weekly_programming/competitorProgramsViewModel').OtherProgramViewModel} OtherProgramViewModel */

const PAGE_SIZE = 8

/** Normalise an OtherProgramViewModel to the shape the rest of the app expects on cand. */
function toCand(p) {
  return {
    id: `${p.canale}|${p.program_name}`,
    title: p.program_name,
    ch: p.canale,
    share: p.share_storico,
    eta: p.target_age,
    sesso: p.target_sex,
    genre: p.genre,
  }
}

export default function StepCandidates() {
  const { state, set, toast } = useApp()
  const { cand } = state

  const [search, setSearch] = useState('')
  const [ch, setCh] = useState('')
  const [targetSex, setTargetSex] = useState('')
  const [targetAge, setTargetAge] = useState('')
  const [shareMin, setShareMin] = useState('')

  const [candidates, setCandidates] = useState(/** @type {ReturnType<typeof toCand>[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  const hasFilters = !!(ch || search || targetSex || targetAge || shareMin)

  const fetchCandidates = useCallback(async () => {
    if (!hasFilters) { setCandidates([]); return }
    setLoading(true)
    try {
      const data = await getCandidatePrograms({
        program_name: search,
        channel: ch,
        target_sex: targetSex,
        target_age: targetAge,
        min_share: shareMin,
      })
      setCandidates((data || []).map(toCand))
    } catch (e) {
      toast('Errore caricamento candidati: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [ch, search, targetSex, targetAge, shareMin]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchCandidates()
    }, 200)
    return () => clearTimeout(t)
  }, [fetchCandidates])

  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE))
  const pageItems = candidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const CH_CLS = { 'Rai 1': 'prow-r1', 'Rai 2': 'prow-r2', 'Rai 3': 'prow-r3' }

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
        <div className="psel-fg">
          <span className="psel-fg-lbl">Canale</span>
          <select
            className="psel-select"
            value={ch}
            onChange={(e) => { setCh(e.target.value); set({ cand: null }); setPage(1) }}
          >
            <option value="">—</option>
            {['Rai 1', 'Rai 2', 'Rai 3'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Target sesso */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Genere target</span>
          <select
            className="psel-select"
            value={targetSex}
            onChange={(e) => { setTargetSex(e.target.value); set({ cand: null }); setPage(1) }}
          >
            <option value="">—</option>
            {['Uomo', 'Donna', 'Tutti'].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Target età */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Età target</span>
          <select
            className="psel-select"
            value={targetAge}
            onChange={(e) => { setTargetAge(e.target.value); set({ cand: null }); setPage(1) }}
          >
            <option value="">—</option>
            {['15+', '25+', '35+', '45+', '55+', '65+', '70+'].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Share minima */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Share minima</span>
          <select
            className="psel-select"
            value={shareMin}
            onChange={(e) => { setShareMin(e.target.value); set({ cand: null }); setPage(1) }}
          >
            <option value="">—</option>
            {['10', '20', '30', '40', '50', '60', '70', '80'].map((s) => (
              <option key={s} value={s}>{s}%</option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidate list */}
      {!hasFilters ? (
        <div className="psel-empty-state">
          <div className="psel-empty-title">Seleziona i filtri per cercare programmi sostitutivi</div>
          <div className="psel-empty-desc">
            Utilizza i filtri sopra per trovare programmi compatibili con il programma da sostituire.
          </div>
        </div>
      ) : loading ? (
        <div className="psel-loading">Caricamento...</div>
      ) : (
        <>
          <div className="psel-list-hdr psel-list-hdr-pad">
            <span className="psel-list-lbl">Programmi trovati</span>
            <span className="psel-list-cnt">
              {candidates.length} programm{candidates.length === 1 ? 'a' : 'i'}
            </span>
          </div>

          {candidates.length === 0 ? (
            <p className="psel-empty">
              Nessun programma trovato con questi filtri. Prova a rimuovere alcuni criteri.
            </p>
          ) : (
            <div className="psel-list-body" id="cand-list-items">
              {pageItems.map((p) => {
                const sel = cand?.id === p.id
                const sv = typeof p.share === 'number' ? p.share.toFixed(1) + '%' : '—“'
                const cc = CH_CLS[p.ch] || ''
                const tags = [
                  p.ch || 'N/A',
                  p.sesso ? `Genere: ${p.sesso}` : null,
                  p.eta   ? `Età: ${p.eta}` : null,
                ].filter(Boolean)

                return (
                  <div
                    key={p.id}
                    className={`prow${cc ? ' ' + cc : ''}${sel ? ' sel' : ''}`}
                    tabIndex={0}
                    onClick={() => set({ cand: sel ? null : p })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') set({ cand: sel ? null : p }) }}
                  >
                    <div className="prow-body">
                      <span className="prow-title">{p.title}</span>
                      <span className="prow-sub">{tags.join(' · ')}</span>
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
              <button className="psel-pager-nav" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                .reduce((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i - 1] > 1) acc.push('...')
                  acc.push(n)
                  return acc
                }, [])
                .map((item, i) =>
                  item === '...'
                    ? <span key={`ell-${i}`} className="psel-pager-ell">...</span>
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
              <button className="psel-pager-nav" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>←’</button>
              <span className="psel-pager-info">
                {(page - 1) * PAGE_SIZE + 1}—“{Math.min(page * PAGE_SIZE, candidates.length)} di {candidates.length}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
