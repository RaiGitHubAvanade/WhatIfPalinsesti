import { useState } from 'react'
import { useApp } from '../../context/useApp'
import { startSostituzione, startSpostamento } from '../../services/apiSimulation'

export default function SimNav() {
  const { state, set, toast, refreshScenarios } = useApp()
  const { step, mode, prog, cand, spDestCh, spDestDay, spDestTime, spScheduleIds } = state
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
          program_id: prog.id,
          program_name: prog.program_name,
          program_channel: prog.channel,
          program_share_predict: prog.share_predicted,
          program_date: prog.date,
          program_from_time: prog.from_time,
          program_to_time: prog.to_time,
          scenario_type: mode,
          new_program_name: cand.program_name,
          new_program_share_storico: cand.share_storico,
        })
      } else if (mode === 'spostamento') {
        result = await startSpostamento({
          program_id: prog.id,
          program_name: prog.program_name,
          program_channel: prog.channel,
          program_share_predict: prog.share_predicted,
          program_date: prog.date,
          program_from_time: prog.from_time,
          program_to_time: prog.to_time,
          scenario_type: mode,
          new_channel: spDestCh,
          new_date: spDestDay,
          new_from_time: spDestTime,
          schedule: spScheduleIds,
        })
      } else {
        throw new Error('Modalità di simulazione non valida')
      }
      toast(result.message || 'La simulazione è stata creata ed è disponibile nella sezione "Scenari". Seleziona un altro programma sostitutivo per eseguire una nuova simulazione.')
      set({ cand: null })
      await refreshScenarios({ force: true, silent: true })
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
