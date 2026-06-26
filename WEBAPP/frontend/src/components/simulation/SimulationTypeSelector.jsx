import './SimulationTypeSelector.css'

const TYPES = [
  { value: '',             label: 'Tutti' },
  { value: 'sostituzione', label: '🔄 Sostituzione' },
  { value: 'spostamento',  label: '🕐 Spostamento' },
]

/**
 * Toggle-pill simulation type selector (mirrors ChannelSelector pattern).
 * Selecting the already-active value clears the filter (returns to 'Tutti').
 *
 * @param {Object}   props
 * @param {string}  [props.label]    - Label shown above the pills (default: 'Tipo di Simulazione')
 * @param {string}   props.selected  - '' | 'sostituzione' | 'spostamento'
 * @param {function} props.onChange  - Called with the new value string
 */
export default function SimulationTypeSelector({ label = 'Tipo di Simulazione', selected, onChange }) {
  return (
    <div className="sim-ts">
      {label && <span className="sim-ts__lbl">{label}</span>}
      <div className="sim-ts__grp">
        {TYPES.map(t => (
          <button
            key={t.value}
            className={`sim-ts__pill${selected === t.value ? ' on' : ''}`}
            onClick={() => onChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
