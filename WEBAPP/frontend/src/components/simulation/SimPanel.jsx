import { useApp } from '../../context/useApp'

// Right panel showing current simulation context
export default function SimPanel() {
  const { state } = useApp()
  const { prog, cand, ch, date, slot, mode } = state

  if (!prog && !ch) {
    return (
      <div className="r-panel">
        <div className="rp-title">Contesto Simulazione</div>
        <div className="rp-empty">
          Seleziona un programma per iniziare la simulazione
        </div>
      </div>
    )
  }

  return (
    <div className="r-panel">
      <div className="rp-title">Contesto Simulazione</div>
      {ch && <div className="rp-row"><span className="rp-label">Canale</span><strong>{ch}</strong></div>}
      {date && <div className="rp-row"><span className="rp-label">Data</span><strong>{date}</strong></div>}
      {slot && <div className="rp-row"><span className="rp-label">Fascia</span><strong>{slot}</strong></div>}
      {prog && (
        <>
          <div className="divider" />
          <div className="rp-row"><span className="rp-label">Programma</span><strong>{prog.title}</strong></div>
          {prog.share != null && (
            <div className="rp-row"><span className="rp-label">Share att.</span><strong>{prog.share}%</strong></div>
          )}
        </>
      )}
      {mode && (
        <>
          <div className="divider" />
          <div className="rp-row">
            <span className="rp-label">Modalità</span>
            <span className={`badge ${mode === 'sostituzione' ? 'b-primary' : 'b-success'}`}>
              {mode === 'sostituzione' ? '🔄 Sostituzione' : '🕐 Spostamento'}
            </span>
          </div>
        </>
      )}
      {cand && (
        <div className="rp-row">
          <span className="rp-label">Candidato</span>
          <strong>{cand.title || cand.id}</strong>
        </div>
      )}
    </div>
  )
}

