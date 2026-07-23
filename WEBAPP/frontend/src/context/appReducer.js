// ─────────────────────── initial state ───────────────────────────
export const INITIAL_STATE = {
  // simulation flow
  mode: null,           // 'sostituzione' | 'spostamento' | null
  simModeValidationLoading: false,
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
  spScheduleLoading: false,
  spScheduleLoadedDay: '',

  // competitors panel
  showComp: false,

  // weekly programming
  wCh: null,
  weekStartISO: null,
  _wkExplicit: false,
  wLoaded: false,
  wOverrides: {},        // { [overrideKey]: { prog, manual } }

  // target programs cache (StepProgram — keyed by date, expires after TTL)
  targetProgramsCache: { date: null, data: [], loadedAt: null },

  // toast
  toast: null,           // { msg: string, type: 'success'|'warning'|'error', id: number }
}

// ─────────────────────── reducer ─────────────────────────────────
export function reducer(state, action) {
  switch (action.type) {

    // Generic setter — { type: 'SET', payload: { key: value, ... } }
    case 'SET':
      return { ...state, ...action.payload }

    // Reset the simulation flow back to step 0
    case 'SIM_RESET':
      return {
        ...state,
        mode: null,
        simModeValidationLoading: false,
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
        spScheduleLoading: false,
        spScheduleLoadedDay: '',
        showComp: false,
      }

    // Show toast — auto-cleared from component
    case 'TOAST':
      return {
        ...state,
        toast: {
          msg: action.payload.msg,
          type: action.payload.type || 'error',
          id: Date.now(),
        },
      }

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
