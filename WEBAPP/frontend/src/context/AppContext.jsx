import { useReducer, useCallback, useState, useRef, useEffect } from 'react'
import { AppContext } from './AppContextDef'
import { INITIAL_STATE, reducer } from './appReducer'
import { useScenarioPolling } from './useScenarioPolling'
import { hasRunningSimulations } from '../utils/scenarioUtils'
import { getScenarios } from '../services/apiScenarios'

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [scenariosData, setScenariosData] = useState([])
  const [scenariosLoaded, setScenariosLoaded] = useState(false)
  const [scenariosLoading, setScenariosLoading] = useState(false)

  // Refs that always hold the latest values — keeps refreshScenarios / ensureScenariosLoaded
  // stable (empty dep arrays) and prevents the Scenarios mount-effect from re-firing on every poll.
  const scenariosDataRef   = useRef([])
  const scenariosLoadedRef = useRef(false)
  useEffect(() => { scenariosDataRef.current   = scenariosData }, [scenariosData])
  useEffect(() => { scenariosLoadedRef.current = scenariosLoaded }, [scenariosLoaded])

  const scenariosPollingActive = hasRunningSimulations(scenariosData)

  useScenarioPolling(scenariosData, scenariosLoaded, setScenariosData)

  const refreshScenarios = useCallback(async ({ force = false, silent = false, signal } = {}) => {
    if (!force && scenariosLoadedRef.current) return scenariosDataRef.current
    if (!silent) setScenariosLoading(true)
    try {
      const data = await getScenarios({ search: '', type: '', date: '' }, { signal })
      const next = data.scenarios || []
      setScenariosData(next)
      setScenariosLoaded(true)
      return next
    } finally {
      if (!silent) setScenariosLoading(false)
    }
  }, []) // stable — reads state via refs, not closure

  const ensureScenariosLoaded = useCallback(async () => {
    if (scenariosLoadedRef.current) return scenariosDataRef.current
    return refreshScenarios({ force: true })
  }, [refreshScenarios]) // stable because refreshScenarios is stable

  const set                  = useCallback((payload) => dispatch({ type: 'SET', payload }), [])
  const toast                = useCallback((msg, type = 'error') => dispatch({ type: 'TOAST', payload: { msg, type } }), [])
  const clearToast           = useCallback(() => dispatch({ type: 'TOAST_CLEAR' }), [])
  const resetSim             = useCallback(() => dispatch({ type: 'SIM_RESET' }), [])
  const applyWeeklyOverride  = useCallback((idx, data) => dispatch({ type: 'WEEKLY_OVERRIDE', payload: { idx, data } }), [])
  const clearWeeklyOverrides = useCallback(() => dispatch({ type: 'WEEKLY_CLEAR_OVERRIDES' }), [])

  const value = {
    state,
    set,
    toast,
    clearToast,
    resetSim,
    applyWeeklyOverride,
    clearWeeklyOverrides,
    scenariosData,
    scenariosLoaded,
    scenariosLoading,
    scenariosPollingActive,
    ensureScenariosLoaded,
    refreshScenarios,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
