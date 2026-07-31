/** Abbreviazioni italiane dei giorni della settimana (indice 0 = domenica) */
export const DAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

/** Delay (ms) before retrying a failed network request (e.g. transient DNS failure) */
export const NETWORK_RETRY_DELAY_MS = 1500

/** CSS class per canale RAI per i program rows */
export const CH_CLS = { 'Rai 1': 'prow-r1', 'Rai 2': 'prow-r2', 'Rai 3': 'prow-r3' }

/** Max number of Simulations for a single Scenario */
export const MAX_SIMULATIONS_PER_SCENARIO = 3

/** Numero di programmi per pagina nelle liste di selezione */
export const PROGRAM_PAGE_SIZE_OPTIONS = [8, 12, 16, 20, 24]
export const DEFAULT_PROGRAM_PAGE_SIZE = 8

/** Numero di scenari visualizzati per pagina nella pagina Scenari */
export const SCENARIOS_PAGE_SIZE_OPTIONS = [3, 6, 9, 12, 15]
export const DEFAULT_SCENARIOS_PAGE_SIZE = 3

/** Canali RAI disponibili */
export const CHANNELS = ['Rai 1', 'Rai 2', 'Rai 3']

/** Slot orari del giorno broadcast: 06:00, 06:30 … 23:30, 00:00, 00:30, 01:00, 01:30, 02:00 */
export const TIME_SLOTS = [
  ...Array.from({ length: 36 }, (_, i) => {
    const h = Math.floor(i / 2) + 6
    const m = i % 2 === 0 ? '00' : '30'
    return `${String(h).padStart(2, '0')}:${m}`
  }),
  '00:00', '00:30', '01:00', '01:30', '02:00',
]

/** Tipi di simulazione disponibili */
export const SIMULATION_TYPES = [
  { value: '',             label: 'Tutti' },
  { value: 'sostituzione', label: 'Sostituzione' },
  { value: 'spostamento',  label: 'Spostamento' },
]

/** Intervalli di polling per lo stato delle simulazioni */
export const SCENARIOS_POLLING_BASE_MS = 3000
export const SCENARIOS_POLLING_MAX_MS = 30000

/** Cache lifetime for the StepProgram target-programs list (ms) */
export const TARGET_PROGRAMS_CACHE_TTL_MS = 60 * 60 * 1000