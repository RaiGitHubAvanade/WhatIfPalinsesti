import './VerdictPill.css'

export default function VerdictPill({ delta }) {
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
