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

  // simulation result overlay
  _viewSim: false,
  _simResult: null,
  _simSaved: false,

  // scenarios
  activeScen: 1,
  scenarios: {
    1: { items: [], anchor: null },
    2: { items: [], anchor: null },
    3: { items: [], anchor: null },
    4: { items: [], anchor: null },
  },

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
        _viewSim: false,
        _simResult: null,
        _simSaved: false,
        showComp: false,
      }

    // Save a simulation result to the active scenario
    case 'SCEN_ADD': {
      const id = state.activeScen
      const scen = state.scenarios[id]
      if (!scen || scen.items.length >= 3) return state
      const newItem = {
        prog: state.prog,
        cand: state.cand,
        mode: state.mode,
        result: state._simResult,
        date: state.date,
        ch: state.ch,
        spDestDay: state.spDestDay,
        spDestTime: state.spDestTime,
      }
      return {
        ...state,
        scenarios: {
          ...state.scenarios,
          [id]: { ...scen, items: [...scen.items, newItem] },
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
  const removeFromScenario = useCallback((scenId, idx) =>
    dispatch({ type: 'SCEN_REMOVE', payload: { scenId, idx } }), [])
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
    removeFromScenario,
    setScenarioAnchor,
    applyWeeklyOverride,
    clearWeeklyOverrides,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
