import { useEffect, useState } from 'react'
import { getFeatures } from '../../services/apiScenarios'
import { getFeatureExplanationsFromResponse } from '../../utils/predictionUtils'
import ShapValuesChart from './ShapValuesChart'

export default function SimulationExplanations({ simulationId, simulationType }) {
  const [state, setState] = useState({ loading: true, error: '', featureExplanations: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getFeatures([{ id: simulationId, simulation_type: simulationType }], { signal: controller.signal })
      .then(items => {
        if (!controller.signal.aborted) setState({ loading: false, error: '', featureExplanations: items[0].feature_explanations })
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ loading: false, error: error.message, featureExplanations: null })
      })
    return () => controller.abort()
  }, [simulationId, simulationType, attempt])

  if (state.loading) return (
    <div className="res-shap-box" aria-busy="true">
      <div className="res-main-hdr">Fattori rilevanti</div>
      <p className="res-shap-loading" role="status">Caricamento fattori rilevanti...</p>
    </div>
  )
  if (state.error) return (
    <div className="res-shap-box" role="alert">
      <p>{state.error}</p>
      <button type="button" className="btn-sec" onClick={() => {
        setState({ loading: true, error: '', featureExplanations: null })
        setAttempt(value => value + 1)
      }}>Riprova</button>
    </div>
  )
  const featureExplanations = getFeatureExplanationsFromResponse(state.featureExplanations)
  if (!featureExplanations.length) return <div className="res-shap-box">Nessun fattore disponibile.</div>
  return <ShapValuesChart featureExplanations={featureExplanations} title="Fattori rilevanti" />
}