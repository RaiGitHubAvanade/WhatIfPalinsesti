import { useApp } from '../../context/useApp'
import './StepMode.css'

export default function StepMode() {
  const { set } = useApp()

  const handleMode = (mode) => {
    set({
      mode,
      step: 2,
      cand: null,
      _spSimulated: false,
    })
  }

  return (
    <div className="card">
      <div className="sect-label" style={{ marginTop: '20px' }}>Tipo di Simulazione</div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        Scegli il tipo di operazione da effettuare sul programma selezionato.
      </p>

      <div className="sim-mode-grid">
        <div
          className="sim-mode-card sim-mode-card-sost"
          onClick={() => handleMode('sostituzione')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMode('sostituzione') }}
        >
          <div className="sim-mode-ico">🔄</div>
          <div className="sim-mode-title">Sostituzione</div>
          <div className="sim-mode-desc">
            Sostituisci questo programma con un&apos;alternativa editoriale nello stesso slot.
            Analizza l&apos;impatto sullo share.
          </div>
        </div>

        <div
          className="sim-mode-card sim-mode-card-sposta"
          onClick={() => handleMode('spostamento')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMode('spostamento') }}
        >
          <div className="sim-mode-ico">🕐</div>
          <div className="sim-mode-title">Spostamento</div>
          <div className="sim-mode-desc">
            Sposta questo programma in un altro orario o giorno.
            Il sistema calcola l&apos;impatto sulla nuova collocazione.
          </div>
        </div>
      </div>
    </div>
  )
}
