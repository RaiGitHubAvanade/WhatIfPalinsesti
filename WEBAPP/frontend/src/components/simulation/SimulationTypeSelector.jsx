import { SIMULATION_TYPES as TYPES } from '../../utils/constants'
import './SimulationTypeSelector.css'
import '../shared/FilterField.css'

/**
 * Toggle-pill simulation type selector (uses the shared .filter-pill system).
 * Selecting the already-active value clears the filter (returns to 'Tutti').
 *
 * @param {Object}   props
 * @param {string}  [props.label]    - Label shown above the pills (default: 'Tipo di Simulazione')
 * @param {string}   props.selected  - '' | 'sostituzione' | 'spostamento'
 * @param {function} props.onChange  - Called with the new value string
 */
export default function SimulationTypeSelector({ label = 'Tipo di Simulazione', selected, onChange }) {
  return (
    <div className="filter-field">
      {label && <span className="filter-field__label">{label}</span>}
      <div className="filter-pill-group">
        {TYPES.map(t => (
          <button
            key={t.value}
            className={`filter-pill${selected === t.value ? ' on' : ''}`}
            onClick={() => onChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
