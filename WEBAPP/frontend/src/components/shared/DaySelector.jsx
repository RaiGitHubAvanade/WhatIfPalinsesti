import './DaySelector.css'
import './FilterField.css'

/**
 * Single-day date picker, shared across Simulation and WeeklyProgramming.
 *
 * @param {Object} props
 * @param {string}   [props.label]   - Field label (default "Data")
 * @param {string}    props.value    - ISO date string (YYYY-MM-DD) or ''
 * @param {function}  props.onChange - Called with new ISO date string
 * @param {string}   [props.maxDate] - Optional max attribute (YYYY-MM-DD)
 * @param {string}   [props.minDate] - Optional min attribute (YYYY-MM-DD)
 */
export default function DaySelector({ label = 'Data', value, onChange, maxDate, minDate }) {
  return (
    <div className="filter-field">
      <span className="filter-field__label">{label}</span>
      <input
        type="date"
        className="filter-control"
        value={value || ''}
        min={minDate}
        max={maxDate}
        onClick={e => e.target.showPicker?.()}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
