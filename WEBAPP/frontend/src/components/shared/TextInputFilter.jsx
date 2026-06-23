import './TextInputFilter.css'

/**
 * Labelled text-input filter with clear button.
 * Mirrors ChannelSelector / DaySelector patterns.
 *
 * @param {Object}   props
 * @param {string}  [props.label]       - Uppercase label above the input (omit to hide)
 * @param {string}   props.value        - Controlled value
 * @param {function} props.onChange     - Called with the new string value
 * @param {string}  [props.placeholder] - Input placeholder
 * @param {string}  [props.className]   - Extra class on the root (e.g. 'psel-fg-search')
 */
export default function TextInputFilter({ label, value, onChange, placeholder = '', className = '' }) {
  return (
    <div className={`txt-filter${className ? ' ' + className : ''}`}>
      {label && <span className="txt-filter__lbl">{label}</span>}
      <div className="txt-filter__wrap">
        <input
          type="text"
          className="txt-filter__inp"
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          autoComplete="off"
        />
        {value && (
          <button className="txt-filter__clear" onClick={() => onChange('')}>×</button>
        )}
      </div>
    </div>
  )
}
