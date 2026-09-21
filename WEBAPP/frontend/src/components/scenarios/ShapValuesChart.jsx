import './ShapValuesChart.css'
import { MAX_SHAP_VALUES_DISPLAYED } from '../../utils/constants'

function toDisplayName(name) {
  return String(name || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeShapValues(shapValues) {
  if (!shapValues || typeof shapValues !== 'object') return []

  const rows = Object.entries(shapValues)
    .map(([name, raw]) => {
      const value = Number(raw)
      if (!Number.isFinite(value)) return null
      return { name: toDisplayName(name), value }
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, MAX_SHAP_VALUES_DISPLAYED)

  return rows
}

function formatValue(value) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

export default function ShapValuesChart({ shapValues }) {
  const rows = normalizeShapValues(shapValues)
  const maxAbs = Math.max(1, ...rows.map(row => Math.abs(row.value)))

  return (
    <div className="res-shap-box">
      <div className="res-main-hdr">Fattori rilevanti</div>
      <p className="res-shap-desc">
        Il grafico evidenzia i fattori che hanno maggiormente influenzato la previsione del modello per il caso analizzato. I contributi positivi (barra rossa) spingono la previsione di share verso valori più elevati, mentre i contributi negativi (barra blu) riducono la previsione di share.
      </p>

      {rows.length === 0 ? (
        <p className="res-shap-empty">Nessun fattore disponibile.</p>
      ) : (
        <div className="res-shap-list" role="img" aria-label="Grafico dei fattori rilevanti">
          {rows.map(row => {
            const absPercent = (Math.abs(row.value) / maxAbs) * 50
            const isPositive = row.value >= 0

            return (
              <div key={row.name} className="res-shap-row">
                <div className="res-shap-label" title={row.name}>{row.name}</div>
                <div className="res-shap-track">
                  <div
                    className={`res-shap-bar ${isPositive ? 'pos' : 'neg'}`}
                    style={
                      isPositive
                        ? { left: '50%', width: `${absPercent}%` }
                        : { left: `${50 - absPercent}%`, width: `${absPercent}%` }
                    }
                  >
                    <span className={`res-shap-value ${isPositive ? 'pos' : 'neg'}`}>
                      {formatValue(row.value)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}