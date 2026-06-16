import { useState, useEffect } from 'react'
import { useApp } from '../../context/useApp'
import { getCandidates, simulate } from '../../services/apiService'

export default function CandidateList({ onBack, onDone }) {
  const { state, set, toast } = useApp()
  const { prog, cand } = state
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [simLoading, setSimLoading] = useState(false)

  useEffect(() => {
    getCandidates().then(setCandidates).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSelect = (c) => {
    set({ cand: c })
  }

  const handleSimulate = async () => {
    if (!cand) { toast('Seleziona un programma sostitutivo'); return }
    setSimLoading(true)
    try {
      const result = await simulate(prog, cand)
      set({ _simResult: result, step: 3 })
      onDone()
    } catch (e) {
      toast('Errore nella simulazione: ' + e.message)
    } finally {
      setSimLoading(false)
    }
  }

  const maxHist = Math.max(...candidates.map(c => c.hist || 0), 25)

  if (loading) return <div className="card"><p style={{ color: 'var(--muted)', textAlign: 'center', padding: 20 }}>Caricamento…</p></div>

  return (
    <div className="card">
      <div className="sect-label">Seleziona programma sostitutivo per <strong>{prog?.title}</strong></div>

      <div className="body-scroll">
        <div className="cand-list">
          {candidates.map(c => {
            const diff = prog?.share != null ? (c.hist - prog.share) : null
            const isUp = diff != null && diff > 0
            const isDn = diff != null && diff < 0
            const fillPct = Math.round((c.hist / maxHist) * 100)
            return (
              <div
                key={c.id}
                className={`cand-card${cand?.id === c.id ? ' sel' : ''}`}
                onClick={() => handleSelect(c)}
              >
                <div className="c-head">
                  <div>
                    <div className="c-title">{c.title}</div>
                    <div className="c-badges">
                      <span className="badge b-muted">{c.tipo}</span>
                      <span className="badge b-muted">{c.eta}</span>
                      <span className="badge b-muted">{c.sesso}</span>
                    </div>
                  </div>
                  <div className={`c-delta ${isUp ? 'up' : isDn ? 'dn' : ''}`}>
                    {diff != null ? (diff > 0 ? '+' : '') + diff.toFixed(1) + '%' : ''}
                  </div>
                </div>
                <div className="c-bar-wrap">
                  <div className="c-bar-lbl">
                    <span>Share storico</span>
                    <span>{c.hist}%</span>
                  </div>
                  <div className="c-bar">
                    <div className="c-bar-fill" style={{ width: fillPct + '%' }} />
                  </div>
                </div>
                {cand?.id === c.id && (
                  <button className="btn-sel done" disabled>✓ Selezionato</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="step-nav">
        <button className="btn-inline ghost" onClick={onBack}>← Indietro</button>
        <button
          className="btn-inline primary"
          onClick={handleSimulate}
          disabled={!cand || simLoading}
        >
          {simLoading ? 'Simulazione…' : '▶ Simula'}
        </button>
      </div>
    </div>
  )
}

