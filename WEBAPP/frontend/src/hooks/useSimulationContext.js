import { useEffect, useState } from 'react'
import { getSimulationContext } from '../services/apiScenarios'

/**
 * Load the context (selected/prev/next/competitor/... programs and their historical occurrences)
 * of a simulation shown in the detail pages.
 *
 * @param {string} simulationId
 * @param {'sostituzione'|'spostamento'} simulationType
 * @returns {{ loading: boolean, error: string, context: import('../services/apiScenarios').SimulationContext|null, retry: () => void }}
 */
export function useSimulationContext(simulationId, simulationType) {
  const requestKey = `${simulationType}:${simulationId}`
  const [state, setState] = useState({ key: null, loading: true, error: '', context: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!simulationId) return undefined
    const controller = new AbortController()
    getSimulationContext(simulationType, simulationId, { signal: controller.signal })
      .then(context => {
        if (!controller.signal.aborted) setState({ key: requestKey, loading: false, error: '', context })
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ key: requestKey, loading: false, error: error.message, context: null })
      })
    return () => controller.abort()
  }, [simulationId, simulationType, requestKey, attempt])

  const retry = () => {
    setState({ key: null, loading: true, error: '', context: null })
    setAttempt(value => value + 1)
  }

  if (state.key !== requestKey) return { loading: true, error: '', context: null, retry }
  return { loading: state.loading, error: state.error, context: state.context, retry }
}
