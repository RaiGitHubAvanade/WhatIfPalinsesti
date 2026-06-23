import './ScenTabStrip.css'

/**
 * @typedef {import('../../models/simulationViewModel').SimResultSost} SimResultSost
 * @typedef {import('../../models/simulationViewModel').SimResultSposta} SimResultSposta
 */

/**
 * Four-tab strip showing each scenario's item count and fill state.
 * @param {{ scenarios: Record<number,{items:any[],anchor:any}>, activeScen: number, onSelect: (n:number)=>void }} props
 */
export default function ScenTabStrip({ scenarios, activeScen, onSelect }) {
  return (
    <div className="stc-grid">
      {[1, 2, 3, 4].map(n => {
        const sc = scenarios[n]
        const count = sc ? sc.items.length : 0
        const isFull = count >= 3
        const isActive = activeScen === n
        const pct = Math.round((count / 3) * 100)

        return (
          <button
            key={n}
            className={`stc-card${isActive ? ' on' : ''}`}
            onClick={() => onSelect(n)}
          >
            <div className="stc-header">
              <span className="stc-num">Scenario {n}</span>
              {isFull && <span className="stc-full">PIENO</span>}
            </div>
            <div className="stc-bar">
              <div className="stc-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="stc-cnt">{count} / 3 simulazioni</div>
          </button>
        )
      })}
    </div>
  )
}
