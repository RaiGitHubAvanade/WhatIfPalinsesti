import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { runSimulation } from '../../services/apiService'

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
      if (mode === 'spostamento') {
        result = await runSimulation({
          mode: 'spostamento',
          prog_id: prog.id,
          dest_ch: spDestCh,
          dest_day: spDestDay,
          dest_time: spDestTime,
        })
      } else {
        result = await runSimulation({
          mode: 'sostituzione',
          orig_id: prog.id,
          cand_id: cand.id,
        })
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
