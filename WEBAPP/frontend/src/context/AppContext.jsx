import { useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { AppContext } from './AppContextStore'
import { getScenarios } from '../services/apiScenarios'

const SCENARIOS_POLL_BASE_MS = 3000
const SCENARIOS_POLL_MAX_MS = 30000

function hasRunningSimulations(scenarios) {
  return (scenarios || []).some(s =>
    (s.simulations || []).some(sim => sim.status === 'Running')
  )
}

// ─────────────────────── initial state ───────────────────────────
const INITIAL_STATE = {
  // simulation flow
  mode: null,           // 'sostituzione' | 'spostamento' | null
  step: 0,
  ch: null,
  date: '',
  slot: null,
  _search: '',
  prog: null,           // selected program object
  cand: null,           // selected candidate object

  // spostamento extra fields
  _spSimulated: false,
  spDestDay: '',
  spSrcDay: '',
  spDestTime: null,
  spDestCh: null,
  spScheduleIds: [],

  // competitors panel
  showComp: false,

  // weekly programming
  wCh: null,
  weekStartISO: null,
  _wkExplicit: false,
  wLoaded: false,
  wOverrides: {},        // { [rowIndex]: { prog, prev } }

  // toast
  toast: null,           // { msg: string, id: number }
}

// ─────────────────────── reducer ─────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

    // Generic setter — { type: 'SET', payload: { key: value, ... } }
    case 'SET':
      return { ...state, ...action.payload }

    // Reset the simulation flow back to step 0
    case 'SIM_RESET':
      return {
        ...state,
        mode: null,
        step: 0,
        ch: null,
        date: '',
        slot: null,
        _search: '',
        prog: null,
        cand: null,
        _spSimulated: false,
        spDestDay: '',
        spSrcDay: '',
        spDestTime: null,
        spDestCh: null,
        spScheduleIds: [],
        showComp: false,
      }

    // Show toast — auto-cleared from component
    case 'TOAST':
      return { ...state, toast: { msg: action.payload, id: Date.now() } }

    case 'TOAST_CLEAR':
      return { ...state, toast: null }

    // Apply a weekly override
    case 'WEEKLY_OVERRIDE': {
      const { idx, data } = action.payload
      return { ...state, wOverrides: { ...state.wOverrides, [idx]: data } }
    }

    case 'WEEKLY_CLEAR_OVERRIDES':
      return { ...state, wOverrides: {} }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [scenariosData, setScenariosData] = useState([])
  const [scenariosLoaded, setScenariosLoaded] = useState(false)
  const [scenariosLoading, setScenariosLoading] = useState(false)

  const scenariosPollingActive = hasRunningSimulations(scenariosData)

  const scenariosPollTimerRef = useRef(null)
  const scenariosPollAbortRef = useRef(null)
  const scenariosPollInFlightRef = useRef(false)
  const scenariosPollSeqRef = useRef(0)
  const scenariosPollErrorCountRef = useRef(0)

  const clearScenariosPollingResources = useCallback(() => {
    if (scenariosPollTimerRef.current) {
      clearTimeout(scenariosPollTimerRef.current)
      scenariosPollTimerRef.current = null
    }
    if (scenariosPollAbortRef.current) {
      scenariosPollAbortRef.current.abort()
      scenariosPollAbortRef.current = null
    }
  }, [])

  const refreshScenarios = useCallback(async ({ force = false, silent = false, signal } = {}) => {
    if (!force && scenariosLoaded) {
      return scenariosData
    }

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
  }, [scenariosData, scenariosLoaded])

  const ensureScenariosLoaded = useCallback(async () => {
    if (scenariosLoaded) return scenariosData
    return refreshScenarios({ force: true })
  }, [refreshScenarios, scenariosData, scenariosLoaded])

  const set = useCallback((payload) => dispatch({ type: 'SET', payload }), [])
  const toast = useCallback((msg) => dispatch({ type: 'TOAST', payload: msg }), [])
  const clearToast = useCallback(() => dispatch({ type: 'TOAST_CLEAR' }), [])
  const resetSim = useCallback(() => dispatch({ type: 'SIM_RESET' }), [])

  const applyWeeklyOverride = useCallback((idx, data) =>
    dispatch({ type: 'WEEKLY_OVERRIDE', payload: { idx, data } }), [])
  const clearWeeklyOverrides = useCallback(() =>
    dispatch({ type: 'WEEKLY_CLEAR_OVERRIDES' }), [])

  useEffect(() => {
    if (!scenariosLoaded || !scenariosPollingActive) {
      clearScenariosPollingResources()
      scenariosPollInFlightRef.current = false
      scenariosPollErrorCountRef.current = 0
      return
    }

    let cancelled = false

    const scheduleNextPoll = (delayMs) => {
      if (cancelled) return
      if (scenariosPollTimerRef.current) clearTimeout(scenariosPollTimerRef.current)
      scenariosPollTimerRef.current = setTimeout(runPoll, delayMs)
    }

    const runPoll = async () => {
      if (cancelled) return
      if (scenariosPollInFlightRef.current) {
        scheduleNextPoll(SCENARIOS_POLL_BASE_MS)
        return
      }

      scenariosPollInFlightRef.current = true
      const reqSeq = ++scenariosPollSeqRef.current

      const controller = new AbortController()
      scenariosPollAbortRef.current = controller

      try {
        const data = await getScenarios({ search: '', type: '', date: '' }, { signal: controller.signal })
        const next = data.scenarios || []
        setScenariosData(next)
        setScenariosLoaded(true)

        if (cancelled || reqSeq !== scenariosPollSeqRef.current) return

        scenariosPollErrorCountRef.current = 0
        if (hasRunningSimulations(next)) {
          scheduleNextPoll(SCENARIOS_POLL_BASE_MS)
        }
      } catch (e) {
        if (cancelled || e?.name === 'AbortError' || reqSeq !== scenariosPollSeqRef.current) return

        scenariosPollErrorCountRef.current += 1
        const expDelay = Math.min(
          SCENARIOS_POLL_MAX_MS,
          SCENARIOS_POLL_BASE_MS * (2 ** scenariosPollErrorCountRef.current),
        )
        const jitter = Math.floor(Math.random() * 500)
        scheduleNextPoll(expDelay + jitter)
      } finally {
        if (reqSeq === scenariosPollSeqRef.current) {
          scenariosPollInFlightRef.current = false
        }
      }
    }

    scheduleNextPoll(SCENARIOS_POLL_BASE_MS)

    return () => {
      cancelled = true
      clearScenariosPollingResources()
    }
  }, [scenariosLoaded, scenariosPollingActive, clearScenariosPollingResources])

  useEffect(() => () => {
    clearScenariosPollingResources()
  }, [clearScenariosPollingResources])

  const value = {
    state,
    dispatch,
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
