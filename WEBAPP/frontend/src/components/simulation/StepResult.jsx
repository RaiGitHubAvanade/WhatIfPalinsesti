import { useState } from 'react'
import { useApp } from '../../context/useApp'
import { getSimulationCompetitors } from '../../services/apiService'
import './StepResult.css'

/**
 * @typedef {import('../../models/simulationViewModel').SimResultSost} SimResultSost
 * @typedef {import('../../models/simulationViewModel').SimResultSposta} SimResultSposta
 * @typedef {import('../../models/simulationViewModel').CompetitorItem} CompetitorItem
 */

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  const days = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function VerdictPill({ delta }) {
  const isPos = delta !== null && delta > 0
  const isNeg = delta !== null && delta < 0
  const cls = isPos ? 'pos' : isNeg ? 'neg' : 'neu'
  const icon = isPos ? '✅' : isNeg ? '⚠️' : '➡️'
  const arrow = isPos ? '↑ ' : isNeg ? '↓ ' : ''
  const deltaStr = delta !== null
    ? `${delta >= 0 ? '+' : ''}${Math.abs(delta).toFixed(1)} pp`
    : '—'
  const text = delta === null
    ? 'Dati insufficienti per la previsione'
    : isPos
      ? 'Ottimo! Questa operazione potrebbe migliorare gli ascolti'
      : isNeg
        ? 'Attenzione: questa operazione potrebbe ridurre gli ascolti'
        : 'Nessun impatto significativo previsto sugli ascolti'

  return (
    <div className={`res-verdict-pill ${cls}`}>
      <span className="res-verdict-icon">{icon}</span>
      <span className="res-verdict-delta">{arrow}{deltaStr}</span>
      <span className="res-verdict-text">{text}</span>
    </div>
  )
}

function CompetitorSection({ slot }) {
  const [competitors, setCompetitors] = useState(/** @type {CompetitorItem[]} */ ([]))
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useApp()

  const handleToggle = async () => {
    if (!loaded) {
      setLoading(true)
      try {
        const data = await getSimulationCompetitors(slot)
        setCompetitors(data.competitors || [])
        setLoaded(true)
      } catch (e) {
        toast('Errore caricamento competitor: ' + e.message)
      } finally {
        setLoading(false)
      }
    } else {
      setLoaded(false)
    }
  }

  return (
    <div className="res-comp-cta">
      {!loaded ? (
        <button className="btn-sec btn-comp-toggle" onClick={handleToggle} disabled={loading}>
          {loading ? 'Caricamento…' : 'Vedi Competitor'}
        </button>
      ) : (
        <>
          <button className="btn-sec btn-comp-toggle" onClick={handleToggle}>
            Nascondi Competitor
          </button>
          <div className="res-comp-section">
            <div className="res-comp-content">
              {competitors.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Nessun competitor disponibile per lo slot selezionato.
                </p>
              ) : (
                <div className="comp-cards-grid">
                  {competitors.map((co, i) => (
                    <div key={i} className={`comp-card-item${co.evento ? ' comp-card-strong' : ''}`}>
                      <div className="comp-card-top">
                        <span className="comp-share-pill">
                          {typeof co.share === 'number' ? `${co.share}%` : '—'}
                        </span>
                      </div>
                      <div className="comp-card-title">{co.title}</div>
                      <div className="comp-card-labels">
                        <span className="comp-label-pill comp-label-ch">{co.ch}</span>
                        {co.tipo && (
                          <span className="comp-label-pill comp-label-tipo">{co.tipo}</span>
                        )}
                      </div>
                      {co.evento && (
                        <div className="comp-evento-badge">⚠️ Evento forte</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ResultSostituzione({ result, prog, date, onNewSim, onSave, saved, scenFull }) {
  /** @type {SimResultSost} */
  const r = result
  const origShare = r.orig_share
  const predShare = r.predicted_share
  const delta = r.delta

  const origColorCls = (origShare !== null && predShare !== null)
    ? (origShare > predShare ? ' res-share-high' : origShare < predShare ? ' res-share-low' : '')
    : ''
  const predColorCls = (origShare !== null && predShare !== null)
    ? (predShare > origShare ? ' res-share-high' : predShare < origShare ? ' res-share-low' : '')
    : ''

  const recapItems = [
    r.orig_ch && `Canale: ${r.orig_ch}`,
    r.orig_time && `Ora: ${r.orig_time}${r.orig_end ? '–' + r.orig_end : ''}`,
    date && `Data: ${fmtDate(date)}`,
  ].filter(Boolean)

  return (
    <div className="card res-card">
      {/* Recap inline */}
      <div className="res-recap-inline">
        <div className="res-recap-title">
          Sostituzione di{' '}
          <span className="res-prog-highlight">{r.orig_title}</span>
          {' '}con{' '}
          <span className="res-prog-highlight">{r.cand_title}</span>
        </div>
        {recapItems.length > 0 && (
          <div
            className="res-recap-meta"
            dangerouslySetInnerHTML={{
              __html: recapItems
                .map((item) => item.replace(/^([^:]+):/, '<strong>$1:</strong>'))
                .join(' · '),
            }}
          />
        )}
      </div>

      {/* Share comparison */}
      <div className="res-main-box">
        <div className="res-main-hdr">Impatto previsto</div>
        <div className="res-shares-row">
          <div className="res-share-col">
            <span className="res-share-lbl">Share attuale</span>
            <span className={`res-share-val${origColorCls}`}>
              {origShare !== null ? origShare.toFixed(1) + '%' : '—'}
            </span>
            <span className="res-share-prog">{r.orig_title}</span>
          </div>
          <div className="res-share-divider">→</div>
          <div className="res-share-col">
            <span className="res-share-lbl">Share previsto</span>
            <span className={`res-share-val res-share-pred${predColorCls}`}>
              {predShare !== null ? predShare.toFixed(1) + '%' : '—'}
            </span>
            <span className="res-share-prog">{r.cand_title}</span>
          </div>
        </div>
        <VerdictPill delta={delta} />
      </div>

      {/* Competitors */}
      <CompetitorSection slot={prog?.slot || null} />

      {/* Action bar */}
      <div className="psel-action-bar res-action-bar">
        <div className="res-action-left">
          <button className="btn-back" onClick={onNewSim}>🏠 Nuova Simulazione</button>
        </div>
        <div className="res-action-right">
          {!saved ? (
            <>
              <button className="btn-pri" onClick={onSave}>Salva Simulazione</button>
              <button className="btn-sec" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Aggiungi sostituzione
              </button>
            </>
          ) : (
            <>
              <button className="btn-sec" onClick={() => window.location.href = '/scenari'}>
                📂 Visualizza in Scenari
              </button>
              {!scenFull ? (
                <button className="btn-sec" onClick={onNewSim}>Aggiungi sostituzione</button>
              ) : (
                <span className="res-full-badge">Scenario completo</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultSpostamento({ result, onNewSim, onSave, saved, scenFull }) {
  /** @type {SimResultSposta} */
  const r = result
  const origSlotShare = r.orig_slot_share
  const destSlotShare = r.dest_slot_share
  const delta = r.delta

  const origColorCls = (origSlotShare !== null && destSlotShare !== null)
    ? (origSlotShare > destSlotShare ? ' res-share-high' : origSlotShare < destSlotShare ? ' res-share-low' : '')
    : ''
  const predColorCls = (origSlotShare !== null && destSlotShare !== null)
    ? (destSlotShare > origSlotShare ? ' res-share-high' : destSlotShare < origSlotShare ? ' res-share-low' : '')
    : ''

  return (
    <div className="card res-card">
      {/* Move summary */}
      <div className="res-move-summary">
        <div className="res-move-header">
          <span className="res-move-icon">🕐</span>
          <span className="res-move-title">Riepilogo Spostamento</span>
        </div>
        <div className="res-move-body">
          <div className="res-move-program">
            <span className="res-move-prog-label">Programma:</span>
            <span className="res-move-prog-name">{r.prog_title}</span>
          </div>
          <div className="res-move-slots">
            <div className="res-move-slot res-move-slot-orig">
              <div className="res-move-slot-label">Slot Originale</div>
              <div className="res-move-slot-content">
                <div className="res-move-slot-row">
                  <span className="res-move-slot-key">Canale:</span>
                  <span className="res-move-slot-val">{r.orig_ch}</span>
                </div>
                <div className="res-move-slot-row">
                  <span className="res-move-slot-key">Data:</span>
                  <span className="res-move-slot-val">{fmtDate(r.orig_date) || '—'}</span>
                </div>
                <div className="res-move-slot-row">
                  <span className="res-move-slot-key">Orario:</span>
                  <span className="res-move-slot-val">
                    {r.orig_time || '—'}{r.orig_end ? ` – ${r.orig_end}` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="res-move-arrow">→</div>

            <div className="res-move-slot res-move-slot-dest">
              <div className="res-move-slot-label">Slot Destinazione</div>
              <div className="res-move-slot-content">
                <div className="res-move-slot-row">
                  <span className="res-move-slot-key">Canale:</span>
                  <span className="res-move-slot-val">{r.dest_ch || '—'}</span>
                </div>
                <div className="res-move-slot-row">
                  <span className="res-move-slot-key">Data:</span>
                  <span className="res-move-slot-val">{fmtDate(r.dest_date) || '—'}</span>
                </div>
                <div className="res-move-slot-row">
                  <span className="res-move-slot-key">Orario:</span>
                  <span className="res-move-slot-val">{r.dest_time || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share comparison */}
      <div className="res-main-box">
        <div className="res-main-hdr">Confronto share degli slot</div>
        <div className="res-shares-row">
          <div className="res-share-col">
            <span className="res-share-lbl">Share slot originale</span>
            <span className={`res-share-val${origColorCls}`}>
              {origSlotShare !== null ? origSlotShare.toFixed(1) + '%' : '—'}
            </span>
            <span className="res-share-prog">{r.orig_ch} · {r.orig_time || '—'}</span>
          </div>
          <div className="res-share-divider">→</div>
          <div className="res-share-col">
            <span className="res-share-lbl">Share slot destinazione</span>
            <span className={`res-share-val res-share-pred${predColorCls}`}>
              {destSlotShare !== null ? destSlotShare.toFixed(1) + '%' : '—'}
            </span>
            <span className="res-share-prog">{r.dest_ch || '—'} · {r.dest_time || '—'}</span>
          </div>
        </div>
        <VerdictPill delta={delta} />
      </div>

      {/* Competitors */}
      <CompetitorSection slot={r.dest_time} />

      {/* Action bar */}
      <div className="psel-action-bar res-action-bar">
        <div className="res-action-left">
          <button className="btn-back" onClick={onNewSim}>🏠 Nuova Simulazione</button>
        </div>
        <div className="res-action-right">
          {!saved ? (
            <>
              <button className="btn-pri" onClick={onSave}>Salva Simulazione</button>
              <button className="btn-sec" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                Aggiungi spostamento
              </button>
            </>
          ) : (
            <>
              <button className="btn-sec" onClick={() => window.location.href = '/scenari'}>
                📂 Visualizza in Scenari
              </button>
              {!scenFull ? (
                <button className="btn-sec" onClick={onNewSim}>Aggiungi spostamento</button>
              ) : (
                <span className="res-full-badge">Scenario completo</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StepResult() {
  const { state, set, resetSim, addToScenario } = useApp()
  const {
    mode, prog, date,
    _simResult, _simSaved,
    activeScen, scenarios,
  } = state

  const activeScenObj = scenarios[activeScen]
  const scenFull = activeScenObj && activeScenObj.items.length >= 3

  const handleNewSim = () => resetSim()

  const handleSave = () => {
    addToScenario()
    set({ _simSaved: true })
  }

  if (!_simResult) {
    return (
      <div className="card">
        <p style={{ color: 'var(--muted)', padding: 24 }}>Risultato non disponibile.</p>
        <div className="psel-action-bar">
          <button className="btn-back" onClick={handleNewSim}>🏠 Nuova Simulazione</button>
        </div>
      </div>
    )
  }

  if (mode === 'sostituzione') {
    return (
      <ResultSostituzione
        result={_simResult}
        prog={prog}
        date={date}
        onNewSim={handleNewSim}
        onSave={handleSave}
        saved={_simSaved}
        scenFull={scenFull}
      />
    )
  }

  return (
    <ResultSpostamento
      result={_simResult}
      onNewSim={handleNewSim}
      onSave={handleSave}
      saved={_simSaved}
      scenFull={scenFull}
    />
  )
}
