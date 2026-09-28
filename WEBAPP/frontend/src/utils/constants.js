/** Abbreviazioni italiane dei giorni della settimana (indice 0 = domenica) */
export const DAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

/** Delay (ms) before retrying a failed network request (e.g. transient DNS failure) */
export const NETWORK_RETRY_DELAY_MS = 1500

/** CSS class per canale RAI per i program rows */
export const CH_CLS = { 'Rai 1': 'prow-r1', 'Rai 2': 'prow-r2', 'Rai 3': 'prow-r3' }

/** Max number of Simulations for a single Scenario */
export const MAX_SIMULATIONS_PER_SCENARIO = 15

/** Simulations shown per page in ScenCard carousel; carousel appears when items exceed this value */
export const SCENARIO_CARD_SIMULATIONS_PER_PAGE = 3

/** Max number of shap values displayed in the chart, in Simulation Detail pages */
export const MAX_SHAP_VALUES_DISPLAYED = 5

/** "Durata Simile" filter (Step 3 Sostituzione): +/- minutes tolerance vs the target program duration */
export const CANDIDATES_DURATION_OFFSET_MINUTES = 15

/** Numero di programmi per pagina nelle liste di selezione */
export const PROGRAM_PAGE_SIZE_OPTIONS = [8, 12, 16, 20, 24]
export const DEFAULT_PROGRAM_PAGE_SIZE = 8

/** Numero di scenari visualizzati per pagina nella pagina Scenari */
export const SCENARIOS_PAGE_SIZE_OPTIONS = [3, 6, 9, 12, 15]
export const DEFAULT_SCENARIOS_PAGE_SIZE = 3

/** Canali RAI disponibili */
export const CHANNELS = ['Rai 1', 'Rai 2', 'Rai 3']

/** Ore del giorno broadcast, in ordine: 06 → 23 → 00 → 01 → 02 */
export const BROADCAST_HOURS = [
  ...Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, '0')),
  '00', '01', '02',
]

/** Minuti selezionabili (00–59) per il time picker con granularità di 1 minuto */
export const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

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