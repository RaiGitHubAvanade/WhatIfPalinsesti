import './FilterCheckbox.css'
import './FilterField.css'

/**
 * Compact labeled checkbox used in filter bars.
 */
export default function FilterCheckbox({
  label,
  checked,
  onChange,
  ariaLabel,
  title = '',
  className = '',
  disabled = false,
}) {
  return (
    <div className={`filter-field${className ? ' ' + className : ''}`} title={title}>
      <span className="filter-field__label">{label}</span>
      <label className="filter-checkbox" aria-label={ariaLabel || label}>
        <input
          type="checkbox"
          checked={!!checked}
          onChange={e => onChange?.(e.target.checked)}
          disabled={disabled}
        />
      </label>
    </div>
  )
}
