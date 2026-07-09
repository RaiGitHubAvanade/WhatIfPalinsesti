import { useReducer, useCallback } from 'react'
import { AppContext } from './AppContextStore'

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

  // simulation result overlay
  _viewSim: false,
  _simResult: null,
  _simSaved: false,

  // scenarios — dynamic, populated by SCEN_ADD
  scenarios: {},

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
        _viewSim: false,
        _simResult: null,
        _simSaved: false,
        showComp: false,
      }

    // Save a simulation result — auto-picks or creates a scenario slot
    case 'SCEN_ADD': {
      const incomingResult = action.payload?.result ?? state._simResult
      if (!incomingResult) return state
      const scenarios = state.scenarios
      const allKeys = Object.keys(scenarios).map(Number).filter(n => !isNaN(n) && n >= 1).sort((a, b) => a - b)

      // 1. Find scenario whose anchor matches the current program (prefer reuse)
      let targetId = null
      const progTitle = state.prog?.program_name
      if (progTitle) {
        for (const k of allKeys) {
          const sc = scenarios[k]
          if (sc && sc.anchor?.program_name === progTitle && sc.items.length < 3) {
            targetId = k; break
          }
        }
      }
      // 2. First non-full existing scenario
      if (targetId === null) {
        for (const k of allKeys) {
          if (scenarios[k] && scenarios[k].items.length < 3) { targetId = k; break }
        }
      }
      // 3. Create a new slot
      if (targetId === null) {
        targetId = allKeys.length > 0 ? Math.max(...allKeys) + 1 : 1
      }

      const existing = scenarios[targetId] || { items: [], anchor: null, type: null, createdAt: null, title: null }
      if (existing.items.length >= 3) return state

      const newItem = {
        prog: state.prog,
        cand: state.cand,
        mode: state.mode,
        result: incomingResult,
        date: state.date,
        ch: state.ch,
        spDestDay: state.spDestDay,
        spDestTime: state.spDestTime,
      }

      return {
        ...state,
        _simSaved: true,
        scenarios: {
          ...scenarios,
          [targetId]: {
            ...existing,
            items: [...existing.items, newItem],
            anchor: existing.anchor || state.prog || null,
            type: existing.type || state.mode || null,
            createdAt: existing.createdAt || new Date().toISOString(),
          },
        },
      }
    }

    // Remove an item from a scenario
    case 'SCEN_REMOVE': {
      const { scenId, idx } = action.payload
      const scen = state.scenarios[scenId]
      if (!scen) return state
      const items = scen.items.filter((_, i) => i !== idx)
      return {
        ...state,
        scenarios: {
          ...state.scenarios,
          [scenId]: { ...scen, items },
        },
      }
    }

    // Delete an entire scenario
    case 'SCEN_DELETE': {
      const { scenId } = action.payload
      const { [scenId]: _deleted, ...rest } = state.scenarios
      void _deleted
      return { ...state, scenarios: rest }
    }

    // Rename a scenario
    case 'SCEN_SET_TITLE': {
      const { scenId, title } = action.payload
      const scen = state.scenarios[scenId]
      if (!scen) return state
      return {
        ...state,
        scenarios: { ...state.scenarios, [scenId]: { ...scen, title } },
      }
    }

    // Set anchor (comparison reference) of a scenario
    case 'SCEN_SET_ANCHOR': {
      const { scenId, anchor } = action.payload
      const scen = state.scenarios[scenId]
      if (!scen) return state
      return {
        ...state,
        scenarios: {
          ...state.scenarios,
          [scenId]: { ...scen, anchor },
        },
      }
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

  const set = useCallback((payload) => dispatch({ type: 'SET', payload }), [])
  const toast = useCallback((msg) => dispatch({ type: 'TOAST', payload: msg }), [])
  const clearToast = useCallback(() => dispatch({ type: 'TOAST_CLEAR' }), [])
  const resetSim = useCallback(() => dispatch({ type: 'SIM_RESET' }), [])

  const addToScenario = useCallback(() => dispatch({ type: 'SCEN_ADD' }), [])
  const addToScenarioWithResult = useCallback((result) => dispatch({ type: 'SCEN_ADD', payload: { result } }), [])
  const removeFromScenario = useCallback((scenId, idx) =>
    dispatch({ type: 'SCEN_REMOVE', payload: { scenId, idx } }), [])
  const deleteScenario = useCallback((scenId) =>
    dispatch({ type: 'SCEN_DELETE', payload: { scenId } }), [])
  const setScenarioTitle = useCallback((scenId, title) =>
    dispatch({ type: 'SCEN_SET_TITLE', payload: { scenId, title } }), [])
  const setScenarioAnchor = useCallback((scenId, anchor) =>
    dispatch({ type: 'SCEN_SET_ANCHOR', payload: { scenId, anchor } }), [])

  const applyWeeklyOverride = useCallback((idx, data) =>
    dispatch({ type: 'WEEKLY_OVERRIDE', payload: { idx, data } }), [])
  const clearWeeklyOverrides = useCallback(() =>
    dispatch({ type: 'WEEKLY_CLEAR_OVERRIDES' }), [])

  const value = {
    state,
    dispatch,
    set,
    toast,
    clearToast,
    resetSim,
    addToScenario,
    addToScenarioWithResult,
    removeFromScenario,
    deleteScenario,
    setScenarioTitle,
    setScenarioAnchor,
    applyWeeklyOverride,
    clearWeeklyOverrides,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
