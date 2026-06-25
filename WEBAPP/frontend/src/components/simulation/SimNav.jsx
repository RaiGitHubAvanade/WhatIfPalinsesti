import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { startSostituzione, startSpostamento } from '../../services/apiSimulation'

export default function SimNav() {
  const navigate = useNavigate()
  const { state, set, toast, addToScenarioWithResult, resetSim } = useApp()
  const { step, mode, prog, cand, spDestCh, spDestDay, spDestTime } = state
  const [loading, setLoading] = useState(false)

  const readyToLaunch = step === 2 && (
    mode === 'spostamento'
      ? !!(spDestCh && spDestDay && spDestTime)
      : !!cand
  )

  const handleLaunch = async () => {
    if (!prog || !readyToLaunch) return
    setLoading(true)
    try {
      let result
      if (mode === 'sostituzione') {
        result = await startSostituzione({
          program_name: prog.program_name,
          program_channel: prog.canale,
          program_share_predict: prog.share_storico,
          program_date: state.date,
          program_from_time: prog.from_time,
          scenario_type: mode,
          new_program_name: cand.program_name,
          new_program_share_storico: cand.share_storico,
        })
      } else if (mode === 'spostamento') {
        result = await startSpostamento({
          program_name: prog.program_name,
          program_channel: prog.canale,
          program_share_predict: prog.share_storico,
          program_date: state.date,
          program_from_time: prog.from_time,
          scenario_type: mode,
          new_channel: spDestCh,
          new_date: spDestDay,
          new_from_time: spDestTime,
        })
      } else {
        throw new Error('Modalità di simulazione non valida')
      }
      addToScenarioWithResult(result)
      resetSim()
      navigate('/scenari')
    } catch (e) {
      toast('Errore simulazione: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 1) {
      set({ step: 0, mode: null, cand: null, spDestCh: null, spDestDay: '', spDestTime: null })
    } else if (step === 2) {
      set({ step: 1, mode: null, cand: null, spDestCh: null, spDestDay: '', spDestTime: null })
    }
  }

  return (
    <>
      {step > 0 && (
        <button className="btn-back" onClick={handleBack}>
          ← Indietro
        </button>
      )}

      {step === 0 && (
        <button
          className="btn-next"
          style={{ marginLeft: 'auto' }}
          disabled={!prog}
          onClick={() => prog && set({ step: 1 })}
        >
          Tipo di Simulazione →
        </button>
      )}

      {step === 2 && (
        <button
          className="btn-next"
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
          disabled={!readyToLaunch || loading}
          onClick={handleLaunch}
        >
          {loading ? 'Avvio…' : 'Avvia Simulazione'}
        </button>
      )}
    </>
  )
}
