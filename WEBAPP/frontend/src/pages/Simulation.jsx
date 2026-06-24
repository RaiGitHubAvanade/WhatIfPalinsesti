import { useEffect } from 'react'
import { useApp } from '../context/useApp'
import ProgBar from '../components/simulation/ProgBar'
import StepProgram from '../components/simulation/StepProgram'
import StepMode from '../components/simulation/StepMode'
import StepCandidates from '../components/simulation/StepCandidates'
import StepDestination from '../components/simulation/StepDestination'

import './Simulation.css'

export default function Simulation() {
  const { state, resetSim } = useApp()
  const { mode, step } = state

  // Every navigation to /simulazione starts fresh at step 0
  useEffect(() => { resetSim() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stepLabels = [
    'Seleziona Programma',
    'Tipo di Simulazione',
    'Finalizza Simulazione',
  ]

  return (
    <div>
      <ProgBar step={step} labels={stepLabels} />

      <div style={{ marginTop: 20 }}>
        {step === 0 && <StepProgram />}
        {step === 1 && <StepMode />}
        {step === 2 && mode === 'sostituzione' && <StepCandidates />}
        {step === 2 && mode === 'spostamento' && <StepDestination />}
      </div>
    </div>
  )
}
