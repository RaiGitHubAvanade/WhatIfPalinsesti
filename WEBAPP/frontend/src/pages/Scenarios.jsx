import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'

function ScenarioCard({ scenId }) {
  const { state, set, removeFromScenario } = useApp()
  const scen = state.scenarios[scenId]
  const isActive = state.activeScen === scenId
  const isFull = scen.items.length >= 3

  const handleActivate = () => set({ activeScen: scenId })

  const handleRemove = (idx, e) => {
    e.stopPropagation()
    removeFromScenario(scenId, idx)
  }

  const totalDelta = scen.items.reduce((acc, item) => {
    if (item.result?.pred != null && item.prog?.share != null) {
      return acc + (item.result.pred - item.prog.share)
    }
    return acc
  }, 0)

  return (
    <div className={`scen-card${isActive ? ' on' : ''}`} onClick={handleActivate}>
      <div className="sc-header">
        <div className="sc-num">Scenario {scenId}</div>
        {isFull && <span className="scen-full">PIENO</span>}
      </div>

      {scen.items.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 12, padding: '6px 0' }}>
          Nessuna simulazione salvata
        </div>
      ) : (
        <>
          <div className="sc-anch">{scen.items[0]?.prog?.title || '—'}</div>
          <div className="sc-bar">
            <div className="sc-bar-fill" style={{ width: `${Math.round((scen.items.length / 3) * 100)}%` }} />
          </div>
          <div className="sc-cnt">{scen.items.length}/3 simulazioni</div>
          {totalDelta !== 0 && (
            <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700, color: totalDelta > 0 ? 'var(--success)' : 'var(--danger)' }}>
              Impatto totale: {totalDelta > 0 ? '+' : ''}{totalDelta.toFixed(1)}%
            </div>
          )}
        </>
      )}

      {/* Items detail */}
      {scen.items.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {scen.items.map((item, idx) => {
            const delta = item.result?.pred != null && item.prog?.share != null
              ? item.result.pred - item.prog.share
              : null
            return (
              <div key={idx} className="sc-item" style={{ marginTop: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sc-item-title">{item.prog?.title}</div>
                  <div className="sc-item-meta">
                    <span className={`sc-type-badge ${item.mode}`}>{item.mode === 'sostituzione' ? '🔄' : '🕐'} {item.mode}</span>
                  </div>
                </div>
                {delta != null && (
                  <div className="sc-item-pred" style={{ color: delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--muted)' }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                  </div>
                )}
                <button
                  style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: '0 4px' }}
                  onClick={(e) => handleRemove(idx, e)}
                  title="Rimuovi"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Scenarios() {
  const navigate = useNavigate()
  const { state, toast } = useApp()

  const totalItems = Object.values(state.scenarios).reduce((acc, s) => acc + s.items.length, 0)

  const handlePrint = () => window.print()

  return (
    <div>
      <div className="page-sub">
        Gestisci fino a 4 scenari, ognuno con max 3 simulazioni. Scenario attivo: <strong>{state.activeScen}</strong>
      </div>

      {totalItems === 0 && (
        <div className="card scen-empty">
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Nessuno scenario salvato</div>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Esegui una simulazione e premi "Salva nello Scenario" per aggiungere risultati qui.
          </p>
          <button className="btn-inline primary" style={{ marginTop: 16 }} onClick={() => navigate('/simulazione')}>
            → Vai alla Simulazione
          </button>
        </div>
      )}

      <div className="scen-grid">
        {[1, 2, 3, 4].map(id => <ScenarioCard key={id} scenId={id} />)}
      </div>

      {totalItems > 0 && (
        <div className="scen-actions">
          <button className="btn-inline" onClick={handlePrint}>🖨️ Stampa Scenario {state.activeScen}</button>
          <button className="btn-inline" onClick={() => toast('Funzione email non disponibile in demo')}>📧 Invia per Email</button>
          <button className="btn-inline" onClick={() => toast('Report PDF generato (demo)')}>📄 Genera Report</button>
        </div>
      )}
    </div>
  )
}

