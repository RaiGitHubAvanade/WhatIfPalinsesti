import { useApp } from '../../context/useApp'
import './StepMode.css'

function mapEtaToRange(eta) {
  if (!eta || eta === 'Tutti' || eta === 'All') return 'Tutti'
  if (eta.startsWith('15') || eta === '18-24' || eta === '15-34') return '15-24'
  if (eta.startsWith('25') || eta === '18-44' || eta === '25-54' || eta === '35-54') return '25-44'
  if (eta.startsWith('45') || eta === '35-64' || eta === '45-64') return '45-64'
  if (eta.startsWith('55') || eta.startsWith('65')) return '65+'
  return 'Tutti'
}

export default function StepMode() {
  const { state, set } = useApp()
  const { prog } = state

  const handleMode = (mode) => {
    set({
      mode,
      step: 2,
      cand: null,
      _spSimulated: false,
      _simResult: null,
      _simSaved: false,
    })
  }

  const metaItems = []
  if (prog?.ch) metaItems.push(prog.ch)
  metaItems.push(`Genere: ${prog?.sesso || 'Tutti'}`)
  metaItems.push(`Età: ${mapEtaToRange(prog?.eta)}`)

  return (
    <div className="card">
      {/* Recap bar */}
      <div className="psel-recap-bar">
        <span className="psel-recap-lbl">Programma selezionato</span>
        <div className="psel-recap-info">
          <span className="psel-recap-tick">📌</span>
          <span className="psel-recap-name">{prog?.title || '—'}</span>
        </div>
        <div className="psel-recap-meta">{metaItems.join(' · ')}</div>
      </div>

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

      <div className="psel-action-bar">
        <button className="btn-back" onClick={() => set({ step: 0 })}>
          ← Seleziona Programma
        </button>
      </div>
    </div>
  )
}
