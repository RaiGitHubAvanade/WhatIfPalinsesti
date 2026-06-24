import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { getSimulationCandidates, runSimulation } from '../../services/apiService'
import './StepCandidates.css'
import TextInputFilter from '../shared/TextInputFilter'

/** @typedef {import('../../models/simulationViewModel').ProgramItem} ProgramItem */

const PAGE_SIZE = 8

function mapEtaToRange(eta) {
  if (!eta || eta === 'Tutti' || eta === 'All') return 'Tutti'
  if (eta.startsWith('15') || eta === '18-24' || eta === '15-34') return '15-24'
  if (eta.startsWith('25') || eta === '18-44' || eta === '25-54' || eta === '35-54') return '25-44'
  if (eta.startsWith('45') || eta === '35-64' || eta === '45-64') return '45-64'
  if (eta.startsWith('55') || eta.startsWith('65')) return '65+'
  return 'Tutti'
}

export default function StepCandidates() {
  const navigate = useNavigate()
  const { state, set, toast, addToScenarioWithResult, resetSim } = useApp()
  const { prog, cand } = state

  const [search, setSearch] = useState('')
  const [ch, setCh] = useState('')
  const [genere, setGenere] = useState('')
  const [eta, setEta] = useState('')
  const [shareMin, setShareMin] = useState('')

  const [candidates, setCandidates] = useState(/** @type {ProgramItem[]} */ ([]))
  const [loading, setLoading] = useState(false)
  const [simLoading, setSimLoading] = useState(false)
  const [page, setPage] = useState(1)

  const hasFilters = !!(ch || search || genere || eta || shareMin)

  const fetchCandidates = useCallback(async () => {
    if (!hasFilters) { setCandidates([]); return }
    setLoading(true)
    try {
      const data = await getSimulationCandidates({
        exclude_id: prog?.id || '',
        ch,
        search,
        genere,
        eta,
        share_min: shareMin,
        target_dur: prog?.dur || '',
      })
      setCandidates(data.programs || [])
    } catch (e) {
      toast('Errore caricamento candidati: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [ch, search, genere, eta, shareMin, prog?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchCandidates()
    }, 200)
    return () => clearTimeout(t)
  }, [fetchCandidates])

  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE))
  const pageItems = candidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleNext = async () => {
    if (!prog || !cand) return
    setSimLoading(true)
    try {
      const result = await runSimulation({
        mode: 'sostituzione',
        orig_id: prog.id,
        cand_id: cand.id,
      })
      addToScenarioWithResult(result)
      resetSim()
      navigate('/scenari')
    } catch (e) {
      toast('Errore simulazione: ' + e.message)
    } finally {
      setSimLoading(false)
    }
  }

  const metaPills = []
  if (prog?.ch) metaPills.push(prog.ch)
  metaPills.push(`Genere: ${prog?.sesso || 'Tutti'}`)
  metaPills.push(`Età: ${mapEtaToRange(prog?.eta)}`)

  const CH_CLS = { 'Rai 1': 'prow-r1', 'Rai 2': 'prow-r2', 'Rai 3': 'prow-r3' }

  return (
    <div className="card psel-card">
      {/* Recap bar */}
      <div className="psel-recap-bar">
        <span className="psel-recap-lbl">Programma da sostituire</span>
        <div className="psel-recap-info">
          <span className="psel-recap-tick">📌</span>
          <span className="psel-recap-name">{prog?.title || '—'}</span>
        </div>
        <div className="psel-recap-meta">{metaPills.join(' · ')}</div>
      </div>

      {/* Filter bar */}
      <div className="psel-filter-bar">
        <TextInputFilter
          label="Cerca"
          value={search}
          placeholder="Titolo…"
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

        {/* Genere */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Genere</span>
          <select
            className="psel-select"
            value={genere}
            onChange={(e) => { setGenere(e.target.value); set({ cand: null }); setPage(1) }}
          >
            <option value="">—</option>
            {['Uomo', 'Donna', 'Tutti'].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Fascia d'età */}
        <div className="psel-fg">
          <span className="psel-fg-lbl">Fascia d&apos;età</span>
          <select
            className="psel-select"
            value={eta}
            onChange={(e) => { setEta(e.target.value); set({ cand: null }); setPage(1) }}
          >
            <option value="">—</option>
            {['Tutti', '15-24', '25-44', '45-64', '65+'].map((e) => (
              <option key={e} value={e}>{e}</option>
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
          <div className="psel-empty-icon">🔍</div>
          <div className="psel-empty-title">Seleziona i filtri per cercare programmi sostitutivi</div>
          <div className="psel-empty-desc">
            Utilizza i filtri sopra per trovare programmi compatibili con il programma da sostituire.
          </div>
        </div>
      ) : loading ? (
        <div className="psel-loading">Caricamento…</div>
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
                const sv = typeof p.share === 'number' ? p.share.toFixed(1) + '%' : '–'
                const cc = CH_CLS[p.ch] || ''
                const tags = [
                  p.ch || 'N/A',
                  `Genere: ${p.sesso || 'Tutti'}`,
                  `Età: ${mapEtaToRange(p.eta)}`,
                ]

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
              <span className="psel-pager-info">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, candidates.length)} di {candidates.length}
              </span>
            </div>
          )}
        </>
      )}

      {/* Action bar */}
      <div className="psel-action-bar psel-simple-bar">
        <button className="btn-back" onClick={() => set({ step: 1, cand: null })}>
          ← Tipo di Simulazione
        </button>
        <button
          className="btn-next"
          disabled={!cand || simLoading}
          onClick={handleNext}
        >
          {simLoading ? 'Avvio…' : 'Avvia Simulazione'}
        </button>
      </div>
    </div>
  )
}
