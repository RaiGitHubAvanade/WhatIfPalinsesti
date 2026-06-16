import { useApp } from '../../context/useApp'

export default function ModeChoice({ onBack, onChoose }) {
  const { state, set } = useApp()
  const { mode } = state

  const handleChoose = (m) => {
    set({ mode: m })
    onChoose(m)
  }

  return (
    <div className="card">
      <div className="sect-label">Scegli la modalità di simulazione</div>
      <div className="mode-grid" style={{ marginTop: 20, marginBottom: 24 }}>
        <div className={`mode-card${mode === 'sostituzione' ? ' sel' : ''}`} onClick={() => handleChoose('sostituzione')}>
          <div className="mode-ico">🔄</div>
          <div className="mode-title">Sostituzione</div>
          <div className="mode-desc">
            Sostituisci il programma selezionato con un altro contenuto e scopri l'impatto previsto sullo share.
          </div>
          <button className="btn-launch" onClick={() => handleChoose('sostituzione')}>
            Inizia Sostituzione →
          </button>
        </div>
        <div className={`mode-card${mode === 'spostamento' ? ' sel' : ''}`} onClick={() => handleChoose('spostamento')}>
          <div className="mode-ico">🕐</div>
          <div className="mode-title">Spostamento</div>
          <div className="mode-desc">
            Sposta il programma in un'altra fascia oraria o giorno e analizza come cambia lo share.
          </div>
          <button className="btn-launch" onClick={() => handleChoose('spostamento')}>
            Inizia Spostamento →
          </button>
        </div>
      </div>
      <div className="step-nav">
        <button className="btn-inline ghost" onClick={onBack}>← Indietro</button>
      </div>
    </div>
  )
}

