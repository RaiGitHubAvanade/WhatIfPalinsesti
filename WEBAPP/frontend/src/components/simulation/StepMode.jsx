import { useApp } from '../../context/useApp'
import { checkScenarioLimit } from '../../services/apiSimulation'
import './StepMode.css'

export default function StepMode() {
  const { state, set, toast } = useApp()
  const { prog, simModeValidationLoading } = state
  const cardsDisabled = simModeValidationLoading

  const handleMode = async (mode) => {
    if (simModeValidationLoading) return

    if (!prog?.id) {
      toast('Programma non valido. Seleziona nuovamente un programma.', 'error')
      return
    }

    set({
      mode,
      simModeValidationLoading: true,
      cand: null,
      _spSimulated: false,
    })

    try {
      const result = await checkScenarioLimit({
        programId: prog.id,
        scenarioType: mode,
      })

      if (!result?.data?.can_proceed) {
        toast(result.message, 'warning')
        set({ simModeValidationLoading: false })
        return
      }

      set({
        simModeValidationLoading: false,
        step: 2,
        cand: null,
        _spSimulated: false,
      })
    } catch (e) {
      set({ simModeValidationLoading: false })
      toast(e.message || 'Errore validazione limite scenario', 'error')
    }
  }

  return (
    <div className="card">
      <div className="sect-label">Tipo di Simulazione</div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        Scegli il tipo di operazione da effettuare sul programma selezionato.
      </p>

      <div className="sim-mode-grid">
        <div
          className={`sim-mode-card sim-mode-card-sost ${cardsDisabled ? 'is-disabled' : ''}`}
          onClick={cardsDisabled ? undefined : () => handleMode('sostituzione')}
          role="button"
          aria-disabled={cardsDisabled}
          tabIndex={cardsDisabled ? -1 : 0}
          onKeyDown={(e) => {
            if (cardsDisabled) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleMode('sostituzione')
            }
          }}
        >
          <div className="sim-mode-ico">🔄</div>
          <div className="sim-mode-title">Sostituzione</div>
          <div className="sim-mode-desc">
            Sostituisci questo programma con un&apos;alternativa editoriale nello stesso slot.
            Analizza l&apos;impatto sullo share.
          </div>
        </div>

        <div
          className={`sim-mode-card sim-mode-card-sposta ${cardsDisabled ? 'is-disabled' : ''}`}
          onClick={cardsDisabled ? undefined : () => handleMode('spostamento')}
          role="button"
          aria-disabled={cardsDisabled}
          tabIndex={cardsDisabled ? -1 : 0}
          onKeyDown={(e) => {
            if (cardsDisabled) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleMode('spostamento')
            }
          }}
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
