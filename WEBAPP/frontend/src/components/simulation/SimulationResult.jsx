import { useState, useEffect } from 'react'
import { useApp } from '../../context/useApp'
import { getCompetitors } from '../../services/apiService'

export default function SimulationResult({ onReset, onSave }) {
  const { state } = useApp()
  const { prog, cand, _simResult, mode } = state
  const [competitors, setCompetitors] = useState([])

  useEffect(() => {
    getCompetitors(prog?.slot).then(setCompetitors).catch(console.error)
  }, [prog?.slot])

  if (!_simResult) return null

  const origShare = prog?.share ?? 0
  const predShare = _simResult.pred ?? 0
  const delta = predShare - origShare
  const isPos = delta > 0.3
  const isNeg = delta < -0.3
  const verdictClass = isPos ? 'pos' : isNeg ? 'neg' : 'neu'
  const verdictIcon = isPos ? '📈' : isNeg ? '📉' : '➡️'
  const verdictText = isPos
    ? `Incremento previsto di ${delta.toFixed(1)} punti share`
    : isNeg
      ? `Calo previsto di ${Math.abs(delta).toFixed(1)} punti share`
      : 'Impatto marginale sullo share'

  const maxBar = Math.max(origShare, predShare, 1)
  const origPct = Math.round((origShare / maxBar) * 100)
  const predPct = Math.round((predShare / maxBar) * 100)

  const isSpostamento = mode === 'spostamento'
  const candName = isSpostamento
    ? `${prog?.title} → ${cand?.destCh || ''} (${cand?.destDate || ''}, ${cand?.destSlot || ''})`
    : (cand?.title || '—')

  return (
    <div>
      {/* Verdict banner */}
      <div className={`sim-verdict ${verdictClass}`}>
        <div className="sim-verdict-icon">{verdictIcon}</div>
        <div className="sim-verdict-delta">{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</div>
        <div className="sim-verdict-text">{verdictText}</div>
      </div>

      {/* Comparison cards */}
      <div className="sim-cmp-wrap">
        <div className={`sim-cmp-card ${isNeg ? 'low' : ''}`}>
          <div className="sim-cmp-label">Attuale</div>
          <div className="sim-cmp-title">{prog?.title}</div>
          <div className="sim-cmp-meta">{prog?.genre} · {prog?.tipo}</div>
          <div className={`sim-cmp-share ${isNeg ? 'danger' : ''}`}>{origShare}%</div>
        </div>
        <div className="sim-cmp-arrow-col">→</div>
        <div className={`sim-cmp-card ${isPos ? 'high' : ''}`}>
          <div className="sim-cmp-label">{isSpostamento ? 'Spostato' : 'Sostituzione'}</div>
          <div className="sim-cmp-title" title={candName}>{candName}</div>
          <div className="sim-cmp-meta">{cand?.tipo || ''}</div>
          <div className={`sim-cmp-share ${isPos ? 'success' : ''}`}>{predShare}%</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="chart-box">
        <div className="chart-title">Confronto Share</div>
        <div className="legend">
          <div className="leg-item"><div className="leg-dot" style={{ background: '#C62828' }} /><span>Attuale</span></div>
          <div className="leg-item"><div className="leg-dot" style={{ background: '#1E8E3E' }} /><span>Previsto</span></div>
        </div>
        <div className="bar-row">
          <span className="bar-lbl">Attuale</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: origPct + '%', background: '#C62828' }} />
          </div>
          <span className="bar-val">{origShare}%</span>
        </div>
        <div className="bar-row">
          <span className="bar-lbl">Previsto</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: predPct + '%', background: '#1E8E3E' }} />
          </div>
          <span className="bar-val">{predShare}%</span>
        </div>
      </div>

      {/* Competitors */}
      {competitors.length > 0 && (
        <div className="card">
          <div className="sect-label">Concorrenza nella stessa fascia</div>
          <div className="comp-cards-grid">
            {competitors.map((c, i) => (
              <div key={i} className="comp-card-item">
                <div className="comp-card-title">{c.title}</div>
                <div className="comp-card-labels">
                  <span className="comp-label-pill comp-label-ch">{c.ch}</span>
                  {c.tipo && <span className="comp-label-pill comp-label-tipo">{c.tipo}</span>}
                  {c.share != null && <span className="comp-share-pill">{c.share}%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="step-nav" style={{ flexWrap: 'wrap', gap: 10 }}>
        <button className="btn-inline ghost" onClick={onReset}>← Nuova Simulazione</button>
        <button className="btn-inline primary" onClick={onSave}>
          💾 Salva nello Scenario
        </button>
      </div>
    </div>
  )
}

