import './TimeSelector.css'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00')

/**
 * HH:MM–HH:MM time-range selector for the simulation filter bar.
 *
 * @param {Object}   props
 * @param {string}   [props.fromTime]   - Selected start hour ('HH:00') or ''
 * @param {string}   [props.toTime]     - Selected end hour ('HH:00') or ''
 * @param {function}  props.onFromChange
 * @param {function}  props.onToChange
 * @param {boolean}  [props.hasClear]   - Show × clear button
 * @param {function} [props.onClear]
 */
export default function TimeSelector({
  fromTime = '',
  toTime = '',
  onFromChange,
  onToChange,
  hasClear = false,
  onClear,
}) {
  return (
    <div className="time-sel">
      <span className="time-sel__lbl">Orario</span>
      <div className="time-sel__row">
        <span className="time-sel__unit">Da</span>
        <select
          className="time-sel__select"
          value={fromTime}
          onChange={e => onFromChange(e.target.value)}
        >
          <option value="">--</option>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="time-sel__unit">A</span>
        <select
          className="time-sel__select"
          value={toTime}
          onChange={e => onToChange(e.target.value)}
        >
          <option value="">--</option>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        {hasClear && onClear && (
          <button className="time-sel__clear" onClick={onClear} type="button">×</button>
        )}
      </div>
    </div>
  )
}
