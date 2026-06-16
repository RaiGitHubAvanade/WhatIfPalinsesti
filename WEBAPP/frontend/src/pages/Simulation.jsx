import { useApp } from '../context/useApp'
import ProgressBar from '../components/simulation/ProgressBar'
import SimPanel from '../components/simulation/SimPanel'
import ProgramList from '../components/simulation/ProgramList'
import ModeChoice from '../components/simulation/ModeChoice'
import CandidateList from '../components/simulation/CandidateList'
import SpostamentoStep from '../components/simulation/SpostamentoStep'
import SimulationResult from '../components/simulation/SimulationResult'

export default function Simulation() {
  const { state, set, resetSim, addToScenario, toast } = useApp()
  const { step, mode, prog } = state

  const handleProgramSelect = (p) => {
    set({ prog: p, step: 1, cand: null, _simResult: null })
  }

  const handleModeChosen = (m) => {
    set({ mode: m, step: 2 })
  }

  const handleSimDone = () => {
    set({ step: 3 })
  }

  const handleSaveToScenario = () => {
    const scen = state.scenarios[state.activeScen]
    if (!scen || scen.items.length >= 3) {
      toast(`Lo scenario ${state.activeScen} è pieno (max 3 simulazioni). Passa a un altro scenario.`)
      return
    }
    addToScenario()
    toast(`Simulazione salvata nello Scenario ${state.activeScen}`)
  }

  return (
    <div>
      <div className="page-sub">Seleziona un programma e simula l'impatto di una sostituzione o uno spostamento</div>

      <ProgressBar step={step} />

      {step < 3 ? (
        <div className="split">
          {/* Main content */}
          <div>
            {step === 0 && (
              <ProgramList onSelect={handleProgramSelect} />
            )}
            {step === 1 && prog && (
              <ModeChoice
                onBack={() => set({ step: 0, prog: null })}
                onChoose={handleModeChosen}
              />
            )}
            {step === 2 && mode === 'sostituzione' && (
              <CandidateList
                onBack={() => set({ step: 1, mode: null })}
                onDone={handleSimDone}
              />
            )}
            {step === 2 && mode === 'spostamento' && (
              <SpostamentoStep
                onBack={() => set({ step: 1, mode: null })}
                onDone={handleSimDone}
              />
            )}
          </div>

          {/* Right panel */}
          <SimPanel />
        </div>
      ) : (
        <div className="split">
          <SimulationResult
            onReset={resetSim}
            onSave={handleSaveToScenario}
          />
          <SimPanel />
        </div>
      )}
    </div>
  )
}

