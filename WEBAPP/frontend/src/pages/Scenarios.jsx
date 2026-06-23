import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/useApp'
import ScenTabStrip from '../components/scenarios/ScenTabStrip'
import ScenItemCard from '../components/scenarios/ScenItemCard'
import './Scenarios.css'

/**
 * @typedef {import('../models/simulationViewModel').SimResultSost} SimResultSost
 * @typedef {import('../models/simulationViewModel').SimResultSposta} SimResultSposta
 */

export default function Scenarios() {
  const navigate = useNavigate()
  const { state, set, removeFromScenario, setScenarioAnchor } = useApp()
  const { activeScen, scenarios } = state

  const activeScenData = scenarios[activeScen] ?? { items: [], anchor: null }
  const items = activeScenData.items
  const anchor = activeScenData.anchor   // item index used as anchor (number|null)
  const isFull = items.length >= 3

  const anchorDelta =
    anchor !== null && anchor !== undefined && items[anchor]?.result?.delta !== undefined
      ? (items[anchor].result?.delta ?? null)
      : null

  function handleToggleAnchor(idx) {
    if (anchor === idx) {
      setScenarioAnchor(activeScen, null)
    } else {
      setScenarioAnchor(activeScen, idx)
    }
  }

  function handleRemove(scenId, idx) {
    // Clear anchor or shift it when the removed item changes the index space
    if (anchor === idx) {
      setScenarioAnchor(scenId, null)
    } else if (anchor !== null && anchor > idx) {
      setScenarioAnchor(scenId, anchor - 1)
    }
    removeFromScenario(scenId, idx)
  }

  return (
    <div>
      <div className="page-title">📂 Scenari</div>
      <p className="page-sub">
        Confronta le simulazioni salvate per ogni scenario. Ogni scenario può contenere fino a 3 simulazioni.
      </p>

      <ScenTabStrip
        scenarios={scenarios}
        activeScen={activeScen}
        onSelect={n => set({ activeScen: n })}
      />

      {items.length === 0 ? (
        <div className="scen-empty-state">
          <div className="scen-empty-ico">📋</div>
          <div className="scen-empty-msg">Nessuna simulazione salvata in questo scenario.</div>
          <p className="scen-empty-hint">
            Esegui una simulazione e premi <strong>Salva in scenario</strong> per aggiungere un risultato qui.
          </p>
          <button className="btn-inline primary" onClick={() => navigate('/simulazione')}>
            ⚙️ Vai alla Simulazione
          </button>
        </div>
      ) : (
        <>
          {isFull && (
            <div className="scen-full-banner">
              <span>⚠️ Scenario pieno — 3 / 3 simulazioni. Rimuovi un elemento per aggiungerne uno nuovo.</span>
            </div>
          )}

          {anchor !== null && (
            <div className="scen-anchor-banner">
              <span>
                🎯 Ancora attiva:{' '}
                <strong>
                  {items[anchor]?.result?.orig_title ||
                    items[anchor]?.result?.prog_title ||
                    items[anchor]?.prog?.title ||
                    `Simulazione ${anchor + 1}`}
                </strong>
              </span>
              <button className="btn-inline ghost" onClick={() => setScenarioAnchor(activeScen, null)}>
                Rimuovi ancora
              </button>
            </div>
          )}

          <div className="scen-items-grid">
            {items.map((item, idx) => (
              <ScenItemCard
                key={idx}
                item={item}
                idx={idx}
                scenId={activeScen}
                isAnchor={anchor === idx}
                anchorDelta={anchorDelta}
                onRemove={handleRemove}
                onToggleAnchor={handleToggleAnchor}
              />
            ))}
          </div>

          {!isFull && (
            <button className="scen-add-sim-btn" onClick={() => navigate('/simulazione')}>
              + Aggiungi simulazione a questo scenario
            </button>
          )}
        </>
      )}
    </div>
  )
}
